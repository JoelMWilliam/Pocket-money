import { describe, it, expect } from 'vitest'

const mod = await vi.importActual('../src/lib/demoData')
const DEMO_ACCOUNTS = mod.DEMO_ACCOUNTS
const DEMO_CATEGORIES = mod.DEMO_CATEGORIES
const DEMO_TRANSACTIONS = mod.DEMO_TRANSACTIONS
const DEMO_BUDGETS = mod.DEMO_BUDGETS
const DEMO_GOALS = mod.DEMO_GOALS
const DEMO_DEBTS = mod.DEMO_DEBTS
const DEMO_RECURRING = mod.DEMO_RECURRING
const DEMO_INVESTMENTS = mod.DEMO_INVESTMENTS
const DEMO_LOANS = mod.DEMO_LOANS
const DEMO_SETTINGS = mod.DEMO_SETTINGS

describe('DEMO_ACCOUNTS', () => {
  it('has 4 entries', () => {
    expect(DEMO_ACCOUNTS).toHaveLength(4)
  })

  it.each(DEMO_ACCOUNTS)('has required fields on $name', (account) => {
    expect(account).toHaveProperty('id')
    expect(account).toHaveProperty('name')
    expect(account).toHaveProperty('type')
    expect(account).toHaveProperty('balance')
  })

  it('has valid account types', () => {
    const valid = ['bank', 'cash', 'wallet']
    for (const a of DEMO_ACCOUNTS) {
      expect(valid).toContain(a.type)
    }
  })
})

describe('DEMO_CATEGORIES', () => {
  it('has 10 entries', () => {
    expect(DEMO_CATEGORIES).toHaveLength(10)
  })

  it.each(DEMO_CATEGORIES)('has required fields on $name', (cat) => {
    expect(cat).toHaveProperty('id')
    expect(cat).toHaveProperty('name')
    expect(cat).toHaveProperty('type')
    expect(cat).toHaveProperty('icon')
    expect(cat).toHaveProperty('color')
  })

  it('has valid category types', () => {
    const valid = ['expense', 'income', 'transfer']
    for (const c of DEMO_CATEGORIES) {
      expect(valid).toContain(c.type)
    }
  })
})

describe('DEMO_TRANSACTIONS', () => {
  it('has 24 entries', () => {
    expect(DEMO_TRANSACTIONS).toHaveLength(24)
  })

  it.each(DEMO_TRANSACTIONS)('has required fields on transaction $id', (tx) => {
    expect(tx).toHaveProperty('id')
    expect(tx).toHaveProperty('amount')
    expect(tx).toHaveProperty('type')
    expect(tx).toHaveProperty('date')
  })

  it('has valid transaction types', () => {
    const valid = ['expense', 'income', 'transfer']
    for (const t of DEMO_TRANSACTIONS) {
      expect(valid).toContain(t.type)
    }
  })

  it('has positive amounts', () => {
    for (const t of DEMO_TRANSACTIONS) {
      expect(t.amount).toBeGreaterThan(0)
    }
  })

  it('references valid account IDs', () => {
    const ids = DEMO_ACCOUNTS.map((a) => a.id)
    for (const t of DEMO_TRANSACTIONS) {
      expect(ids).toContain(t.accountId)
    }
  })

  it('references valid category IDs', () => {
    const ids = DEMO_CATEGORIES.map((c) => c.id)
    for (const t of DEMO_TRANSACTIONS) {
      expect(ids).toContain(t.categoryId)
    }
  })
})

describe('DEMO_BUDGETS', () => {
  it('has 3 entries', () => {
    expect(DEMO_BUDGETS).toHaveLength(3)
  })

  it.each(DEMO_BUDGETS)('has required fields', (budget) => {
    expect(budget).toHaveProperty('id')
    expect(budget).toHaveProperty('categoryId')
    expect(budget).toHaveProperty('amount')
    expect(budget).toHaveProperty('period')
  })
})

describe('DEMO_GOALS', () => {
  it('has 2 entries', () => {
    expect(DEMO_GOALS).toHaveLength(2)
  })
})

describe('DEMO_DEBTS', () => {
  it('has 3 entries', () => {
    expect(DEMO_DEBTS).toHaveLength(3)
  })
})

describe('DEMO_RECURRING', () => {
  it('has 4 entries', () => {
    expect(DEMO_RECURRING).toHaveLength(4)
  })
})

describe('DEMO_INVESTMENTS', () => {
  it('has 2 entries', () => {
    expect(DEMO_INVESTMENTS).toHaveLength(2)
  })
})

describe('DEMO_LOANS', () => {
  it('has 1 entry', () => {
    expect(DEMO_LOANS).toHaveLength(1)
  })
})

describe('DEMO_SETTINGS', () => {
  it('has updatedAt timestamp', () => {
    expect(DEMO_SETTINGS).toHaveProperty('updatedAt')
    expect(typeof DEMO_SETTINGS.updatedAt).toBe('number')
  })
})
