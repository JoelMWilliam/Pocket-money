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
import { generateId, getCurrentMonth, formatLKR } from '../lib/utils'
import { sanitizeText, sanitizeTags, sanitizeUsername } from '../lib/sanitize'
import { deleteTransactionReceipts, inlineReceipts, extractReceipts, migrateReceiptsToIndexedDB } from '../lib/receipts'
import { canUseBiometrics, registerBiometric, verifyBiometric } from '../lib/biometric'
import { storageGet, storageSet, storageRemove, zustandStorage } from '../lib/storage'
import { cancelNotifications, scheduleBillReminder, scheduleBudgetAlert, cancelBudgetAlert, idHash } from '../lib/notifications'

const LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes

function mergeById(local = [], remote = [], timestampField = 'updatedAt') {
  const map = new Map()
  local.forEach((item) => map.set(item.id, item))
    remote.forEach((item) => {
      const existing = map.get(item.id)
      if (!existing) {
        map.set(item.id, item)
      } else {
        const existingTime = new Date(existing[timestampField] || 0).getTime()
        const remoteTime = new Date(item[timestampField] || 0).getTime()
        map.set(item.id, remoteTime > existingTime ? item : existing)
      }
    })
  return Array.from(map.values())
}

function getInitialUserData() {
  return JSON.parse(JSON.stringify({
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
  }))
}

function normalizeUserData(data) {
  ;(data.accounts || []).forEach((a) => {
    a.initialBalance = Number(a.initialBalance) || 0
    a.balance = Number(a.balance) || a.initialBalance
  })
  ;(data.transactions || []).forEach((t) => {
    t.amount = Number(t.amount) || 0
  })
  ;(data.budgets || []).forEach((b) => {
    b.amount = Number(b.amount) || 0
  })
  ;(data.goals || []).forEach((g) => {
    g.target = Number(g.target) || 0
    g.current = Number(g.current) || 0
  })
  ;(data.debts || []).forEach((d) => {
    d.principal = Number(d.principal) || 0
    d.balance = Number(d.balance) || 0
    d.interestRate = Number(d.interestRate) || 0
    d.minimumPayment = Number(d.minimumPayment) || 0
  })
  ;(data.recurring || []).forEach((r) => {
    r.amount = Number(r.amount) || 0
  })
  ;(data.investments || []).forEach((i) => {
    i.units = Number(i.units) || 0
    i.purchasePrice = Number(i.purchasePrice) || 0
    i.currentPrice = Number(i.currentPrice) || 0
  })
  ;(data.loans || []).forEach((l) => {
    l.amount = Number(l.amount) || 0
    l.repaid = Number(l.repaid) || 0
  })
  return data
}

