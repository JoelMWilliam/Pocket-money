import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

const dbStore = {}

function createAutoRequest(result) {
  const handlers = { onsuccess: null, onerror: null }
  const req = {
    get onsuccess() { return handlers.onsuccess },
    set onsuccess(fn) {
      handlers.onsuccess = fn
      if (fn) Promise.resolve().then(() => fn({ target: { result: req.result, error: null } }))
    },
    get onerror() { return handlers.onerror },
    set onerror(fn) { handlers.onerror = fn },
    result,
    error: null
  }
  return req
}

function mockIndexedDB() {
  let openHandlers = { onsuccess: null, onerror: null, onupgradeneeded: null }

  globalThis.indexedDB = {
    open: vi.fn((dbName, version) => {
      openHandlers = { onsuccess: null, onerror: null, onupgradeneeded: null }
      const db = {
        objectStoreNames: { contains: vi.fn(() => true) },
        createObjectStore: vi.fn((name, opts) => {
          dbStore[name] = dbStore[name] || {}
          return { keyPath: opts?.keyPath || 'id' }
        }),
        transaction: vi.fn((storeName, mode) => ({
          objectStore: vi.fn(() => ({
            put: vi.fn((item) => {
              dbStore[storeName] = dbStore[storeName] || {}
              dbStore[storeName][item.id] = item
              return createAutoRequest(undefined)
            }),
            get: vi.fn((id) => createAutoRequest(dbStore[storeName]?.[id] || null)),
            delete: vi.fn((id) => {
              delete dbStore[storeName]?.[id]
              return createAutoRequest(undefined)
            }),
            clear: vi.fn(() => {
              dbStore[storeName] = {}
              return createAutoRequest(undefined)
            })
          })),
          oncomplete: null
        }))
      }
      const req = {
        get onsuccess() { return openHandlers.onsuccess },
        set onsuccess(fn) {
          openHandlers.onsuccess = fn
          if (fn) Promise.resolve().then(() => fn({ target: { result: db, error: null } }))
        },
        get onerror() { return openHandlers.onerror },
        set onerror(fn) { openHandlers.onerror = fn },
        get onupgradeneeded() { return openHandlers.onupgradeneeded },
        set onupgradeneeded(fn) {
          openHandlers.onupgradeneeded = fn
          if (fn && !dbStore._initialized) {
            dbStore._initialized = true
            Promise.resolve().then(() => fn({ target: { result: db } }))
          }
        },
        result: db,
        error: null
      }
      return req
    }),
    deleteDatabase: vi.fn(() => {
      Object.keys(dbStore).forEach((k) => delete dbStore[k])
      return createAutoRequest(undefined)
    })
  }
}

beforeEach(() => {
  Object.keys(dbStore).forEach((k) => delete dbStore[k])
  mockIndexedDB()
})

afterAll(() => {
  delete globalThis.indexedDB
})

import {
  saveReceipt,
  getReceipt,
  deleteReceipt,
  migrateReceiptsToIndexedDB,
  isIndexedDBReceipt,
  getReceiptIdFromReference,
  inlineReceipts,
  extractReceipts,
  deleteTransactionReceipts,
  copyReceipt
} from '../src/lib/receipts'

describe('receipts CRUD', () => {
  it('saveReceipt stores a data URL by id', async () => {
    await saveReceipt('tx-1', 'data:image/png;base64,abc123')
    const result = await getReceipt('tx-1')
    expect(result).toBe('data:image/png;base64,abc123')
  })

  it('getReceipt returns null for missing id', async () => {
    const result = await getReceipt('nonexistent')
    expect(result).toBeNull()
  })

  it('deleteReceipt removes a stored receipt', async () => {
    await saveReceipt('tx-2', 'data:image/jpeg;base64,xyz')
    await deleteReceipt('tx-2')
    const result = await getReceipt('tx-2')
    expect(result).toBeNull()
  })

  it('saveReceipt overwrites existing receipt', async () => {
    await saveReceipt('tx-1', 'data:image/png;base64,first')
    await saveReceipt('tx-1', 'data:image/png;base64,second')
    const result = await getReceipt('tx-1')
    expect(result).toBe('data:image/png;base64,second')
  })
})

