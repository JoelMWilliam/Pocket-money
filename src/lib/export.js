import { encryptData, decryptData } from './crypto'
import { inlineReceipts } from './receipts'
import { downloadOrShare } from './share'
import { escapeHtml } from './sanitize'

export async function exportToJSON(data) {
  const withReceipts = await inlineReceipts(data)
  const blob = new Blob([JSON.stringify(withReceipts, null, 2)], { type: 'application/json' })
  await downloadOrShare(blob, `pocket-money-backup-${new Date().toISOString().slice(0, 10)}.json`, 'Pocket Money Backup')
}

export async function exportEncryptedBackup(data, passphrase) {
  const withReceipts = await inlineReceipts(data)
  const encrypted = await encryptData(withReceipts, passphrase)
  const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: 'application/json' })
  await downloadOrShare(blob, `pocket-money-encrypted-${new Date().toISOString().slice(0, 10)}.json`, 'Pocket Money Encrypted Backup')
}

export async function readEncryptedBackupFile(file, passphrase) {
  const data = await readJSONFile(file)
  return decryptData(data, passphrase)
}

function sanitizeCsvCell(value) {
  const s = String(value)
  // Prevent CSV formula injection when opened in spreadsheet apps.
  if (/^[\+\-=\t\r\@\s]/.test(s)) return `'${s}`
  return s
}

export async function exportTransactionsToCSV(transactions, accounts, categories) {
  const headers = ['Date', 'Type', 'Amount', 'Account', 'Category', 'Note', 'Tags']
  const rows = transactions.map((t) => {
    const account = accounts.find((a) => a.id === t.accountId)?.name || ''
    const category = categories.find((c) => c.id === t.categoryId)?.name || ''
    return [t.date, t.type, t.amount, account, category, t.note || '', (t.tags || []).join(';')]
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${sanitizeCsvCell(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  await downloadOrShare(blob, `pocket-money-transactions-${new Date().toISOString().slice(0, 10)}.csv`, 'Pocket Money Transactions')
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function validateBackupData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid backup: not an object')
  }
  const allowedKeys = new Set([
    'settings', 'accounts', 'categories', 'transactions', 'budgets', 'goals', 'debts',
    'recurring', 'investments', 'loans', 'templates', 'rules'
  ])
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Invalid backup: unknown key "${key}"`)
    }
  }
  for (const key of ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'debts', 'recurring', 'investments', 'loans', 'templates', 'rules']) {
    const value = data[key]
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error(`Invalid backup: ${key} must be an array`)
    }
  }
  if (data.settings !== undefined && typeof data.settings !== 'object') {
    throw new Error('Invalid backup: settings must be an object')
  }
  const size = JSON.stringify(data).length
  if (size > 50 * 1024 * 1024) {
    throw new Error('Invalid backup: file too large')
  }
  return true
}

export function sanitizeImportedSettings(settings, currentSettings = {}) {
  const sensitive = new Set([
    'googleDriveBackupEnabled',
    'googleDriveBackupEmail',
    'googleDriveBackupLastAt',
    'googleDriveBackupInterval',
    'smsImportedIds',
    'smsLastImportedAt',
    'smsAutoImportEnabled',
    'notificationsEnabled',
    'lastBudgetMonth'
  ])
  const merged = { ...settings }
  for (const key of sensitive) {
    if (key in currentSettings) merged[key] = currentSettings[key]
  }
  return merged
}

export function printReport(title, contentHtml) {
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: system-ui, sans-serif; color: #000; background: #fff; padding: 40px; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          p { color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
          th { font-weight: 600; color: #333; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