function getEmptyUserData() {
  const now = Date.now()
  return {
    settings: { seedColor: '#0A84FF', isDark: true, currency: 'LKR', lastBudgetMonth: null, onboardingGoal: null, googleDriveBackupEnabled: false, googleDriveBackupInterval: 'daily', googleDriveBackupLastAt: null, googleDriveBackupEmail: null, smsAutoImportEnabled: false, smsLastImportedAt: null, smsImportedIds: [], notificationsEnabled: false, updatedAt: now },
    accounts: [],
    categories: [
      { id: 'cat-food', name: 'Food & Dining', icon: 'Utensils', color: '#FF9500', type: 'expense', updatedAt: now },
      { id: 'cat-groceries', name: 'Groceries', icon: 'ShoppingCart', color: '#FFCC00', type: 'expense', updatedAt: now },
      { id: 'cat-transport', name: 'Transport', icon: 'Bus', color: '#0A84FF', type: 'expense', updatedAt: now },
      { id: 'cat-fuel', name: 'Fuel', icon: 'Fuel', color: '#FF375F', type: 'expense', updatedAt: now },
      { id: 'cat-bills', name: 'Bills & Utilities', icon: 'Receipt', color: '#FF375F', type: 'expense', updatedAt: now },
      { id: 'cat-rent', name: 'Rent / Mortgage', icon: 'Home', color: '#BF5AF2', type: 'expense', updatedAt: now },
      { id: 'cat-insurance', name: 'Insurance', icon: 'ShieldCheck', color: '#5E5CE6', type: 'expense', updatedAt: now },
      { id: 'cat-entertainment', name: 'Entertainment', icon: 'Film', color: '#BF5AF2', type: 'expense', updatedAt: now },
      { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#FF9500', type: 'expense', updatedAt: now },
      { id: 'cat-health', name: 'Health', icon: 'HeartPulse', color: '#30D158', type: 'expense', updatedAt: now },
      { id: 'cat-education', name: 'Education', icon: 'GraduationCap', color: '#64D2FF', type: 'expense', updatedAt: now },
      { id: 'cat-travel', name: 'Travel', icon: 'Plane', color: '#0A84FF', type: 'expense', updatedAt: now },
      { id: 'cat-gifts', name: 'Gifts', icon: 'Gift', color: '#FF375F', type: 'expense', updatedAt: now },
      { id: 'cat-donations', name: 'Donations', icon: 'HandHeart', color: '#30D158', type: 'expense', updatedAt: now },
      { id: 'cat-personal', name: 'Personal Care', icon: 'Smile', color: '#BF5AF2', type: 'expense', updatedAt: now },
      { id: 'cat-pets', name: 'Pets', icon: 'PawPrint', color: '#FF9500', type: 'expense', updatedAt: now },
      { id: 'cat-subscriptions', name: 'Subscriptions', icon: 'CreditCard', color: '#5E5CE6', type: 'expense', updatedAt: now },
      { id: 'cat-investments', name: 'Investments', icon: 'TrendingUp', color: '#30D158', type: 'expense', updatedAt: now },
      { id: 'cat-salary', name: 'Salary', icon: 'Banknote', color: '#30D158', type: 'income', updatedAt: now },
      { id: 'cat-freelance', name: 'Freelance', icon: 'Briefcase', color: '#64D2FF', type: 'income', updatedAt: now },
      { id: 'cat-refunds', name: 'Refunds', icon: 'RotateCcw', color: '#0A84FF', type: 'income', updatedAt: now },
      { id: 'cat-interest', name: 'Interest', icon: 'Percent', color: '#FFCC00', type: 'income', updatedAt: now },
      { id: 'cat-dividends', name: 'Dividends', icon: 'Coins', color: '#BF5AF2', type: 'income', updatedAt: now },
      { id: 'cat-cashback', name: 'Cashback', icon: 'Banknote', color: '#FF9500', type: 'income', updatedAt: now },
      { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowLeftRight', color: '#8E8E93', type: 'transfer', updatedAt: now }
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
        username = sanitizeUsername(username)
        if (!username) throw new Error('Invalid username')
        if (get().auth.users[username]) throw new Error('User already exists')
        const pinHash = await hashPin(pin)
        const userData = options.useDemo ? getInitialUserData() : getEmptyUserData()
        userData.transactions = userData.transactions ? [...userData.transactions] : []
        await migrateReceiptsToIndexedDB(userData.transactions)

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
                  failedPinAttempts: 0,
                  lockedUntil: null,
                  avatar: options.avatar || null,
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
        await get().saveAuthState()
      },

      login: async (username, pin) => {
        const user = get().auth.users[username]
        if (!user) throw new Error('User not found')
        if (user.lockedUntil && Date.now() < user.lockedUntil) {
          const seconds = Math.ceil((user.lockedUntil - Date.now()) / 1000)
          throw new Error(`Too many attempts. Try again in ${seconds}s`)
        }
        const valid = await verifyPin(pin, user.pinHash)
        if (!valid) {
          const attempts = (user.failedPinAttempts || 0) + 1
          const updates = { failedPinAttempts: attempts }
          if (attempts >= 5) {
            updates.lockedUntil = Date.now() + 30000
          }
          set((state) => ({
            auth: {
              ...state.auth,
              users: {
                ...state.auth.users,
                [username]: { ...state.auth.users[username], ...updates }
              }
            }
          }))
          throw new Error('Invalid PIN')
        }

        await get().loadUserData(username)
        const userData = get().usersData[username] || getEmptyUserData()
        userData.transactions = userData.transactions ? [...userData.transactions] : []
        await migrateReceiptsToIndexedDB(userData.transactions)
        set((state) => ({
          auth: {
            ...state.auth,
            currentUser: username,
            isLocked: false,
            lockAt: null,
            users: {
              ...state.auth.users,
              [username]: { ...state.auth.users[username], failedPinAttempts: 0, lockedUntil: null }
            }
          },
          ...userData
        }))
        get().recalculateBalances()
        get().rolloverBudgets()
        await get().saveAuthState()
      },

      logout: async () => {
        await get().persistUserData()
        set((state) => ({
          auth: { ...state.auth, currentUser: null, isLocked: false, lockAt: null },
          ...getEmptyUserData()
        }))
      },

      lock: async () => {
        await get().persistUserData()
        set((state) => ({
          auth: { ...state.auth, isLocked: true, lockAt: Date.now() }
        }))
      },

      unlock: async (pin, options = {}) => {
        const { auth } = get()
        const user = auth.users[auth.currentUser]
        if (!user) throw new Error('No active user')

        if (user.lockedUntil && Date.now() < user.lockedUntil) {
          const seconds = Math.ceil((user.lockedUntil - Date.now()) / 1000)
          throw new Error(`Too many attempts. Try again in ${seconds}s`)
        }

        if (options.biometric && user.biometricEnabled) {
          try {
            await verifyBiometric(user.biometricCredentialId)
            set((state) => ({
              auth: {
                ...state.auth,
                users: {
                  ...state.auth.users,
                  [state.auth.currentUser]: {
                    ...state.auth.users[state.auth.currentUser],
                    failedPinAttempts: 0,
                    lockedUntil: null
                  }
                },
                isLocked: false,
                lockAt: null
              }
            }))
            return
          } catch (err) {
            throw new Error('Biometric verification failed')
          }
        }

        const valid = await verifyPin(pin, user.pinHash)
        if (!valid) {
          const attempts = (user.failedPinAttempts || 0) + 1
          const updates = { failedPinAttempts: attempts }
          if (attempts >= 5) {
            updates.lockedUntil = Date.now() + 30000
          }
          set((state) => ({
            auth: {
              ...state.auth,
              users: {
                ...state.auth.users,
                [state.auth.currentUser]: {
                  ...state.auth.users[state.auth.currentUser],
                  ...updates
                }
              }
            }
          }))
          throw new Error('Invalid PIN')
        }

        set((state) => ({
          auth: {
            ...state.auth,
            users: {
              ...state.auth.users,
              [state.auth.currentUser]: {
                ...state.auth.users[state.auth.currentUser],
                failedPinAttempts: 0,
                lockedUntil: null
              }
            },
            isLocked: false,
            lockAt: null
          }
        }))
      },

      enableBiometric: async () => {
        const { auth } = get()
        const username = auth.currentUser
        if (!username) throw new Error('No active user')
        const credentialId = await registerBiometric(username)
        await get().updateUserSettings(username, {
          biometricEnabled: true,
          biometricCredentialId: credentialId
        })
      },

      disableBiometric: async () => {
        const { auth } = get()
        const username = auth.currentUser
        if (!username) return
        await get().updateUserSettings(username, {
          biometricEnabled: false,
          biometricCredentialId: null
        })
      },

      switchUser: async (username) => {
        await get().saveCurrentUserData()
        await get().persistUserData()
        await get().loadUserData(username)
        const userData = get().usersData[username] || getEmptyUserData()
        userData.transactions = userData.transactions ? [...userData.transactions] : []
        await migrateReceiptsToIndexedDB(userData.transactions)
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
        // Direct auth backup so we don't depend solely on zustand persist timing.
        await storageSet('auth-backup', auth)
        await storageSet('usersdata-backup', usersData)
      },

      saveAuthState: async () => {
        const { auth, usersData } = get()
        await storageSet('auth-backup', auth)
        await storageSet('usersdata-backup', usersData)
      },

      enableGoogleDriveBackup: async () => {
        const { isGoogleDriveConfigured, signInToGoogleDrive } = await import('../lib/googleDrive')
        if (!isGoogleDriveConfigured()) throw new Error('Google Drive client ID is not configured.')
        const auth = await signInToGoogleDrive()
        set((state) => ({
          settings: {
            ...state.settings,
            googleDriveBackupEnabled: true,
            googleDriveBackupEmail: auth.email
          }
        }))
        get().persistUserData()
        return auth
      },

      disableGoogleDriveBackup: async () => {
        const { signOutFromGoogleDrive } = await import('../lib/googleDrive')
        await signOutFromGoogleDrive()
        set((state) => ({
          settings: {
            ...state.settings,
            googleDriveBackupEnabled: false,
            googleDriveBackupLastAt: null,
            googleDriveBackupEmail: null
          }
        }))
        get().persistUserData()
      },

      backupToGoogleDrive: async (force = false) => {
        const settings = get().settings
        if (!settings.googleDriveBackupEnabled && !force) {
          return { success: false, message: 'Google Drive backup is not enabled.' }
        }
        try {
          const { uploadBackupToDrive } = await import('../lib/googleDrive')
          const data = {
            settings: get().settings,
            accounts: get().accounts,
            categories: get().categories,
            transactions: get().transactions,
            budgets: get().budgets,
            goals: get().goals,
            debts: get().debts,
            recurring: get().recurring,
            investments: get().investments,
            loans: get().loans
          }
          const result = await uploadBackupToDrive(data)
          set((state) => ({
            settings: { ...state.settings, googleDriveBackupLastAt: Date.now() }
          }))
          get().persistUserData()
          return { success: true, ...result }
        } catch (err) {
          return { success: false, message: err.message }
        }
      },

      restoreFromGoogleDrive: async () => {
        try {
          const { downloadBackupFromDrive } = await import('../lib/googleDrive')
          const data = await downloadBackupFromDrive()
          get().replaceState(data)
          return { success: true }
        } catch (err) {
          return { success: false, message: err.message }
        }
      },

      maybeAutoBackupToGoogleDrive: async () => {
        const settings = get().settings
        if (!settings.googleDriveBackupEnabled) return
        const interval = settings.googleDriveBackupInterval || 'daily'
        if (interval === 'manual') return

        const last = settings.googleDriveBackupLastAt || 0
        const now = Date.now()
        const oneMinute = 60_000

        // Throttle all intervals to at most one backup per minute to avoid loops.
        if (now - last < oneMinute) return

        if (interval === 'onchange') {
          await get().backupToGoogleDrive()
          return
        }

        const dayMs = 24 * 60 * 60 * 1000
        const threshold = interval === 'weekly' ? 7 * dayMs : dayMs
        if (now - last >= threshold) {
          await get().backupToGoogleDrive()
        }
      },

      loadUserData: async (username) => {
        const data = await storageGet(`userdata-${username}`, null)
        if (data) {
          set((state) => ({
            usersData: { ...state.usersData, [username]: data }
          }))
        }
      },

      updateUserSettings: async (username, patch) => {
        set((state) => ({
          auth: {
            ...state.auth,
            users: {
              ...state.auth.users,
              [username]: { ...state.auth.users[username], ...patch }
            }
          }
        }))
        await get().persistUserData()
      },

      deleteUser: async (username) => {
        set((state) => {
          const { [username]: _, ...remainingUsers } = state.auth.users
          const { [username]: __, ...remainingData } = state.usersData
          const isCurrent = state.auth.currentUser === username
          return {
            auth: {
              ...state.auth,
              users: remainingUsers,
              currentUser: isCurrent ? null : state.auth.currentUser
            },
            usersData: remainingData,
            ...(isCurrent ? getEmptyUserData() : {})
          }
        })
        await storageRemove(`userdata-${username}`)
        await get().persistUserData()
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
              transactions: mergeById(state.transactions, cloud.transactions, 'updatedAt'),
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
        set((state) => ({ settings: { ...state.settings, ...patch, updatedAt: Date.now() } }))
        get().persistUserData()
      },

      // === Accounts ===
      addAccount: (account) => {
        const clean = { ...account, name: sanitizeText(account.name, 100) }
        const initialBalance = Number(clean.initialBalance) || Number(clean.balance) || 0
        const now = Date.now()
        set((state) => ({
          accounts: [
            ...state.accounts,
            {
              ...clean,
              id: generateId(),
              initialBalance,
              balance: initialBalance,
              reconciledBalance: initialBalance,
              lastReconciledAt: now,
              updatedAt: now
            }
          ]
        }))
        get().recalculateBalances()
        get().persistUserData()
      },
      updateAccount: (id, patch) => {
        set((state) => ({
          accounts: state.accounts.map((a) => {
            if (a.id !== id) return a
            const updated = { ...a, ...patch, updatedAt: Date.now() }
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
      deleteAccount: async (id) => {
        const removed = get().transactions.filter((t) => t.accountId === id || t.transferTo === id)
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
          transactions: state.transactions.filter((t) => t.accountId !== id && t.transferTo !== id)
        }))
        await Promise.all(removed.map((t) => deleteTransactionReceipts(t)))
        get().recalculateBalances()
        get().persistUserData()
      },

      reconcileAccount: (id, statementBalance) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id
              ? { ...a, reconciledBalance: Number(statementBalance) || 0, lastReconciledAt: Date.now(), updatedAt: Date.now() }
              : a
          )
        }))
        get().persistUserData()
      },

      // === Categories ===
      addCategory: (category) => {
        const clean = { ...category, name: sanitizeText(category.name, 100) }
        const id = clean.id || generateId()
        set((state) => ({ categories: [...state.categories, { ...clean, id, updatedAt: Date.now() }] }))
        get().persistUserData()
        return { ...clean, id }
      },
      updateCategory: (id, patch) => {
        set((state) => ({
          categories: state.categories.map((c) => {
            if (c.id !== id) return c
            const updated = { ...c, ...patch, updatedAt: Date.now() }
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
        let newTx = { ...transaction, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() }
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
        get().checkBudgetAlerts()
        get().maybeAutoBackupToGoogleDrive()
        get().persistUserData()
        return newTx
      },
      updateTransaction: (id, patch) => {
        set((state) => {
          const nextTransactions = state.transactions.map((t) => {
            if (t.id !== id) return t
            let updated = { ...t, ...patch, updatedAt: Date.now() }
            if (updated.note !== undefined) updated.note = sanitizeText(updated.note, 500)
            if (updated.tags !== undefined) updated.tags = sanitizeTags(updated.tags)
            if (updated.type !== 'transfer') {
              updated.transferTo = undefined
            }
            if (updated.type !== 'expense') {
              updated.splits = undefined
            }
            updated = get().applyRulesToTransaction(updated)
            return updated
          })
          return { transactions: nextTransactions }
        })
        get().recalculateBalances()
        get().checkBudgetAlerts()
        get().maybeAutoBackupToGoogleDrive()
        get().persistUserData()
      },
      deleteTransaction: async (id) => {
        const tx = get().transactions.find((t) => t.id === id)
        if (tx) await deleteTransactionReceipts(tx)
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id)
        }))
        get().recalculateBalances()
        get().checkBudgetAlerts()
        get().maybeAutoBackupToGoogleDrive()
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
        get().checkBudgetAlerts()
        get().maybeAutoBackupToGoogleDrive()
        get().persistUserData()
      },
      bulkUpdateTransactions: (ids, patch) => {
        const cleanPatch = { ...patch }
        if (cleanPatch.tags !== undefined) cleanPatch.tags = sanitizeTags(cleanPatch.tags)
        if (cleanPatch.note !== undefined) cleanPatch.note = sanitizeText(cleanPatch.note, 500)
        set((state) => ({
          transactions: state.transactions.map((t) => (ids.includes(t.id) ? { ...t, ...cleanPatch, updatedAt: Date.now() } : t))
        }))
        get().recalculateBalances()
        get().checkBudgetAlerts()
        get().maybeAutoBackupToGoogleDrive()
        get().persistUserData()
      },

      // === Budgets ===
      addBudget: (budget) => {
        set((state) => ({
          budgets: [
            ...state.budgets,
            { ...budget, id: generateId(), rollover: budget.rollover ?? false, rolloverAmount: budget.rolloverAmount ?? 0, updatedAt: Date.now() }
          ]
        }))
        get().checkBudgetAlerts()
        get().maybeAutoBackupToGoogleDrive()
        get().persistUserData()
      },
      updateBudget: (id, patch) => {
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b))
        }))
        get().checkBudgetAlerts()
        get().maybeAutoBackupToGoogleDrive()
        get().persistUserData()
      },
      deleteBudget: (id) => {
        set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }))
        cancelBudgetAlert(id)
        get().maybeAutoBackupToGoogleDrive()
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
        set((state) => ({ goals: [...state.goals, { ...goal, id: generateId(), updatedAt: Date.now() }] }))
        get().persistUserData()
      },
      updateGoal: (id, patch) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: Date.now() } : g))
        }))
        get().persistUserData()
      },
      deleteGoal: (id) => {
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }))
        get().persistUserData()
      },

      // === Debts ===
      addDebt: (debt) => {
        set((state) => ({ debts: [...state.debts, { ...debt, id: generateId(), updatedAt: Date.now() }] }))
        get().persistUserData()
      },
      updateDebt: (id, patch) => {
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d))
        }))
        get().persistUserData()
      },
      deleteDebt: (id) => {
        set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }))
        get().persistUserData()
      },

      // === Recurring ===
      addRecurring: async (recurring) => {
        const item = { ...recurring, id: generateId(), updatedAt: Date.now() }
        set((state) => ({ recurring: [...state.recurring, item] }))
        await get().persistUserData()
        if (recurring.type === 'expense' && recurring.reminderDays > 0) {
          await scheduleBillReminder(item.id, `Bill due: ${recurring.name}`, `${formatLKR(recurring.amount)} due on ${recurring.nextDueDate}`, recurring.nextDueDate, recurring.reminderDays)
        }
      },
      updateRecurring: async (id, patch) => {
        set((state) => ({
          recurring: state.recurring.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r))
        }))
        await get().persistUserData()
        const updated = get().recurring.find((r) => r.id === id)
        if (updated?.type === 'expense' && updated.active) {
          await cancelNotifications([idHash(id)])
          await scheduleBillReminder(updated.id, `Bill due: ${updated.name}`, `${formatLKR(updated.amount)} due on ${updated.nextDueDate}`, updated.nextDueDate, updated.reminderDays || 3)
        }
      },
      deleteRecurring: async (id) => {
        set((state) => ({ recurring: state.recurring.filter((r) => r.id !== id) }))
        await get().persistUserData()
        await cancelNotifications([idHash(id)])
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
          else d.setMonth(d.getMonth() + 1) // default to monthly for invalid/missing frequency
          return d.toISOString().slice(0, 10)
        }

        recurring.forEach((r) => {
          if (!r.active) return
          let current = r.nextDueDate
          let iterations = 0
          const MAX_ITERATIONS = 120
          while (current && current <= end && iterations < MAX_ITERATIONS) {
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
            iterations++
          }
          updateRecurring(r.id, { nextDueDate: current })
        })

        return generated
      },

      checkBudgetAlerts: () => {
        const { budgets, categories, getBudgetProgress } = get()
        budgets.forEach(async (b) => {
          try {
            const { spent, limit, percent } = getBudgetProgress(b.id)
            if (limit > 0 && percent >= 100) {
              const category = categories.find((c) => c.id === b.categoryId)
              await scheduleBudgetAlert(b.id, category?.name || 'Budget', spent, limit)
            } else {
              await cancelBudgetAlert(b.id)
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Budget alert failed', err)
          }
        })
      },

      // === Investments ===
      addInvestment: (investment) => {
        set((state) => ({ investments: [...state.investments, { ...investment, id: generateId(), updatedAt: Date.now() }] }))
        get().persistUserData()
      },
      updateInvestment: (id, patch) => {
        set((state) => ({
          investments: state.investments.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i))
        }))
        get().persistUserData()
      },
      deleteInvestment: (id) => {
        set((state) => ({ investments: state.investments.filter((i) => i.id !== id) }))
        get().persistUserData()
      },

      // === Loans ===
      addLoan: (loan) => {
        set((state) => ({ loans: [...state.loans, { ...loan, id: generateId(), updatedAt: Date.now() }] }))
        get().persistUserData()
      },
      updateLoan: (id, patch) => {
        set((state) => ({
          loans: state.loans.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l))
        }))
        get().persistUserData()
      },
      deleteLoan: (id) => {
        set((state) => ({ loans: state.loans.filter((l) => l.id !== id) }))
        get().persistUserData()
      },

      // === Templates ===
      addTemplate: (template) => {
        set((state) => ({ templates: [...state.templates, { ...template, id: generateId(), updatedAt: Date.now() }] }))
        get().persistUserData()
      },
      updateTemplate: (id, patch) => {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
        }))
        get().persistUserData()
      },
      deleteTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
        get().persistUserData()
      },

      // === Rules ===
      addRule: (rule) => {
        set((state) => ({ rules: [...state.rules, { ...rule, id: generateId(), updatedAt: Date.now() }] }))
        get().persistUserData()
      },
      updateRule: (id, patch) => {
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r))
        }))
        get().persistUserData()
      },
      deleteRule: (id) => {
        set((state) => ({ rules: state.rules.filter((r) => r.id !== id) }))
        get().persistUserData()
      },
      applyRulesToTransaction: (transaction) => {
        const { rules, categories, accounts } = get()
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
            if (rule.actionCategoryId && categories.find((c) => c.id === rule.actionCategoryId)) {
              updated.categoryId = rule.actionCategoryId
            }
            if (rule.actionAccountId && accounts.find((a) => a.id === rule.actionAccountId)) {
              updated.accountId = rule.actionAccountId
            }
            if (rule.actionTags?.length) {
              updated.tags = [...new Set([...(updated.tags || []), ...rule.actionTags])]
            }
          }
        }
        return updated
      },

      // === Bulk import / reset ===
      replaceState: (newState) => {
        const merged = normalizeUserData({ ...getEmptyUserData(), ...newState })
        set(merged)
        get().recalculateBalances()
        get().persistUserData()
      },
      resetToDemo: () => {
        set(getInitialUserData())
        get().recalculateBalances()
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
      storage: zustandStorage,
      partialize: (state) => {
        const { auth, usersData } = state
        const activeUser = auth.currentUser
        // Also snapshot the active user's live data into usersData so a single
        // zustand persist write captures everything. This avoids relying on a
        // separate, possibly-raced `persistUserData` call before the app dies.
        if (activeUser) {
          const activeData = {
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
          return {
            auth,
            usersData: { ...usersData, [activeUser]: activeData }
          }
        }
        return { auth, usersData }
      },
      onRehydrateStorage: () => async (state) => {
        if (!state) return
        let auth = state.auth
        let usersData = state.usersData
        // If zustand persist is empty (e.g. first launch after a force-kill),
        // try the explicit auth backups.
        if (!auth || Object.keys(auth.users || {}).length === 0) {
          const backupAuth = await storageGet('auth-backup', null)
          const backupUsersData = await storageGet('usersdata-backup', null)
          if (backupAuth) auth = backupAuth
          if (backupUsersData) usersData = backupUsersData
          if (auth) state.auth = auth
          if (usersData) state.usersData = usersData
        }
        const username = auth?.currentUser
        if (username) {
          // Prefer the dedicated per-user backup if it exists.
          const stored = await storageGet(`userdata-${username}`, null)
          if (stored) {
            state.usersData = state.usersData || {}
            state.usersData[username] = stored
            usersData = state.usersData
          }
          const userData = (usersData && usersData[username]) || getEmptyUserData()
          // Merge safely without mutating the frozen persist state object.
          Object.keys(userData).forEach((key) => {
            if (key in state) state[key] = userData[key]
          })
          state.recalculateBalances?.()
          state.rolloverBudgets?.()
          if (state.auth) {
            state.auth.isLocked = true
            state.auth.lockAt = Date.now()
          }
        }
      }
    }
  )
)

// Auto-lock on inactivity
let activityTimer
let activityListenersRegistered = false
export function resetActivityTimer() {
  const store = useAppStore.getState()
  if (!store.auth.currentUser) return
  clearTimeout(activityTimer)
  activityTimer = setTimeout(() => {
    store.lock()
  }, LOCK_TIMEOUT)
}

export function registerActivityListeners() {
  if (typeof window === 'undefined' || activityListenersRegistered) return
  activityListenersRegistered = true
  ;['click', 'touchstart', 'keydown', 'scroll'].forEach((event) => {
    window.addEventListener(event, resetActivityTimer, { passive: true })
  })
}
