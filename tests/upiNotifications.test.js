import { describe, it, expect } from 'vitest'
import { parsePaymentNotification } from '../src/lib/upiNotifications'

describe('UPI Notification Parser', () => {
  it('parses Google Pay paid notification', () => {
    const result = parsePaymentNotification(
      'Google Pay',
      'Paid ₹500.00 to KEELLS SUPER MARKET'
    )
    expect(result).not.toBeNull()
    expect(result.amount).toBe(500)
    expect(result.type).toBe('expense')
    expect(result.merchant).toBe('KEELLS SUPER MARKET')
  })

  it('parses PhonePe received notification', () => {
    const result = parsePaymentNotification(
      'PhonePe',
      'Received ₹1000.00 from JOHN DOE'
    )
    expect(result).not.toBeNull()
    expect(result.amount).toBe(1000)
    expect(result.type).toBe('income')
  })

  it('parses LKR amount', () => {
    const result = parsePaymentNotification(
      'Bank',
      'LKR 2,500.00 paid to CARGILLS'
    )
    expect(result).not.toBeNull()
    expect(result.amount).toBe(2500)
    expect(result.type).toBe('expense')
  })

  it('parses Rs. amount with debited', () => {
    const result = parsePaymentNotification(
      'HDFC Bank',
      'Rs. 750.00 debited from account'
    )
    expect(result).not.toBeNull()
    expect(result.amount).toBe(750)
    expect(result.type).toBe('expense')
  })

  it('parses credited notification', () => {
    const result = parsePaymentNotification(
      'SBI',
      'Rs. 5000.00 credited to your account'
    )
    expect(result).not.toBeNull()
    expect(result.type).toBe('income')
  })

  it('returns null for non-payment notification', () => {
    const result = parsePaymentNotification(
      'Google Pay',
      'Check out our new rewards program!'
    )
    expect(result).toBeNull()
  })

  it('returns null for empty text', () => {
    const result = parsePaymentNotification('', '')
    expect(result).toBeNull()
  })

  it('extracts merchant name from "to" pattern', () => {
    const result = parsePaymentNotification(
      'UPI',
      'Paid ₹250.00 to UBER TRIP'
    )
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('UBER TRIP')
  })

  it('extracts merchant name from "from" pattern', () => {
    const result = parsePaymentNotification(
      'UPI',
      'Received ₹2000.00 from ACME CORP'
    )
    expect(result).not.toBeNull()
    expect(result.merchant).toBe('ACME CORP')
  })
})
