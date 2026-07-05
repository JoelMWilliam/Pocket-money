const DB_NAME = 'pocket-money-db'
const DB_VERSION = 1
const STORE_NAME = 'receipts'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export async function saveReceipt(id, dataUrl) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put({ id, dataUrl, updatedAt: Date.now() })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getReceipt(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result?.dataUrl || null)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteReceipt(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function migrateReceiptsToIndexedDB(transactions) {
  for (const t of transactions) {
    if (t.receipt && typeof t.receipt === 'string' && t.receipt.startsWith('data:')) {
      try {
        await saveReceipt(t.id, t.receipt)
        t.receipt = `indexeddb://${t.id}`
      } catch (err) {
        console.error('Failed to migrate receipt', t.id, err)
      }
    }
  }
}

export function isIndexedDBReceipt(value) {
  return typeof value === 'string' && value.startsWith('indexeddb://')
}

export function getReceiptIdFromReference(value) {
  return value.replace('indexeddb://', '')
}

export async function inlineReceipts(data) {
  const cloned = JSON.parse(JSON.stringify(data))
  const txs = cloned.transactions || []
  for (const t of txs) {
    if (isIndexedDBReceipt(t.receipt)) {
      const id = getReceiptIdFromReference(t.receipt)
      const dataUrl = await getReceipt(id)
      if (dataUrl) {
        t.receipt = dataUrl
      } else {
        delete t.receipt
      }
    }
  }
  return cloned
}

export async function extractReceipts(data) {
  const cloned = JSON.parse(JSON.stringify(data))
  const txs = cloned.transactions || []
  for (const t of txs) {
    if (typeof t.receipt === 'string' && t.receipt.startsWith('data:')) {
      const id = t.id
      try {
        await saveReceipt(id, t.receipt)
        t.receipt = `indexeddb://${id}`
      } catch (err) {
        console.error('Failed to extract receipt', t.id, err)
        delete t.receipt
      }
    }
  }
  return cloned
}

export async function deleteTransactionReceipts(transaction) {
  if (!transaction) return
  if (isIndexedDBReceipt(transaction.receipt)) {
    try {
      await deleteReceipt(getReceiptIdFromReference(transaction.receipt))
    } catch (err) {
      console.error('Failed to delete receipt', err)
    }
  }
}

export async function copyReceipt(sourceRef, targetId) {
  if (!isIndexedDBReceipt(sourceRef)) return sourceRef
  try {
    const dataUrl = await getReceipt(getReceiptIdFromReference(sourceRef))
    if (!dataUrl) return null
    await saveReceipt(targetId, dataUrl)
    return `indexeddb://${targetId}`
  } catch (err) {
    console.error('Failed to copy receipt', err)
    return null
  }
}
