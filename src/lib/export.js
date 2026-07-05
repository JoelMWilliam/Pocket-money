import { encryptData, decryptData } from './crypto'
import { inlineReceipts } from './receipts'

export async function exportToJSON(data) {
  const withReceipts = await inlineReceipts(data)
  const blob = new Blob([JSON.stringify(withReceipts, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pocket-money-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportEncryptedBackup(data, passphrase) {
  const withReceipts = await inlineReceipts(data)
  const encrypted = await encryptData(withReceipts, passphrase)
  const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pocket-money-encrypted-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readEncryptedBackupFile(file, passphrase) {
  const data = await readJSONFile(file)
  return decryptData(data, passphrase)
}

export function exportTransactionsToCSV(transactions, accounts, categories) {
  const headers = ['Date', 'Type', 'Amount', 'Account', 'Category', 'Note', 'Tags']
  const rows = transactions.map((t) => {
    const account = accounts.find((a) => a.id === t.accountId)?.name || ''
    const category = categories.find((c) => c.id === t.categoryId)?.name || ''
    return [t.date, t.type, t.amount, account, category, t.note || '', (t.tags || []).join(';')]
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '\\"')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pocket-money-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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

export function printReport(title, contentHtml) {
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
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
