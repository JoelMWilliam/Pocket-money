import { describe, it, expect } from 'vitest'
import {
  identifyEmailSender,
  extractAmountFromEmail,
  extractDateFromEmail,
  parseTransactionalEmail
} from '../src/lib/emailParser'

describe('Email Parser', () => {
  it('identifies Amazon sender', () => {
    const result = identifyEmailSender('orders@amazon.in')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Amazon')
  })

  it('identifies Uber sender', () => {
    const result = identifyEmailSender('noreply@uber.com')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Uber')
  })

  it('identifies Netflix sender', () => {
    const result = identifyEmailSender('info@netflix.com')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Netflix')
  })

  it('identifies Sri Lankan bank sender', () => {
    const result = identifyEmailSender('alerts@commercialbank.lk')
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Bank')
  })

  it('returns null for unknown sender', () => {
    const result = identifyEmailSender('newsletter@random-blog.com')
    expect(result).toBeNull()
  })

  it('extracts amount with LKR prefix', () => {
    const result = extractAmountFromEmail('Total amount: LKR 5,250.00')
    expect(result).toBe(5250)
  })

  it('extracts amount with Rs prefix', () => {
    const result = extractAmountFromEmail('Amount paid Rs. 1500.00')
    expect(result).toBe(1500)
  })

  it('extracts amount with rupee symbol', () => {
    const result = extractAmountFromEmail('Charged: ₹ 2,500.00')
    expect(result).toBe(2500)
  })

  it('extracts amount after debited keyword', () => {
    const result = extractAmountFromEmail('Your card debited LKR 3,750.50')
    expect(result).toBe(3750.5)
  })

  it('returns null when no amount found', () => {
    const result = extractAmountFromEmail('Thank you for your order')
    expect(result).toBeNull()
  })

  it('extracts date from body', () => {
    const result = extractDateFromEmail('Order placed on 15 July 2026')
    expect(result).toMatch(/2026-07-1[45]/)
  })

  it('extracts date from header', () => {
    const result = extractDateFromEmail('', 'Mon, 15 Jul 2026 10:00:00 +0530')
    expect(result).toMatch(/2026-07-15/)
  })

  it('parses full transactional email', () => {
    const email = {
      sender: 'orders@amazon.in',
      subject: 'Your Amazon order confirmation',
      body: 'Order total: Rs. 2,499.00\nOrder date: 15 July 2026',
      dateReceived: 'Mon, 15 Jul 2026 12:00:00 +0530'
    }
    const result = parseTransactionalEmail(email)
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('Amazon')
    expect(result.amount).toBe(2499)
    expect(result.source).toBe('email')
  })

  it('returns null for promotional email', () => {
    const email = {
      sender: 'deals@unknown.com',
      subject: '50% off everything! Unsubscribe here',
      body: 'Limited time offer!',
      dateReceived: 'Mon, 15 Jul 2026 12:00:00 +0000'
    }
    const result = parseTransactionalEmail(email)
    expect(result).toBeNull()
  })

  it('returns null when no amount in email', () => {
    const email = {
      sender: 'orders@amazon.in',
      subject: 'Your order is shipping',
      body: 'Your order will arrive soon',
      dateReceived: 'Mon, 15 Jul 2026 12:00:00 +0000'
    }
    const result = parseTransactionalEmail(email)
    expect(result).toBeNull()
  })
})
