let _idCounter = 0;
function generateId() {
  _idCounter += 1;
  return `tx_${Date.now()}_${_idCounter}`;
}

export const TRANSFER_KEYWORDS = [
  'transferred',
  'transfer',
  'sent to',
  'send to',
  'neft',
  'imps',
  'upi transfer',
  'upi id',
  'credit to own account',
  'moved from',
  'between accounts',
  'to a/c',
  'to card',
  'to account',
  'from a/c',
  'from card',
  'from account',
  'to vpa',
  'from vpa',
  'paid to',
  'received from',
  'debited to',
  'credited to',
  'credited by',
  'debit to',
];

export const OUTGOING_KEYWORDS = [
  'debited',
  'sent to',
  'send to',
  'transferred to',
  'transfer to',
  'paid to',
  'moved from',
  'debit to',
  'to a/c',
  'to account',
  'to card',
  'to vpa',
];

export const INCOMING_KEYWORDS = [
  'credited',
  'received from',
  'transferred from',
  'transfer from',
  'credited by',
  'credit to',
  'from a/c',
  'from account',
  'from card',
  'from vpa',
];

export function isTransferKeyword(text) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return TRANSFER_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

export function extractDestinationHint(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();

  const patterns = [
    /(?:to|from)\s+(?:a\/c|ac|account)\s*(?:no\.?|number)?\s*[xX]*\s*(\d{4,})/,
    /(?:to|from)\s+(?:card\s+(?:ending|ending\s+with)?)\s*(\d{4,})/,
    /(?:to|from)\s+(?:card)\s*(\d{4,})/,
    /(?:to|from)\s+(?:a\/c|ac|account)\s*[xX]*\s*(\d{4,})/,
    /(?:to|from)\s+(?:vpa|upi\s+id)\s+([\w.\-_@]+)/,
    /(?:ending\s+(?:with)?)\s*(\d{4,})/,
    /(?:xx\s*(\d{4,}))/,
    /(?:x\s*(\d{4,}))/,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const fallback = lower.match(/(?:to|from)\s+(?:a\/c|ac|account|card)\s+([\w\s]+?)(?:\.|\s+for|\s+on\s+|\s+with\s+|$)/);
  if (fallback && fallback[1]) {
    return fallback[1].trim();
  }

  return null;
}

function normalizeHint(hint) {
  return String(hint).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findAccountByHint(accounts, hint) {
  if (!hint || !accounts?.length) return null;
  const normalizedHint = normalizeHint(hint);
  const last4 = normalizedHint.slice(-4);

  return accounts.find((acc) => {
    if (!acc) return false;
    if (acc.accountNumberHint) {
      const normalizedAcc = normalizeHint(acc.accountNumberHint);
      if (normalizedAcc === normalizedHint) return true;
      if (normalizedAcc.endsWith(last4) && last4.length === 4) return true;
      if (normalizedHint.includes(normalizedAcc)) return true;
    }
    if (acc.name) {
      const normalizedName = normalizeHint(acc.name);
      if (normalizedName === normalizedHint) return true;
    }
    if (acc.bankId) {
      const normalizedBank = normalizeHint(acc.bankId);
      if (normalizedBank === normalizedHint) return true;
    }
    return false;
  }) || null;
}

function determineDirection(text) {
  const lower = String(text).toLowerCase();
  const outgoing = OUTGOING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  const incoming = INCOMING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));

  if (outgoing && !incoming) return 'outgoing';
  if (incoming && !outgoing) return 'incoming';
  if (outgoing && incoming) return lower.search(new RegExp(OUTGOING_KEYWORDS.join('|'), 'i')) < lower.search(new RegExp(INCOMING_KEYWORDS.join('|'), 'i')) ? 'outgoing' : 'incoming';
  return 'unknown';
}

export function detectTransferIntent(sms, matchedAccountId, accounts) {
  const result = {
    isTransfer: false,
    confidence: 'none',
    sourceAccountId: null,
    destinationAccountId: null,
    direction: 'unknown',
    pairedSmsId: null,
    note: null,
  };

  if (!sms?.body) return result;

  const body = String(sms.body);
  if (!isTransferKeyword(body)) return result;

  const direction = determineDirection(body);
  result.direction = direction;

  const destinationHint = extractDestinationHint(body);
  const matchedAccount = accounts?.find((a) => a.id === matchedAccountId) || null;
  const destinationAccount = findAccountByHint(accounts, destinationHint);

  if (destinationAccount) {
    result.isTransfer = true;
    result.confidence = 'high';
    if (direction === 'outgoing') {
      result.sourceAccountId = matchedAccountId;
      result.destinationAccountId = destinationAccount.id;
    } else if (direction === 'incoming') {
      result.sourceAccountId = destinationAccount.id;
      result.destinationAccountId = matchedAccountId;
    } else {
      result.sourceAccountId = matchedAccountId;
      result.destinationAccountId = destinationAccount.id;
    }
    result.note = destinationHint ? `Transfer to own account (hint: ${destinationHint})` : 'Internal transfer between own accounts';
  } else {
    result.isTransfer = false;
    result.confidence = 'none';
  }

  return result;
}

