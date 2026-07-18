import { generateId } from './utils'

const today = new Date()
const daysAgo = (n) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const DEMO_ACCOUNTS = [
  {
    id: generateId(),
    name: 'Commercial Bank',
    type: 'bank',
    initialBalance: 50000,
    balance: 84520.75,
    currency: 'LKR',
    color: '#0A84FF',
    icon: 'Building2',
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'Sampath Bank',
    type: 'bank',
    initialBalance: 10000,
    balance: 12350.0,
    currency: 'LKR',
    color: '#FF9500',
    icon: 'Building2',
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'Cash',
    type: 'cash',
    initialBalance: 2000,
    balance: 4200.0,
    currency: 'LKR',
    color: '#30D158',
    icon: 'Banknote',
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'FriMi',
    type: 'wallet',
    initialBalance: 500,
    balance: 1850.0,
    currency: 'LKR',
    color: '#BF5AF2',
    icon: 'Wallet',
    updatedAt: Date.now()
  }
]

export const DEMO_CATEGORIES = [
  { id: 'cat-food', name: 'Food & Dining', icon: 'Utensils', color: '#FF9500', type: 'expense', updatedAt: Date.now() },
  { id: 'cat-transport', name: 'Transport', icon: 'Bus', color: '#0A84FF', type: 'expense', updatedAt: Date.now() },
  { id: 'cat-bills', name: 'Bills & Utilities', icon: 'Receipt', color: '#FF375F', type: 'expense', updatedAt: Date.now() },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'Film', color: '#BF5AF2', type: 'expense', updatedAt: Date.now() },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#FFCC00', type: 'expense', updatedAt: Date.now() },
  { id: 'cat-health', name: 'Health', icon: 'HeartPulse', color: '#30D158', type: 'expense', updatedAt: Date.now() },
  { id: 'cat-salary', name: 'Salary', icon: 'Banknote', color: '#30D158', type: 'income', updatedAt: Date.now() },
  { id: 'cat-gifts', name: 'Gifts', icon: 'Gift', color: '#64D2FF', type: 'income', updatedAt: Date.now() },
  { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowLeftRight', color: '#8E8E93', type: 'transfer', updatedAt: Date.now() },
  { id: 'cat-other', name: 'Other', icon: 'HelpCircle', color: '#8E8E93', type: 'expense', updatedAt: Date.now() }
]

let txTimestamp = Date.now() - 1000 * 60 * 60 * 24 * 35
function nextTxStamp() {
  txTimestamp += 1000 * 60
  return txTimestamp
}

export const DEMO_TRANSACTIONS = [
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 185000.0, type: 'income', categoryId: 'cat-salary', date: daysAgo(2), note: 'Monthly salary', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 2450.0, type: 'expense', categoryId: 'cat-food', date: daysAgo(1), note: 'Keells groceries', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[3].id, amount: 350.0, type: 'expense', categoryId: 'cat-transport', date: daysAgo(1), note: 'PickMe ride', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 4200.0, type: 'expense', categoryId: 'cat-bills', date: daysAgo(3), note: 'Dialog postpaid bill', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 1200.0, type: 'expense', categoryId: 'cat-food', date: daysAgo(3), note: 'Lunch at Paan Paan', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[1].id, amount: 5600.0, type: 'expense', categoryId: 'cat-shopping', date: daysAgo(4), note: 'Clothes at Odel', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[2].id, amount: 800.0, type: 'expense', categoryId: 'cat-transport', date: daysAgo(5), note: 'Three-wheeler', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 15000.0, type: 'transfer', categoryId: 'cat-transfer', date: daysAgo(6), note: 'To savings', transferTo: DEMO_ACCOUNTS[1].id, createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 3200.0, type: 'expense', categoryId: 'cat-entertainment', date: daysAgo(7), note: 'Movie night', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 4500.0, type: 'expense', categoryId: 'cat-bills', date: daysAgo(8), note: 'Electricity bill', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[2].id, amount: 500.0, type: 'expense', categoryId: 'cat-food', date: daysAgo(9), note: 'Kottu', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[3].id, amount: 1200.0, type: 'expense', categoryId: 'cat-health', date: daysAgo(10), note: 'Pharmacy', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 1800.0, type: 'expense', categoryId: 'cat-food', date: daysAgo(11), note: 'Dinner out', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 2500.0, type: 'expense', categoryId: 'cat-transport', date: daysAgo(12), note: 'Petrol', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[1].id, amount: 5000.0, type: 'income', categoryId: 'cat-gifts', date: daysAgo(13), note: 'Birthday gift', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 6700.0, type: 'expense', categoryId: 'cat-shopping', date: daysAgo(14), note: 'Supermarket', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[2].id, amount: 300.0, type: 'expense', categoryId: 'cat-food', date: daysAgo(15), note: 'Tea and short eats', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 9800.0, type: 'expense', categoryId: 'cat-bills', date: daysAgo(16), note: 'Internet bill', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[3].id, amount: 750.0, type: 'expense', categoryId: 'cat-transport', date: daysAgo(17), note: 'Uber', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 2100.0, type: 'expense', categoryId: 'cat-entertainment', date: daysAgo(18), note: 'Game subscription', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 1500.0, type: 'expense', categoryId: 'cat-health', date: daysAgo(19), note: 'Doctor visit', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 3400.0, type: 'expense', categoryId: 'cat-food', date: daysAgo(20), note: 'Grocery run', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 22500.0, type: 'expense', categoryId: 'cat-bills', date: daysAgo(25), note: 'Rent', createdAt: nextTxStamp(), updatedAt: nextTxStamp() },
  { id: generateId(), accountId: DEMO_ACCOUNTS[0].id, amount: 185000.0, type: 'income', categoryId: 'cat-salary', date: daysAgo(32), note: 'Previous month salary', createdAt: nextTxStamp(), updatedAt: nextTxStamp() }
]

