const BALANCE_KEYWORDS = [
  'closing balance',
  'statement balance',
  'balance carried forward',
  'balance brought forward',
  'outstanding balance',
  'current balance',
  'available balance',
  'balance due',
  'payment due'
]

const CURRENCY_AMOUNT_RE = /(?:LKR|Rs\.?|Rs:|USD|US\$|\$|EUR|€|GBP|£|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/

export async function parsePDFText(arrayBuffer) {
  const pdfjs = await import('pdfjs-dist')
  // Use a fake worker to avoid loading a separate worker file in the bundle.
  pdfjs.GlobalWorkerOptions.workerSrc = ''
  const pdf = await pdfjs.getDocument({ data: arrayBuffer, useSystemFonts: true }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(' ') + '\n'
  }
  return text
}

export function extractStatementBalance(text) {
  if (!text) return null
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n/g, ' ')

  for (const keyword of BALANCE_KEYWORDS) {
    const idx = normalized.toLowerCase().indexOf(keyword)
    if (idx === -1) continue
    const snippet = normalized.slice(idx, idx + 250)
    const match = snippet.match(CURRENCY_AMOUNT_RE)
    if (match) {
      return Number(match[1].replace(/,/g, ''))
    }
  }

  // Fallback: pick the largest amount near the end of the document.
  const allAmounts = []
  let m
  const allRe = /(?:LKR|Rs\.?|Rs:|USD|US\$|\$|EUR|€|GBP|£|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/g
  while ((m = allRe.exec(normalized)) !== null) {
    allAmounts.push(Number(m[1].replace(/,/g, '')))
  }
  if (allAmounts.length > 0) {
    return Math.max(...allAmounts)
  }

  return null
}