export function findTransferPair(outgoingTx, incomingTx, options = {}) {
  const result = { isPair: false, confidence: 'low' };

  if (!outgoingTx || !incomingTx) return result;
  if (outgoingTx.type === incomingTx.type && outgoingTx.type === 'transfer') return result;

  const outAmount = Math.abs(Number(outgoingTx.amount || 0));
  const inAmount = Math.abs(Number(incomingTx.amount || 0));
  if (!outAmount || !inAmount) return result;

  const tolerance = options.amountTolerance ?? 0.02;
  const maxDiff = Math.max(outAmount, inAmount) * tolerance;
  if (Math.abs(outAmount - inAmount) > maxDiff) return result;

  const outDate = new Date(outgoingTx.date || outgoingTx.createdAt || 0).getTime();
  const inDate = new Date(incomingTx.date || incomingTx.createdAt || 0).getTime();
  if (!outDate || !inDate) return result;

  const hoursMs = (options.hoursThreshold ?? 24) * 60 * 60 * 1000;
  if (Math.abs(outDate - inDate) > hoursMs) return result;

  const sourceMatch =
    outgoingTx.accountId === incomingTx.transferTo ||
    outgoingTx.transferTo === incomingTx.accountId ||
    outgoingTx.accountId === incomingTx.accountId ||
    outgoingTx.transferTo === incomingTx.transferTo;
  if (!sourceMatch) return result;

  const outNote = String(outgoingTx.note || outgoingTx.description || '').toLowerCase();
  const inNote = String(incomingTx.note || incomingTx.description || '').toLowerCase();
  const keywordMatch = isTransferKeyword(outNote) || isTransferKeyword(inNote) ||
    outgoingTx.type === 'transfer' || incomingTx.type === 'transfer';
  if (!keywordMatch) return result;

  result.isPair = true;
  result.confidence = 'high';

  if (outgoingTx.bankId && incomingTx.bankId && outgoingTx.bankId === incomingTx.bankId) {
    result.confidence = 'high';
  } else if (outgoingTx.address && incomingTx.address && outgoingTx.address === incomingTx.address) {
    result.confidence = 'high';
  } else if (outgoingTx.merchant || incomingTx.merchant) {
    result.confidence = 'medium';
  }

  return result;
}

function extractAmountFromSms(body) {
  const match = String(body).match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
}

export function createInternalTransferTransaction(sms, matchResult, transferResult) {
  const amount = matchResult?.amount ?? extractAmountFromSms(sms?.body);
  const date = sms?.date ? new Date(sms.date) : new Date();

  const tx = {
    id: generateId(),
    type: 'transfer',
    accountId: transferResult.sourceAccountId,
    transferTo: transferResult.destinationAccountId,
    amount: Math.abs(Number(amount)),
    date: date.toISOString(),
    note: transferResult.note || (sms?.body ? `Transfer: ${sms.body.slice(0, 100)}` : 'Internal transfer'),
    tags: ['sms-import', 'transfer'],
    needsReview: transferResult.confidence !== 'high',
    smsId: sms?.id || null,
    pairedSmsId: transferResult.pairedSmsId || null,
  };

  return tx;
}

export function reconcileTransferTransactions(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const result = [];
  const used = new Set();

  for (let i = 0; i < transactions.length; i++) {
    if (used.has(i)) continue;
    const tx = transactions[i];

    if (tx.type === 'transfer') {
      result.push(tx);
      used.add(i);
      continue;
    }

    let pairedIndex = -1;
    for (let j = 0; j < transactions.length; j++) {
      if (i === j || used.has(j)) continue;
      const candidate = transactions[j];

      const outTx = tx.amount >= 0 ? tx : candidate;
      const inTx = tx.amount >= 0 ? candidate : tx;
      const pair = findTransferPair(outTx, inTx);

      if (pair.isPair && pair.confidence !== 'low') {
        pairedIndex = j;
        break;
      }
    }

    if (pairedIndex >= 0) {
      const other = transactions[pairedIndex];
      const outTx = Number(tx.amount) >= 0 ? tx : other;
      const inTx = Number(tx.amount) >= 0 ? other : tx;

      const merged = {
        id: tx.id || generateId(),
        type: 'transfer',
        accountId: inTx.accountId,
        transferTo: outTx.accountId,
        amount: Math.abs(Number(outTx.amount)),
        date: inTx.date || tx.date,
        note: `Transfer from ${inTx.accountId} to ${outTx.accountId}`,
        tags: ['sms-import', 'transfer'],
        needsReview: false,
        mergedFrom: [tx.id, other.id].filter(Boolean),
      };
      result.push(merged);
      used.add(i);
      used.add(pairedIndex);
    } else {
      result.push(tx);
      used.add(i);
    }
  }

  return result;
}