export const DEMO_BUDGETS = [
  { id: generateId(), categoryId: 'cat-food', amount: 25000.0, period: 'monthly', updatedAt: Date.now() },
  { id: generateId(), categoryId: 'cat-transport', amount: 8000.0, period: 'monthly', updatedAt: Date.now() },
  { id: generateId(), categoryId: 'cat-entertainment', amount: 5000.0, period: 'monthly', updatedAt: Date.now() }
]

export const DEMO_GOALS = [
  { id: generateId(), name: 'Emergency Fund', target: 200000.0, current: 45000.0, deadline: '2026-12-31', color: '#30D158', updatedAt: Date.now() },
  { id: generateId(), name: 'New Phone', target: 180000.0, current: 35000.0, deadline: '2026-09-30', color: '#0A84FF', updatedAt: Date.now() }
]

export const DEMO_DEBTS = [
  {
    id: generateId(),
    name: 'Credit Card',
    principal: 125000.0,
    balance: 85000.0,
    interestRate: 28.0,
    minimumPayment: 5000.0,
    strategy: 'avalanche',
    color: '#FF375F',
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'Personal Loan',
    principal: 300000.0,
    balance: 220000.0,
    interestRate: 16.0,
    minimumPayment: 12000.0,
    strategy: 'snowball',
    color: '#FF9500',
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'Vehicle Lease',
    principal: 1800000.0,
    balance: 1450000.0,
    interestRate: 12.0,
    minimumPayment: 35000.0,
    strategy: 'avalanche',
    color: '#BF5AF2',
    updatedAt: Date.now()
  }
]

export const DEMO_RECURRING = [
  {
    id: generateId(),
    name: 'Rent',
    amount: 22500.0,
    type: 'expense',
    categoryId: 'cat-bills',
    accountId: '',
    frequency: 'monthly',
    startDate: '2026-01-01',
    nextDueDate: '2026-08-01',
    reminderDays: 3,
    active: true,
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'Dialog Bill',
    amount: 4200.0,
    type: 'expense',
    categoryId: 'cat-bills',
    accountId: '',
    frequency: 'monthly',
    startDate: '2026-01-05',
    nextDueDate: '2026-08-05',
    reminderDays: 3,
    active: true,
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'Internet',
    amount: 9800.0,
    type: 'expense',
    categoryId: 'cat-bills',
    accountId: '',
    frequency: 'monthly',
    startDate: '2026-01-10',
    nextDueDate: '2026-08-10',
    reminderDays: 3,
    active: true,
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'Salary',
    amount: 185000.0,
    type: 'income',
    categoryId: 'cat-salary',
    accountId: '',
    frequency: 'monthly',
    startDate: '2026-01-01',
    nextDueDate: '2026-08-01',
    reminderDays: 0,
    active: true,
    updatedAt: Date.now()
  }
]

export const DEMO_INVESTMENTS = [
  {
    id: generateId(),
    name: 'EPF Balance',
    type: 'epf',
    symbol: '',
    units: 1,
    purchasePrice: 0,
    currentPrice: 850000.0,
    currency: 'LKR',
    updatedAt: Date.now()
  },
  {
    id: generateId(),
    name: 'COMB.N0000',
    type: 'stock',
    symbol: 'COMB.N0000',
    units: 250,
    purchasePrice: 75.0,
    currentPrice: 82.5,
    currency: 'LKR',
    updatedAt: Date.now()
  }
]

export const DEMO_LOANS = [
  {
    id: generateId(),
    name: 'Lent to Kasun',
    amount: 15000.0,
    repaid: 5000.0,
    type: 'lent',
    date: daysAgo(20),
    dueDate: '',
    note: 'Lunch money advance',
    updatedAt: Date.now()
  }
]

export const DEMO_SETTINGS = {
  seedColor: '#0A84FF',
  isDark: true,
  currency: 'LKR',
  lastBudgetMonth: null,
  googleDriveBackupEnabled: false,
  googleDriveBackupInterval: 'daily',
  googleDriveBackupLastAt: null,
  googleDriveBackupEmail: null,
  smsAutoImportEnabled: false,
  smsLastImportedAt: null,
  smsImportedIds: [],
  notificationsEnabled: false,
  updatedAt: Date.now()
}
