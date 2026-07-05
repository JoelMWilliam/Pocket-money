import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hashPin, verifyPin, encryptData, decryptData, generateRandomId } from '../lib/crypto'
import {
  DEMO_ACCOUNTS,
  DEMO_CATEGORIES,
  DEMO_TRANSACTIONS,
  DEMO_BUDGETS,
  DEMO_GOALS,
  DEMO_DEBTS,
  DEMO_RECURRING,
  DEMO_INVESTMENTS,
  DEMO_LOANS,
  DEMO_SETTINGS
} from '../lib/demoData'
import { getCloudToken, setCloudToken, getCloudUser, setCloudUser, cloudSync } from '../lib/api'
import { generateId, getCurrentMonth } from '../lib/utils'
import { sanitizeText, sanitizeTags } from '../lib/sanitize'
import { deleteTransactionReceipts, inlineReceipts, extractReceipts, migrateReceiptsToIndexedDB } from '../lib/receipts'
import { canUseBiometrics, registerBiometric, verifyBiometric } from '../lib/biometric'
import { storageGet, storageSet } from '../lib/storage'

const LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes

function mergeById(local = [], remote = [], timestampField = 'createdAt') {
  const map = new Map()
  local.forEach((item) => map.set(item.id, item))
  remote.forEach((item) => {
    const existing = map.get(item.id)
    if (!existing) {
      map.set(item.id, item)
    } else {
      const existingTime = new Date(existing[timestampField] || 0).getTime()
      const remoteTime = new Date(item[timestampField] || 0).getTime()
      map.set(item.id, remoteTime >= existingTime ? item : existing)
    }
  })
  return Array.from(map.values())
}

function getInitialUserData() {
  return {
    settings: DEMO_SETTINGS,
    accounts: DEMO_ACCOUNTS,
    categories: DEMO_CATEGORIES,
    transactions: DEMO_TRANSACTIONS,
    budgets: DEMO_BUDGETS,
    goals: DEMO_GOALS,
    debts: DEMO_DEBTS,
    recurring: DEMO_RECURRING,
    investments: DEMO_INVESTMENTS,
    loans: DEMO_LOANS,
    templates: [],
    rules: []
  }
}