describe('receipts helpers', () => {
  it('isIndexedDBReceipt detects indexeddb:// prefix', () => {
    expect(isIndexedDBReceipt('indexeddb://tx-1')).toBe(true)
    expect(isIndexedDBReceipt('data:image/png;base64,abc')).toBe(false)
    expect(isIndexedDBReceipt(null)).toBe(false)
    expect(isIndexedDBReceipt(undefined)).toBe(false)
  })

  it('getReceiptIdFromReference strips prefix', () => {
    expect(getReceiptIdFromReference('indexeddb://tx-42')).toBe('tx-42')
  })
})

describe('migrateReceiptsToIndexedDB', () => {
  it('migrates transactions with data: receipts', async () => {
    const transactions = [
      { id: 'tx-1', receipt: 'data:image/png;base64,abc' },
      { id: 'tx-2', receipt: 'data:image/jpeg;base64,def' },
      { id: 'tx-3' }
    ]
    await migrateReceiptsToIndexedDB(transactions)
    expect(transactions[0].receipt).toBe('indexeddb://tx-1')
    expect(transactions[1].receipt).toBe('indexeddb://tx-2')
    expect(transactions[2].receipt).toBeUndefined()
    expect(await getReceipt('tx-1')).toBe('data:image/png;base64,abc')
    expect(await getReceipt('tx-2')).toBe('data:image/jpeg;base64,def')
  })
})

describe('inlineReceipts', () => {
  it('inlines indexeddb receipts back to data URLs', async () => {
    await saveReceipt('tx-1', 'data:image/png;base64,inline-me')
    const data = {
      transactions: [
        { id: 'tx-1', receipt: 'indexeddb://tx-1', amount: 100 }
      ]
    }
    const result = await inlineReceipts(data)
    expect(result.transactions[0].receipt).toBe('data:image/png;base64,inline-me')
  })

  it('removes receipt reference if not found in indexeddb', async () => {
    const data = {
      transactions: [
        { id: 'missing', receipt: 'indexeddb://missing' }
      ]
    }
    const result = await inlineReceipts(data)
    expect(result.transactions[0].receipt).toBeUndefined()
  })

  it('preserves non-indexeddb receipts', async () => {
    const data = {
      transactions: [
        { id: 'tx-1', receipt: 'data:image/png;base64,keep' }
      ]
    }
    const result = await inlineReceipts(data)
    expect(result.transactions[0].receipt).toBe('data:image/png;base64,keep')
  })
})

describe('extractReceipts', () => {
  it('extracts data: receipts into indexeddb and replaces reference', async () => {
    const data = {
      transactions: [
        { id: 'tx-1', receipt: 'data:image/png;base64,extracted' }
      ]
    }
    const result = await extractReceipts(data)
    expect(result.transactions[0].receipt).toBe('indexeddb://tx-1')
    expect(await getReceipt('tx-1')).toBe('data:image/png;base64,extracted')
  })

  it('removes external indexeddb references', async () => {
    const data = {
      transactions: [
        { id: 'tx-1', receipt: 'indexeddb://external-device-id' }
      ]
    }
    const result = await extractReceipts(data)
    expect(result.transactions[0].receipt).toBeUndefined()
  })
})

describe('deleteTransactionReceipts', () => {
  it('deletes receipt for a transaction with indexeddb ref', async () => {
    await saveReceipt('tx-1', 'data:image/png;base64,delete-me')
    await deleteTransactionReceipts({ receipt: 'indexeddb://tx-1' })
    expect(await getReceipt('tx-1')).toBeNull()
  })

  it('does nothing for non-indexeddb receipts', async () => {
    await saveReceipt('tx-2', 'data:image/png;base64,keep')
    await deleteTransactionReceipts({ receipt: 'data:image/png;base64,keep' })
    expect(await getReceipt('tx-2')).toBe('data:image/png;base64,keep')
  })

  it('handles null/undefined transaction', async () => {
    await deleteTransactionReceipts(null)
    await deleteTransactionReceipts(undefined)
  })
})

describe('copyReceipt', () => {
  it('copies a receipt from one id to another', async () => {
    await saveReceipt('source', 'data:image/png;base64,copied')
    const result = await copyReceipt('indexeddb://source', 'target')
    expect(result).toBe('indexeddb://target')
    expect(await getReceipt('target')).toBe('data:image/png;base64,copied')
  })

  it('returns null if source not found', async () => {
    const result = await copyReceipt('indexeddb://nonexistent', 'target')
    expect(result).toBeNull()
  })

  it('returns sourceRef unchanged for non-indexeddb', async () => {
    const result = await copyReceipt('data:image/png;base64,nope', 'target')
    expect(result).toBe('data:image/png;base64,nope')
  })
})
