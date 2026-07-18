import { describe, test, expect } from 'vitest'
import {
  BANKS,
  findBankBySenderId,
  findBankByName,
  getBankById,
  getAllSenderIds,
  inferAccountType,
  isDigitalWallet
} from '../src/lib/banks.js'

const commercialBankIds = [
  'amana-bank',
  'bank-of-ceylon',
  'bank-of-china',
  'cargills-bank',
  'citibank',
  'commercial-bank',
  'deutsche-bank',
  'dfcc-bank',
  'habib-bank',
  'hatton-national-bank',
  'indian-bank',
  'indian-overseas-bank',
  'mcb-bank',
  'national-development-bank',
  'nations-trust-bank',
  'pan-asia-bank',
  'peoples-bank',
  'public-bank',
  'sampath-bank',
  'seylan-bank',
  'standard-chartered',
  'state-bank-of-india',
  'hsbc',
  'union-bank'
]

const specialisedBankIds = [
  'hdfc',
  'national-savings-bank',
  'pradeshiya-sanwardhana-bank',
  'sanasa-development-bank',
  'sri-lanka-savings-bank',
  'state-mortgage-investment-bank'
]

const walletIds = [
  'frimi',
  'genie',
  'boc-smartpay',
  'ndb-neos',
  'dialog-ez-cash',
  'mobitel-mcash',
  'hutch'
]

describe('BANKS data', () => {
  test('includes all 24 licensed commercial banks', () => {
    const commercial = BANKS.filter(b => b.type === 'bank' || b.type === 'foreign')
    expect(commercial).toHaveLength(24)
    commercialBankIds.forEach(id => {
      expect(BANKS.some(b => b.id === id)).toBe(true)
    })
  })

  test('includes all 6 licensed specialised banks', () => {
    const specialised = BANKS.filter(b => b.type === 'specialized')
    expect(specialised).toHaveLength(6)
    specialisedBankIds.forEach(id => {
      expect(BANKS.some(b => b.id === id)).toBe(true)
    })
  })

  test('includes all digital wallets', () => {
    walletIds.forEach(id => {
      expect(BANKS.some(b => b.id === id)).toBe(true)
    })
  })

  test('every bank entry has required fields', () => {
    for (const b of BANKS) {
      expect(b.id).toBeTruthy()
      expect(b.name).toBeTruthy()
      expect(b.type).toMatch(/^(bank|specialized|wallet|digital|foreign)$/)
      expect(b.defaultAccountType).toMatch(/^(bank|wallet|credit|savings|digital)$/)
      expect(Array.isArray(b.shortNames)).toBe(true)
      expect(b.shortNames.length).toBeGreaterThan(0)
      expect(Array.isArray(b.senderIds)).toBe(true)
      expect(b.senderIds.length).toBeGreaterThan(0)
      expect(Array.isArray(b.aliases)).toBe(true)
    }
  })
})

describe('findBankBySenderId', () => {
  test('matches known sender IDs', () => {
    expect(findBankBySenderId('COMBANK').id).toBe('commercial-bank')
    expect(findBankBySenderId('SAMPATH').id).toBe('sampath-bank')
    expect(findBankBySenderId('HNB').id).toBe('hatton-national-bank')
    expect(findBankBySenderId('BOC').id).toBe('bank-of-ceylon')
    expect(findBankBySenderId('FRIMI').id).toBe('frimi')
    expect(findBankBySenderId('GENIE').id).toBe('genie')
    expect(findBankBySenderId('DIALOG').id).toBe('dialog-ez-cash')
  })

  test('matches partial and normalized sender IDs', () => {
    expect(findBankBySenderId('COMBK').id).toBe('commercial-bank')
    expect(findBankBySenderId('combank').id).toBe('commercial-bank')
    expect(findBankBySenderId('EZCASH').id).toBe('dialog-ez-cash')
  })

  test('returns null for unrecognized sender IDs', () => {
    expect(findBankBySenderId('UNKNOWN')).toBeNull()
    expect(findBankBySenderId('XYZ123')).toBeNull()
    expect(findBankBySenderId('')).toBeNull()
    expect(findBankBySenderId(null)).toBeNull()
  })
})

