const EMAIL_SENDER_PATTERNS = [
  { pattern: /.*@.*amazon\.(com|in|lk)/i, merchant: 'Amazon', parser: 'amazon' },
  { pattern: /.*@.*flipkart\.com/i, merchant: 'Flipkart', parser: 'generic' },
  { pattern: /.*@.*uber\.com/i, merchant: 'Uber', parser: 'uber' },
  { pattern: /.*@.*swiggy\.com/i, merchant: 'Swiggy', parser: 'generic' },
  { pattern: /.*@.*zomato\.com/i, merchant: 'Zomato', parser: 'generic' },
  { pattern: /.*@.*foodpanda\./i, merchant: 'Foodpanda', parser: 'generic' },
  { pattern: /.*@.*netflix\.com/i, merchant: 'Netflix', parser: 'subscription' },
  { pattern: /.*@.*spotify\.com/i, merchant: 'Spotify', parser: 'subscription' },
  { pattern: /.*@.*daraz\.(com|lk)/i, merchant: 'Daraz', parser: 'generic' },
  { pattern: /.*@.*booking\.com/i, merchant: 'Booking.com', parser: 'generic' },
  { pattern: /.*@.*airbnb\.com/i, merchant: 'Airbnb', parser: 'generic' },
  { pattern: /.*(statement|alert|notification).*@.*bank/i, merchant: 'Bank', parser: 'bank' },
  { pattern: /.*@.*(hdfc|icici|sbi|kotak|axis|citi|bob|pnb|canara).*/i, merchant: 'Bank', parser: 'bank' },
  { pattern: /.*@.*(commercial|boc|hnb|sampath|nations ?trust|seylan|nsb).*/i, merchant: 'Bank', parser: 'bank' },
]

const AMOUNT_PATTERNS = [
  /(?:rs\.?\s*|lkr\s*|₹\s*|₨\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:amount|total|paid|charged|debited|amount\s*:\s*)(?:rs\.?\s*|lkr\s*|₹\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:order\s*total|amount\s*payable|amount\s*due)(?:rs\.?\s*|lkr\s*|₹\s*)?[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
]

const DATE_PATTERNS = [
  /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
  /(\d{4}-\d{2}-\d{2})/,
  /(\d{2}\/\d{2}\/\d{4})/,
  /(\d{1,2}\/\d{1,2}\/\d{4})/,
]

export function identifyEmailSender(sender) {
  if (!sender) return null
  for (const rule of EMAIL_SENDER_PATTERNS) {
    if (rule.pattern.test(sender)) {
      return { merchant: rule.merchant, parser: rule.parser }
    }
  }
  return null
}

export function extractAmountFromEmail(body) {
  if (!body) return null
  for (const pattern of AMOUNT_PATTERNS) {
    const match = body.match(pattern)
    if (match) {
      const amount = Number(match[1].replace(/,/g, ''))
      if (amount > 0) return amount
    }
  }
  return null
}

export function extractDateFromEmail(body, dateHeader) {
  if (dateHeader) {
    const d = new Date(dateHeader)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  if (!body) return new Date().toISOString().slice(0, 10)
  for (const pattern of DATE_PATTERNS) {
    const match = body.match(pattern)
    if (match) {
      const d = new Date(match[1])
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
  }
  return new Date().toISOString().slice(0, 10)
}

export function extractOrderNumber(body) {
  if (!body) return null
  const match = body.match(/(?:order|invoice|receipt|transaction)\s*(?:id|no|number|#)?\s*[:#]?\s*([A-Z0-9-]{6,30})/i)
  return match ? match[1] : null
}

export function parseTransactionalEmail(email) {
  const { sender, subject, body, dateReceived } = email
  const senderInfo = identifyEmailSender(sender)

  if (!senderInfo) {
    const promotional = /unsubscribe|promo|offer|deal|sale|newsletter/i.test(subject || '')
    if (promotional) return null
    return null
  }

  const amount = extractAmountFromEmail(body)
  if (!amount) return null

  const date = extractDateFromEmail(body, dateReceived)
  const orderNumber = extractOrderNumber(body)

  return {
    merchant: senderInfo.merchant,
    amount,
    date,
    note: senderInfo.merchant,
    source: 'email',
    sourceDetails: { sender, subject, orderNumber },
    confidence: 0.75
  }
}

export function parseEmailBatch(emails) {
  const results = []
  for (const email of emails) {
    const parsed = parseTransactionalEmail(email)
    if (parsed) results.push(parsed)
  }
  return results
}
