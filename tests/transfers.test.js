import { describe, it, expect } from 'vitest';
import {
  TRANSFER_KEYWORDS,
  isTransferKeyword,
  extractDestinationHint,
  detectTransferIntent,
  findTransferPair,
  createInternalTransferTransaction,
  reconcileTransferTransactions,
} from '../src/lib/transfers.js';

describe('transfers module', () => {
  describe('isTransferKeyword', () => {
    it('returns true for transfer-related keywords', () => {
      expect(isTransferKeyword('Amount transferred')).toBe(true);
      expect(isTransferKeyword('sent to a/c')).toBe(true);
      expect(isTransferKeyword('NEFT processed')).toBe(true);
      expect(isTransferKeyword('UPI transfer done')).toBe(true);
    });

    it('returns false for generic payment terms', () => {
      expect(isTransferKeyword('paid for lunch')).toBe(false);
      expect(isTransferKeyword('purchase at store')).toBe(false);
    });
  });

  describe('extractDestinationHint', () => {
    it('extracts last 4 digits from "to a/c XX5678"', () => {
      const hint = extractDestinationHint('Rs 1000 transferred to a/c XX5678');
      expect(hint).toBe('5678');
    });

    it('extracts card ending hint', () => {
      expect(extractDestinationHint('sent to card ending 9876')).toBe('9876');
    });
  });

  describe('detectTransferIntent', () => {
    const accounts = [
      { id: 'acc_1', name: 'HDFC Savings', bankId: 'hdfc', accountNumberHint: '1234' },
      { id: 'acc_2', name: 'ICICI Savings', bankId: 'icici', accountNumberHint: '5678' },
    ];

    it('returns high-confidence internal transfer when destination is own account', () => {
      const sms = { body: 'Rs 5000 transferred to a/c XX5678', address: 'HDFCBK', date: '2024-01-01T10:00:00Z' };
      const result = detectTransferIntent(sms, 'acc_1', accounts);
      expect(result.isTransfer).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.sourceAccountId).toBe('acc_1');
      expect(result.destinationAccountId).toBe('acc_2');
      expect(result.direction).toBe('outgoing');
    });

    it('defaults to false when destination is external', () => {
      const sms = { body: 'Rs 5000 transferred to a/c XX9999', address: 'HDFCBK', date: '2024-01-01T10:00:00Z' };
      const result = detectTransferIntent(sms, 'acc_1', accounts);
      expect(result.isTransfer).toBe(false);
      expect(result.confidence).toBe('none');
    });

    it('returns false for non-transfer SMS such as merchant purchase', () => {
      const sms = { body: 'Rs 500 paid to merchant store', address: 'AMAZON', date: '2024-01-01T10:00:00Z' };
      const result = detectTransferIntent(sms, 'acc_1', accounts);
      expect(result.isTransfer).toBe(false);
    });
  });

  describe('findTransferPair', () => {
    it('returns true for matching outgoing/incoming pair', () => {
      const outgoing = {
        id: 't1',
        amount: 1000,
        date: '2024-01-01T10:00:00Z',
        accountId: 'acc_1',
        transferTo: null,
        type: 'expense',
        note: 'Transferred to acc_2',
      };
      const incoming = {
        id: 't2',
        amount: 1000,
        date: '2024-01-01T11:00:00Z',
        accountId: 'acc_2',
        transferTo: null,
        type: 'income',
        note: 'Received from acc_1',
      };
      const result = findTransferPair(outgoing, incoming);
      expect(result.isPair).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('returns false when amounts differ significantly', () => {
      const outgoing = { id: 't1', amount: 1000, date: '2024-01-01T10:00:00Z', accountId: 'acc_1', transferTo: null, type: 'expense', note: 'Transfer' };
      const incoming = { id: 't2', amount: 2000, date: '2024-01-01T11:00:00Z', accountId: 'acc_2', transferTo: null, type: 'income', note: 'Received' };
      const result = findTransferPair(outgoing, incoming);
      expect(result.isPair).toBe(false);
    });

    it('returns false when dates are too far apart', () => {
      const outgoing = { id: 't1', amount: 1000, date: '2024-01-01T10:00:00Z', accountId: 'acc_1', transferTo: null, type: 'expense', note: 'Transfer' };
      const incoming = { id: 't2', amount: 1000, date: '2024-01-05T10:00:00Z', accountId: 'acc_2', transferTo: null, type: 'income', note: 'Received' };
      const result = findTransferPair(outgoing, incoming);
      expect(result.isPair).toBe(false);
    });
  });

  describe('createInternalTransferTransaction', () => {
    it('creates a transfer transaction with correct fields', () => {
      const sms = { body: 'Rs 5000 transferred to a/c XX5678', date: '2024-01-01T10:00:00Z' };
      const matchResult = { amount: 5000 };
      const transferResult = {
        sourceAccountId: 'acc_1',
        destinationAccountId: 'acc_2',
        confidence: 'high',
        note: 'Transfer to own account',
      };
      const tx = createInternalTransferTransaction(sms, matchResult, transferResult);
      expect(tx.type).toBe('transfer');
      expect(tx.accountId).toBe('acc_1');
      expect(tx.transferTo).toBe('acc_2');
      expect(tx.amount).toBe(5000);
      expect(tx.tags).toEqual(['sms-import', 'transfer']);
      expect(tx.needsReview).toBe(false);
    });
  });

  describe('reconcileTransferTransactions', () => {
    it('merges two halves of an internal transfer into one transaction', () => {
      const tx1 = {
        id: 't1',
        amount: 1000,
        date: '2024-01-01T10:00:00Z',
        accountId: 'acc_1',
        transferTo: null,
        type: 'expense',
        note: 'Transferred to acc_2',
      };
      const tx2 = {
        id: 't2',
        amount: 1000,
        date: '2024-01-01T11:00:00Z',
        accountId: 'acc_2',
        transferTo: null,
        type: 'income',
        note: 'Received from acc_1',
      };
      const result = reconcileTransferTransactions([tx1, tx2]);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('transfer');
      expect(result[0].accountId).toBe('acc_2');
      expect(result[0].transferTo).toBe('acc_1');
      expect(result[0].amount).toBe(1000);
    });

    it('leaves unrelated transactions unchanged', () => {
      const tx1 = { id: 't1', amount: 1000, date: '2024-01-01T10:00:00Z', accountId: 'acc_1', type: 'expense', note: 'Lunch' };
      const tx2 = { id: 't2', amount: 50, date: '2024-01-02T10:00:00Z', accountId: 'acc_2', type: 'expense', note: 'Coffee' };
      const result = reconcileTransferTransactions([tx1, tx2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(tx1);
      expect(result[1]).toEqual(tx2);
    });
  });
});