describe('findBankByName', () => {
  test('matches bank name variations', () => {
    expect(findBankByName('ComBank').id).toBe('commercial-bank')
    expect(findBankByName('Commercial Bank').id).toBe('commercial-bank')
    expect(findBankByName('commercial').id).toBe('commercial-bank')
    expect(findBankByName('Sampath').id).toBe('sampath-bank')
    expect(findBankByName('HNB').id).toBe('hatton-national-bank')
  })

  test('matches app and wallet aliases', () => {
    expect(findBankByName('Sampath Vishwa').id).toBe('sampath-bank')
    expect(findBankByName('HNB SOLO').id).toBe('hatton-national-bank')
    expect(findBankByName('HNB app').id).toBe('hatton-national-bank')
    expect(findBankByName('Commercial Bank app').id).toBe('commercial-bank')
    expect(findBankByName('NDB Neos').id).toBe('ndb-neos')
    expect(findBankByName('BOC SmartPay').id).toBe('boc-smartpay')
    expect(findBankByName('eZ Cash').id).toBe('dialog-ez-cash')
  })

  test('returns null for unrecognized names', () => {
    expect(findBankByName('Acme Bank')).toBeNull()
    expect(findBankByName('Totally Unknown')).toBeNull()
  })
})

describe('getBankById', () => {
  test('returns exact match', () => {
    const bank = getBankById('commercial-bank')
    expect(bank).not.toBeNull()
    expect(bank.id).toBe('commercial-bank')
    expect(bank.name).toBe('Commercial Bank of Ceylon PLC')
  })

  test('returns null for unknown id', () => {
    expect(getBankById('no-such-bank')).toBeNull()
  })
})

describe('getAllSenderIds', () => {
  test('returns a non-empty array of unique strings', () => {
    const ids = getAllSenderIds()
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every(id => typeof id === 'string')).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('inferAccountType', () => {
  test('returns correct types for bank, wallet, digital, and savings', () => {
    expect(inferAccountType('commercial-bank')).toBe('bank')
    expect(inferAccountType('frimi')).toBe('wallet')
    expect(inferAccountType('genie')).toBe('wallet')
    expect(inferAccountType('ndb-neos')).toBe('digital')
    expect(inferAccountType('boc-smartpay')).toBe('digital')
    expect(inferAccountType('national-savings-bank')).toBe('savings')
  })
})

describe('isDigitalWallet', () => {
  test('returns true for wallets and false for banks', () => {
    expect(isDigitalWallet('frimi')).toBe(true)
    expect(isDigitalWallet('genie')).toBe(true)
    expect(isDigitalWallet('boc-smartpay')).toBe(true)
    expect(isDigitalWallet('ndb-neos')).toBe(true)
    expect(isDigitalWallet('commercial-bank')).toBe(false)
    expect(isDigitalWallet('bank-of-ceylon')).toBe(false)
  })
})

describe('merged institutions', () => {
  test('HSBC lookup returns merged info or Nations Trust Bank', () => {
    const hsbc = findBankByName('HSBC')
    expect(hsbc).not.toBeNull()
    expect(['hsbc', 'nations-trust-bank'].includes(hsbc.id)).toBe(true)
    if (hsbc.id === 'hsbc') {
      expect(hsbc.mergedInto).toBe('nations-trust-bank')
    }
  })

  test('NSB and Sri Lanka Savings Bank reference each other', () => {
    const nsb = getBankById('national-savings-bank')
    const slsb = getBankById('sri-lanka-savings-bank')
    expect(nsb.mergedWith).toBe('sri-lanka-savings-bank')
    expect(slsb.mergedWith).toBe('national-savings-bank')
  })
})
