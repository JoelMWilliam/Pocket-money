import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Capacitor } from '@capacitor/core'
import { downloadOrShare } from './share'
import { formatDate } from './utils'

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 40
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM_MARGIN = 50
const FONT_SIZE = 9
const HEADER_FONT_SIZE = 18
const SECTION_FONT_SIZE = 13
const ROW_HEIGHT = 14
const HEADER_ROW_HEIGHT = 18

function truncate(text, width, font, size) {
  let s = String(text)
  if (font.widthOfTextAtSize(s, size) <= width) return s
  while (s.length > 0) {
    const candidate = `${s}...`
    if (font.widthOfTextAtSize(candidate, size) <= width) return candidate
    s = s.slice(0, -1)
  }
  return '...'
}

export async function buildFinanceReportPDF(data) {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN - 20

  const checkPage = (required) => {
    if (y - required < BOTTOM_MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN - 20
    }
  }

  const drawTable = (headers, rows, colWidths) => {
    const totalWidth = colWidths.reduce((a, b) => a + b, 0)
    const scale = CONTENT_WIDTH / totalWidth
    const widths = colWidths.map((w) => w * scale)
    const startX = MARGIN

    checkPage(HEADER_ROW_HEIGHT + 8)
    let rowY = y

    page.drawRectangle({
      x: startX,
      y: rowY - HEADER_ROW_HEIGHT + 2,
      width: CONTENT_WIDTH,
      height: HEADER_ROW_HEIGHT,
      color: rgb(0.9, 0.9, 0.9)
    })

    let x = startX
    headers.forEach((h, i) => {
      const cell = truncate(h, widths[i] - 8, bold, FONT_SIZE)
      page.drawText(cell, { x: x + 4, y: rowY - 12, size: FONT_SIZE, font: bold, color: rgb(0, 0, 0) })
      x += widths[i]
    })
    rowY -= HEADER_ROW_HEIGHT

    rows.forEach((row) => {
      checkPage(ROW_HEIGHT + 4)
      x = startX
      row.forEach((cell, i) => {
        const text = truncate(String(cell), widths[i] - 8, regular, FONT_SIZE)
        page.drawText(text, { x: x + 4, y: rowY - 11, size: FONT_SIZE, font: regular, color: rgb(0, 0, 0) })
        x += widths[i]
      })
      page.drawLine({
        start: { x: startX, y: rowY - 13 },
        end: { x: startX + CONTENT_WIDTH, y: rowY - 13 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      })
      rowY -= ROW_HEIGHT
    })

    y = rowY - 8
  }

  const { settings, accounts, transactions, categories, budgets } = data
  const currency = settings?.currency || 'LKR'
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  page.drawText('Pocket Money Report', { x: MARGIN, y, size: HEADER_FONT_SIZE, font: bold, color: rgb(0, 0, 0) })
  y -= 24
  page.drawText(`Generated on ${new Date().toLocaleString()}`, { x: MARGIN, y, size: FONT_SIZE, font: regular, color: rgb(0.3, 0.3, 0.3) })
  y -= 20

  checkPage(30)
  page.drawText('Summary', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: bold })
  y -= 18
  page.drawText(`Total Balance: ${currency} ${totalBalance.toFixed(2)}`, { x: MARGIN, y, size: FONT_SIZE, font: regular })
  y -= 14
  page.drawText(`Total Income: ${currency} ${income.toFixed(2)}`, { x: MARGIN, y, size: FONT_SIZE, font: regular })
  y -= 14
  page.drawText(`Total Expenses: ${currency} ${expense.toFixed(2)}`, { x: MARGIN, y, size: FONT_SIZE, font: regular })
  y -= 22

  checkPage(30)
  page.drawText('Accounts', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: bold })
  y -= 18
  drawTable(
    ['Name', 'Type', 'Balance'],
    accounts.map((a) => [a.name, a.type, `${currency} ${(a.balance || 0).toFixed(2)}`]),
    [200, 120, 120]
  )

  checkPage(30)
  page.drawText('Recent Transactions', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: bold })
  y -= 18
  const txRows = transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 100)
    .map((t) => {
      const account = accounts.find((a) => a.id === t.accountId)?.name || ''
      const category = categories.find((c) => c.id === t.categoryId)?.name || ''
      return [formatDate(t.date), t.type, `${currency} ${(t.amount || 0).toFixed(2)}`, account, category, t.note || '']
    })
  drawTable(['Date', 'Type', 'Amount', 'Account', 'Category', 'Note'], txRows, [70, 60, 80, 90, 90, 110])

  if (budgets.length > 0) {
    checkPage(30)
    page.drawText('Budgets', { x: MARGIN, y, size: SECTION_FONT_SIZE, font: bold })
    y -= 18
    const currentMonth = new Date().toISOString().slice(0, 7)
    const budgetRows = budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId)
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      const remaining = Math.max(0, b.amount - spent)
      return [cat?.name || 'Unknown', `${currency} ${b.amount.toFixed(2)}`, `${currency} ${spent.toFixed(2)}`, `${currency} ${remaining.toFixed(2)}`]
    })
    drawTable(['Category', 'Budget', 'Spent', 'Remaining'], budgetRows, [160, 120, 120, 120])
  }

  return new Blob([await doc.save()], { type: 'application/pdf' })
}

export async function exportPDFReport(data) {
  const blob = await buildFinanceReportPDF(data)
  const filename = `pocket-money-report-${new Date().toISOString().slice(0, 10)}.pdf`
  await downloadOrShare(blob, filename, 'Pocket Money Report')
}