function getEmptyUserData() {
  return {
    settings: { seedColor: '#0A84FF', isDark: true, currency: 'LKR', lastBudgetMonth: null },
    accounts: [],
    categories: [
      { id: 'cat-food', name: 'Food & Dining', icon: 'Utensils', color: '#FF9500', type: 'expense' },
      { id: 'cat-transport', name: 'Transport', icon: 'Bus', color: '#0A84FF', type: 'expense' },
      { id: 'cat-bills', name: 'Bills & Utilities', icon: 'Receipt', color: '#FF375F', type: 'expense' },
      { id: 'cat-entertainment', name: 'Entertainment', icon: 'Film', color: '#BF5AF2', type: 'expense' },
      { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#FFCC00', type: 'expense' },
      { id: 'cat-health', name: 'Health', icon: 'HeartPulse', color: '#30D158', type: 'expense' },
      { id: 'cat-salary', name: 'Salary', icon: 'Banknote', color: '#30D158', type: 'income' },
      { id: 'cat-gifts', name: 'Gifts', icon: 'Gift', color: '#64D2FF', type: 'income' },
      { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowLeftRight', color: '#8E8E93', type: 'transfer' }
    ],
    transactions: [],
    budgets: [],
    goals: [],
    debts: [],
    recurring: [],
    investments: [],
    loans: [],
    templates: [],
    rules: []
  }
}

function withPersist(get, fn) {
  return async (...args) => {
    const result = await fn(...args)
    await get().persistUserData()
    return result
  }
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth state
      auth: {
        currentUser: null,
        isLocked: false,
        lockAt: null,
        users: {}
      },
      usersData: {},

      // Active user data (mirrors current user's data)
      ...getEmptyUserData(),

      // === Auth Actions ===
      createUser: async (username, pin, options = {}) => {
        const pinHash = await hashPin(pin)
        const userData = options.useDemo ? getInitialUserData() : getEmptyUserData()
        await migrateReceiptsToIndexedDB(userData.transactions || [])

        set((state) => ({
          auth: {
            ...state.auth,
            currentUser: username,
            isLocked: false,
            users: {
              ...state.auth.users,
              [username]: {
                pinHash,
                biometricEnabled: false,
                encryptionEnabled: false,
                createdAt: Date.now()
              }
            }
          },
          usersData: {
            ...state.usersData,
            [username]: userData
          },
          ...userData
        }))

        get().recalculateBalances()
        get().rolloverBudgets()
        await get().persistUserData()
      },

      login: async (username, pin) => {
        const user = get().auth.users[username]
        if (!user) throw new Error('User not found')
        const valid = await verifyPin(pin, user.pinHash)
        if (!valid) throw new Error('Invalid PIN')

        await get().loadUserData(username)
        const userData = get().usersData[username] || getEmptyUserData()
        await migrateReceiptsToIndexedDB(userData.transactions || [])
        set((state) => ({
          auth: {
            ...state.auth,
            currentUser: username,
            isLocked: false,
            lockAt: null
          },
          ...userData
        }))
        get().recalculateBalances()
        get().rolloverBudgets()
      },

      logout: () => {
        get().saveCurrentUserData()
        set((state) => ({
          auth: { ...state.auth, currentUser: null, isLocked: false, lockAt: null },
          ...getEmptyUserData()
        }))
      },

      lock: () => {
        get().saveCurrentUserData()
        set((state) => ({
          auth: { ...state.auth, isLocked: true, lockAt: Date.now() }
        }))
      },

      unlock: async (pin, options = {}) => {
        const { auth } = get()
        const user = auth.users[auth.currentUser]
        if (!user) throw new Error('No active user')

        if (options.biometric && user.biometricEnabled) {
          try {
            await verifyBiometric(user.biometricCredentialId)
            set((state) => ({
              auth: { ...state.auth, isLocked: false, lockAt: null }
            }))
            return
          } catch (err) {
            throw new Error('Biometric verification failed')
          }
        }

        const valid = await verifyPin(pin, user.pinHash)
        if (!valid) throw new Error('Invalid PIN')

        set((state) => ({
          auth: { ...state.auth, isLocked: false, lockAt: null }
        }))
      },

      enableBiometric: async () => {
        const { auth } = get()
        const username = auth.currentUser
        if (!username) throw new Error('No active user')
        const credentialId = await registerBiometric(username)
        get().updateUserSettings(username, {
          biometricEnabled: true,
          biometricCredentialId: credentialId
        })
      },

      disableBiometric: () => {
        const { auth } = get()
        const username = auth.currentUser
        if (!username) return
        get().updateUserSettings(username, {
          biometricEnabled: false,
          biometricCredentialId: null
        })
      },

      switchUser: async (username) => {
        get().saveCurrentUserData()
        await get().loadUserData(username)
        const userData = get().usersData[username] || getEmptyUserData()
        await migrateReceiptsToIndexedDB(userData.transactions || [])
        set((state) => ({
          auth: { ...state.auth, currentUser: username, isLocked: true },
          ...userData
        }))
      },

      saveCurrentUserData: () => {
        const { auth, usersData, ...currentData } = get()
        if (!auth.currentUser) return
        const cleanData = {
          settings: currentData.settings,
          accounts: currentData.accounts,
          categories: currentData.categories,
          transactions: currentData.transactions,
          budgets: currentData.budgets,
          goals: currentData.goals,
          debts: currentData.debts,
          recurring: currentData.recurring,
          investments: currentData.investments,
          loans: currentData.loans,
          templates: currentData.templates,
          rules: currentData.rules
        }
        set((state) => ({
          usersData: {
            ...state.usersData,
            [auth.currentUser]: cleanData
          }
        }))
      },

      persistUserData: async () => {
        get().saveCurrentUserData()
        const { auth, usersData } = get()
        if (!auth.currentUser) return
        await storageSet(`userdata-${auth.currentUser}`, usersData[auth.currentUser])
      },

      loadUserData: async (username) => {
        const data = await storageGet(`userdata-${username}`, null)
        if (data) {
          set((state) => ({
            usersData: { ...state.usersData, [username]: data }
          }))
        }
      },

      updateUserSettings: (username, patch) => {
        set((state) => ({
          auth: {
            ...state.auth,
            users: {
              ...state.auth.users,
              [username]: { ...state.auth.users[username], ...patch }
            }
          }
        }))
        get().persistUserData()
      },

      deleteUser: (username) => {
        set((state) => {
          const { [username]: _, ...remainingUsers } = state.auth.users
          const { [username]: __, ...remainingData } = state.usersData
          return {
            auth: {
              ...state.auth,
              users: remainingUsers,
              currentUser: state.auth.currentUser === username ? null : state.auth.currentUser
            },
            usersData: remainingData
          }
        })
        storageRemove(`userdata-${username}`)
        get().persistUserData()
      },

      // Cloud sync state
      cloudUser: getCloudUser(),
      cloudToken: getCloudToken(),
      lastSyncAt: null,
      syncStatus: 'idle', // idle | syncing | error | conflict

      setCloudCredentials: (username, token) => {
        setCloudToken(token)
        setCloudUser(username)
        set({ cloudUser: username, cloudToken: token })
      },

      clearCloudCredentials: () => {
        setCloudToken(null)
        setCloudUser(null)
        set({ cloudUser: null, cloudToken: null, lastSyncAt: null, syncStatus: 'idle' })
      },

      syncToCloud: async () => {
        const state = get()
        if (!state.cloudToken) return
        set({ syncStatus: 'syncing' })
        try {
          const data = {
            settings: state.settings,
            accounts: state.accounts,
            categories: state.categories,
            transactions: state.transactions,
            budgets: state.budgets,
            goals: state.goals,
            debts: state.debts,
            recurring: state.recurring,
            investments: state.investments,
            loans: state.loans,
            templates: state.templates,
            rules: state.rules
          }
          const withReceipts = await inlineReceipts(data)
          await cloudSync.put(withReceipts, Date.now(), 'web')
          set({ lastSyncAt: new Date().toISOString(), syncStatus: 'idle' })
        } catch (err) {
          set({ syncStatus: 'error' })
          throw err
        }
      },

      syncFromCloud: async () => {
        const state = get()
        if (!state.cloudToken) return
        set({ syncStatus: 'syncing' })
        try {
          const result = await cloudSync.get()
          if (result.exists && result.payload?.data) {
            const cloud = result.payload.data
            const merged = {
              settings: { ...state.settings, ...cloud.settings },
              accounts: mergeById(state.accounts, cloud.accounts),
              categories: mergeById(state.categories, cloud.categories),
              transactions: mergeById(state.transactions, cloud.transactions, 'createdAt'),
              budgets: mergeById(state.budgets, cloud.budgets),
              goals: mergeById(state.goals, cloud.goals),
              debts: mergeById(state.debts, cloud.debts),
              recurring: mergeById(state.recurring, cloud.recurring),
              investments: mergeById(state.investments, cloud.investments),
              loans: mergeById(state.loans, cloud.loans),
              templates: mergeById(state.templates, cloud.templates),
              rules: mergeById(state.rules, cloud.rules)
            }
            const withRefs = await extractReceipts(merged)
            get().replaceState(withRefs)
            get().recalculateBalances()
            get().rolloverBudgets()
            get().saveCurrentUserData()
            await get().persistUserData()
          }
          set({ lastSyncAt: new Date().toISOString(), syncStatus: 'idle' })
        } catch (err) {
          set({ syncStatus: 'error' })
          throw err
        }
      },

      // === Settings ===
      updateSettings: (patch) => {
        set((state) => ({ settings: { ...state.settings, ...patch } }))
        get().persistUserData()
      },

      // === Accounts ===
      addAccount: (account) => {
        const clean = { ...account, name: sanitizeText(account.name, 100) }
        const initialBalance = Number(clean.initialBalance) || Number(clean.balance) || 0
        set((state) => ({
          accounts: [
            ...state.accounts,
            { ...clean, id: generateId(), initialBalance, balance: initialBalance }
          ]
        }))
        get().recalculateBalances()
        get().persistUserData()
      },
      updateAccount: (id, patch) => {
        set((state) => ({
          accounts: state.accounts.map((a) => {
            if (a.id !== id) return a
            const updated = { ...a, ...patch }
            if (updated.name !== undefined) updated.name = sanitizeText(updated.name, 100)
            if (updated.initialBalance !== undefined && updated.balance === a.balance) {
              updated.balance = updated.initialBalance
            }
            return updated
          })
        }))
        get().recalculateBalances()
        get().persistUserData()
      },
      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
          transactions: state.transactions.filter((t) => t.accountId !== id && t.transferTo !== id)
        }))
        get().recalculateBalances()
        get().persistUserData()
      },

      // === Categories ===
      addCategory: (category) => {
        const clean = { ...category, name: sanitizeText(category.name, 100) }
        set((state) => ({ categories: [...state.categories, { ...clean, id: generateId() }] }))
        get().persistUserData()
      },
      updateCategory: (id, patch) => {
        set((state) => ({
          categories: state.categories.map((c) => {
            if (c.id !== id) return c
            const updated = { ...c, ...patch }
            if (updated.name !== undefined) updated.name = sanitizeText(updated.name, 100)
            return updated
          })
        }))
        get().persistUserData()
      },
      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          transactions: state.transactions.filter((t) => t.categoryId !== id)
        }))
        get().persistUserData()
      },

      // === Transactions ===
      addTransaction: (transaction) => {
        let newTx = { ...transaction, id: generateId(), createdAt: Date.now() }
        newTx.note = sanitizeText(newTx.note, 500)
        newTx.tags = sanitizeTags(newTx.tags)
        newTx = get().applyRulesToTransaction(newTx)
        if (newTx.type !== 'transfer') newTx.transferTo = undefined
        if (newTx.type !== 'expense') newTx.splits = undefined
        set((state) => {
          const next = { transactions: [newTx, ...state.transactions] }
          return next
        })
        get().recalculateBalances()
        get().persistUserData()
        return newTx
      },
      updateTransaction: (id, patch) => {
        set((state) => {
          const nextTransactions = state.transactions.map((t) => {
            if (t.id !== id) return t
            const updated = { ...t, ...patch }
            if (updated.note !== undefined) updated.note = sanitizeText(updated.note, 500)
            if (updated.tags !== undefined) updated.tags = sanitizeTags(updated.tags)
            if (updated.type !== 'transfer') {
              updated.transferTo = undefined
            }
            if (updated.type !== 'expense') {
              updated.splits = undefined
            }
            return updated
          })
          return { transactions: nextTransactions }
        })
        get().recalculateBalances()
        get().persistUserData()
      },
      deleteTransaction: async (id) => {
        const tx = get().transactions.find((t) => t.id === id)
        if (tx) await deleteTransactionReceipts(tx)
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id)
        }))
        get().recalculateBalances()
        get().persistUserData()
      },
      bulkDeleteTransactions: async (ids) => {
        const toDelete = get().transactions.filter((t) => ids.includes(t.id))
        for (const tx of toDelete) {
          await deleteTransactionReceipts(tx)
        }
        set((state) => ({
          transactions: state.transactions.filter((t) => !ids.includes(t.id))
        }))
        get().recalculateBalances()
        get().persistUserData()
      },
      bulkUpdateTransactions: (ids, patch) => {
        set((state) => ({
          transactions: state.transactions.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t))
        }))
        get().recalculateBalances()
        get().persistUserData()
      },

      // === Budgets ===
      addBudget: (budget) => {
        set((state) => ({
          budgets: [
            ...state.budgets,
            { ...budget, id: generateId(), rollover: budget.rollover ?? false, rolloverAmount: budget.rolloverAmount ?? 0 }
          ]
        }))
        get().persistUserData()
      },
      updateBudget: (id, patch) => {
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b))
        }))
        get().persistUserData()
      },
      deleteBudget: (id) => {
        set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }))
        get().persistUserData()
      },

      rolloverBudgets: () => {
        const { budgets, transactions, settings } = get()
        const currentMonth = getCurrentMonth()
        const lastMonth = settings.lastBudgetMonth
        if (!lastMonth) {
          get().updateSettings({ lastBudgetMonth: currentMonth })
          return
        }
        if (lastMonth >= currentMonth) return

        const updatedBudgets = budgets.map((budget) => {
          if (!budget.rollover) return budget
          const spent = transactions
            .filter(
              (t) =>
                t.date.startsWith(lastMonth) &&
                t.type === 'expense' &&
                t.categoryId === budget.categoryId
            )
            .reduce((sum, t) => sum + t.amount, 0)
          const previousRollover = budget.rolloverAmount || 0
          const leftover = Math.max(0, budget.amount + previousRollover - spent)
          return { ...budget, rolloverAmount: leftover }
        })
        set({ budgets: updatedBudgets })
        get().updateSettings({ lastBudgetMonth: currentMonth })
      },

      // === Goals ===
      addGoal: (goal) => {
        set((state) => ({ goals: [...state.goals, { ...goal, id: generateId() }] }))
        get().persistUserData()
      },
      updateGoal: (id, patch) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g))
        }))
        get().persistUserData()
      },
      deleteGoal: (id) => {
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }))
        get().persistUserData()
      },

      // === Debts ===
      addDebt: (debt) => {
        set((state) => ({ debts: [...state.debts, { ...debt, id: generateId() }] }))
        get().persistUserData()
      },
      updateDebt: (id, patch) => {
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { ...d, ...patch } : d))
        }))
        get().persistUserData()
      },
      deleteDebt: (id) => {
        set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }))
        get().persistUserData()
      },

      // === Recurring ===
      addRecurring: (recurring) => {
        set((state) => ({ recurring: [...state.recurring, { ...recurring, id: generateId() }] }))
        get().persistUserData()
      },
      updateRecurring: (id, patch) => {
        set((state) => ({
          recurring: state.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r))
        }))
        get().persistUserData()
      },
      deleteRecurring: (id) => {
        set((state) => ({ recurring: state.recurring.filter((r) => r.id !== id) }))
        get().persistUserData()
      },

      generateRecurringTransactions: (untilDate) => {
        const { recurring, addTransaction, updateRecurring } = get()
        const today = new Date().toISOString().slice(0, 10)
        const end = untilDate || today
        let generated = 0

        const nextDate = (dateStr, frequency) => {
          const d = new Date(dateStr)
          if (frequency === 'weekly') d.setDate(d.getDate() + 7)
          else if (frequency === 'biweekly') d.setDate(d.getDate() + 14)
          else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
          else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3)
          else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
          return d.toISOString().slice(0, 10)
        }

        recurring.forEach((r) => {
          if (!r.active) return
          let current = r.nextDueDate
          while (current && current <= end) {
            addTransaction({
              accountId: r.accountId || (get().accounts[0]?.id || ''),
              amount: r.amount,
              type: r.type,
              categoryId: r.categoryId,
              date: current,
              note: r.name,
              tags: ['recurring']
            })
            generated++
            current = nextDate(current, r.frequency)
          }
          updateRecurring(r.id, { nextDueDate: current })
        })

        return generated
      },

      // === Investments ===
      addInvestment: (investment) => {
        set((state) => ({ investments: [...state.investments, { ...investment, id: generateId() }] }))
        get().persistUserData()
      },
      updateInvestment: (id, patch) => {
        set((state) => ({
          investments: state.investments.map((i) => (i.id === id ? { ...i, ...patch } : i))
        }))
        get().persistUserData()
      },
      deleteInvestment: (id) => {
        set((state) => ({ investments: state.investments.filter((i) => i.id !== id) }))
        get().persistUserData()
      },

      // === Loans ===
      addLoan: (loan) => {
        set((state) => ({ loans: [...state.loans, { ...loan, id: generateId() }] }))
        get().persistUserData()
      },
      updateLoan: (id, patch) => {
        set((state) => ({
          loans: state.loans.map((l) => (l.id === id ? { ...l, ...patch } : l))
        }))
        get().persistUserData()
      },
      deleteLoan: (id) => {
        set((state) => ({ loans: state.loans.filter((l) => l.id !== id) }))
        get().persistUserData()
      },

      // === Templates ===
      addTemplate: (template) => {
        set((state) => ({ templates: [...state.templates, { ...template, id: generateId() }] }))
        get().persistUserData()
      },
      updateTemplate: (id, patch) => {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t))
        }))
        get().persistUserData()
      },
      deleteTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
        get().persistUserData()
      },

      // === Rules ===
      addRule: (rule) => {
        set((state) => ({ rules: [...state.rules, { ...rule, id: generateId() }] }))
        get().persistUserData()
      },
      updateRule: (id, patch) => {
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r))
        }))
        get().persistUserData()
      },
      deleteRule: (id) => {
        set((state) => ({ rules: state.rules.filter((r) => r.id !== id) }))
        get().persistUserData()
      },
      applyRulesToTransaction: (transaction) => {
        const { rules, categories } = get()
        let updated = { ...transaction }
        for (const rule of rules) {
          if (!rule.active) continue
          const note = (updated.note || '').toLowerCase()
          const merchant = (updated.merchant || '').toLowerCase()
          const pattern = rule.pattern.toLowerCase()
          const matches =
            (rule.field === 'note' && note.includes(pattern)) ||
            (rule.field === 'merchant' && merchant.includes(pattern)) ||
            (rule.field === 'amount' && Number(updated.amount) === Number(pattern)) ||
            (rule.field === 'any' && (note.includes(pattern) || merchant.includes(pattern)))
          if (matches) {
            if (rule.actionCategoryId) updated.categoryId = rule.actionCategoryId
            if (rule.actionAccountId) updated.accountId = rule.actionAccountId
            if (rule.actionTags?.length) {
              updated.tags = [...new Set([...(updated.tags || []), ...rule.actionTags])]
            }
          }
        }
        return updated
      },

      // === Bulk import / reset ===
      replaceState: (newState) => {
        set({ ...getEmptyUserData(), ...newState })
        get().persistUserData()
      },
      resetToDemo: () => {
        set(getInitialUserData())
        get().persistUserData()
      },

      // === Derived calculations ===
      recalculateBalances: () => {
        const { accounts, transactions } = get()
        const updated = accounts.map((account) => {
          let balance = account.initialBalance || 0
          transactions.forEach((t) => {
            if (t.accountId === account.id) {
              if (t.type === 'income') balance += t.amount
              else if (t.type === 'expense') balance -= t.amount
              else if (t.type === 'transfer') balance -= t.amount
            }
            if (t.transferTo === account.id) {
              balance += t.amount
            }
          })
          return { ...account, balance }
        })
        set({ accounts: updated })
      },

      getTotalBalance: () => {
        return get().accounts.reduce((sum, a) => sum + a.balance, 0)
      },

      getMonthlyTotals: (month = getCurrentMonth()) => {
        const { transactions } = get()
        let income = 0
        let expense = 0
        transactions.forEach((t) => {
          if (!t.date.startsWith(month)) return
          if (t.type === 'income') income += t.amount
          else if (t.type === 'expense') expense += t.amount
        })
        return { income, expense }
      },

      getTransactionsByMonth: (month = getCurrentMonth()) => {
        return get().transactions.filter((t) => t.date.startsWith(month))
      },

      getBudgetProgress: (budgetId, month = getCurrentMonth()) => {
        const { transactions, budgets } = get()
        const budget = budgets.find((b) => b.id === budgetId)
        if (!budget) return { spent: 0, limit: 0, percent: 0, rolloverAmount: 0 }
        const spent = transactions
          .filter(
            (t) =>
              t.date.startsWith(month) &&
              t.type === 'expense' &&
              t.categoryId === budget.categoryId
          )
          .reduce((sum, t) => sum + t.amount, 0)
        const rolloverAmount = budget.rolloverAmount || 0
        const limit = budget.amount + rolloverAmount
        return {
          spent,
          limit,
          rolloverAmount,
          percent: limit > 0 ? Math.min((spent / limit) * 100, 999) : 0
        }
      }
    }),
    {
      name: 'pocket-money-storage',
      partialize: (state) => {
        const { auth, usersData } = state
        return { auth, usersData }
      },
      onRehydrateStorage: () => (state) => {
        if (state?.auth?.currentUser && state.usersData[state.auth.currentUser]) {
          const userData = state.usersData[state.auth.currentUser]
          Object.assign(state, userData)
          state.recalculateBalances?.()
          state.rolloverBudgets?.()
          state.auth.isLocked = true
          state.auth.lockAt = Date.now()
        }
      }
    }
  )
)

// Auto-lock on inactivity
let activityTimer
export function resetActivityTimer() {
  const store = useAppStore.getState()
  if (!store.auth.currentUser) return
  clearTimeout(activityTimer)
  activityTimer = setTimeout(() => {
    store.lock()
  }, LOCK_TIMEOUT)
}

if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown', 'scroll'].forEach((event) => {
    window.addEventListener(event, resetActivityTimer, { passive: true })
  })
}
