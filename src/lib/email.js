import { EmailComposer } from 'capacitor-email-composer'
import { Capacitor } from '@capacitor/core'
import { escapeHtml } from './sanitize'
import { formatDate } from './utils'
import { nativeShare } from './share'

export function buildEmailReport(data) {
  const { settings, accounts, transactions, categories, budgets } = data
  const currency = settings?.currency || 'LKR'
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthName = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const accountsTable = accounts
    .map(
      (a) =>
        `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(a.name)}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(a.type)}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${currency} ${(a.balance || 0).toFixed(2)}</td></tr>`
    )
    .join('')

  const recentTxRows = transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30)
    .map((t) => {
      const category = categories.find((c) => c.id === t.categoryId)?.name || ''
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(t.date)}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(t.type)}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${currency} ${(t.amount || 0).toFixed(2)}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(category)}</td></tr>`
    })
    .join('')

  const budgetRows = budgets
    .map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId)?.name || 'Unknown'
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(cat)}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${currency} ${b.amount.toFixed(2)}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${currency} ${spent.toFixed(2)}</td></tr>`
    })
    .join('')

  const html = `
    <html>
    <body style="font-family: system-ui, sans-serif; color: #333; background: #fff; padding: 24px;">
      <h1>Pocket Money Report</h1>
      <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
      <p><strong>Total Balance:</strong> ${currency} ${totalBalance.toFixed(2)}</p>
      <p><strong>Total Income:</strong> ${currency} ${income.toFixed(2)}</p>
      <p><strong>Total Expenses:</strong> ${currency} ${expense.toFixed(2)}</p>

      <h2>Accounts</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ccc;">Name</th><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ccc;">Type</th><th style="text-align: right; padding: 8px; border-bottom: 1px solid #ccc;">Balance</th></tr>
        ${accountsTable}
      </table>

      <h2>Recent Transactions</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ccc;">Date</th><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ccc;">Type</th><th style="text-align: right; padding: 8px; border-bottom: 1px solid #ccc;">Amount</th><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ccc;">Category</th></tr>
        ${recentTxRows}
      </table>

      ${budgets.length ? `
      <h2>Budgets for ${monthName}</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ccc;">Category</th><th style="text-align: right; padding: 8px; border-bottom: 1px solid #ccc;">Budget</th><th style="text-align: right; padding: 8px; border-bottom: 1px solid #ccc;">Spent</th></tr>
        ${budgetRows}
      </table>
      ` : ''}

      <p style="margin-top: 24px; color: #666; font-size: 12px;">Sent from Pocket Money.</p>
    </body>
    </html>
  `

  const text = `Pocket Money Report
Generated: ${new Date().toLocaleString()}
Total Balance: ${currency} ${totalBalance.toFixed(2)}
Total Income: ${currency} ${income.toFixed(2)}
Total Expenses: ${currency} ${expense.toFixed(2)}

Accounts:
${accounts.map((a) => `- ${a.name} (${a.type}): ${currency} ${(a.balance || 0).toFixed(2)}`).join('\n')}

Recent Transactions:
${transactions
  .slice()
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 30)
  .map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId)?.name || ''
    return `- ${formatDate(t.date)} ${t.type} ${currency} ${(t.amount || 0).toFixed(2)} ${cat}`
  })
  .join('\n')}

${budgets.length ? `Budgets for ${monthName}:
${budgets
  .map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId)?.name || 'Unknown'
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    return `- ${cat}: ${currency} ${b.amount.toFixed(2)} budget, ${currency} ${spent.toFixed(2)} spent`
  })
  .join('\n')}` : ''}

Sent from Pocket Money.
`

  const subject = `Pocket Money Report - ${monthName}`
  return { subject, html, text }
}

export async function sendEmailReport({ subject, html, text }) {
  try {
    if (Capacitor.isNativePlatform()) {
      await EmailComposer.open({ subject, body: html, isHtml: true })
      return true
    }
    const body = encodeURIComponent(text || html.replace(/<[^\u003e]*>/g, ''))
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank')
    return true
  } catch (err) {
    console.error('Email report failed', err)
    try {
      const shareText = `${subject}\n\n${text || html.replace(/<[^\u003e]*>/g, '')}`
      await nativeShare({ title: subject, text: shareText })
      return true
    } catch (shareErr) {
      return false
    }
  }
}
