const MERCHANT_RULES = [
  { pattern: /uber/i, category: 'cat-transport', merchant: 'Uber' },
  { pattern: /pickup?|taxi|cab/i, category: 'cat-transport', merchant: 'Taxi' },
  { pattern: /bus|train|metro|transit|railway/i, category: 'cat-transport', merchant: 'Public Transport' },
  { pattern: /fuel|petrol|gasoline|shell|ceypetco|lanka ?ioc|indian ?oil|hpcl|bharat ?petroleum/i, category: 'cat-fuel', merchant: 'Fuel Station' },
  { pattern: /parking/i, category: 'cat-transport', merchant: 'Parking' },
  { pattern: /olacabs|ola ?cabs/i, category: 'cat-transport', merchant: 'Ola' },
  { pattern: /lyft/i, category: 'cat-transport', merchant: 'Lyft' },
  { pattern: /grab/i, category: 'cat-transport', merchant: 'Grab' },
  { pattern: /pickme|pick ?me/i, category: 'cat-transport', merchant: 'PickMe' },

  { pattern: /swiggy/i, category: 'cat-food', merchant: 'Swiggy' },
  { pattern: /zomato/i, category: 'cat-food', merchant: 'Zomato' },
  { pattern: /dominos|pizza ?hut|papa ?john/i, category: 'cat-food', merchant: 'Pizza' },
  { pattern: /mcdonald|kfc|burger ?king|subway|taco ?bell|wendy/i, category: 'cat-food', merchant: 'Fast Food' },
  { pattern: /starbucks|coffee|cafe|barista| costa/i, category: 'cat-food', merchant: 'Coffee Shop' },
  { pattern: /restaurant|dining|dinner|lunch|eatery|grill|bistro|kitchen|hotel.*dining/i, category: 'cat-food', merchant: 'Restaurant' },
  { pattern: /foodpanda|deliveroo|uber ?eats|doordash|grubhub/i, category: 'cat-food', merchant: 'Food Delivery' },
  { pattern: /keells|cargills|arpico|laughing|supermarket|grocery|wet ?market/i, category: 'cat-groceries', merchant: 'Grocery Store' },
  { pattern: /bake|bakery|bread|cake|pastry/i, category: 'cat-food', merchant: 'Bakery' },

  { pattern: /amazon|amzn/i, category: 'cat-shopping', merchant: 'Amazon' },
  { pattern: /flipkart/i, category: 'cat-shopping', merchant: 'Flipkart' },
  { pattern: /ebay/i, category: 'cat-shopping', merchant: 'eBay' },
  { pattern: /daraz/i, category: 'cat-shopping', merchant: 'Daraz' },
  { pattern: /aliexpress|alibaba/i, category: 'cat-shopping', merchant: 'AliExpress' },
  { pattern: /walmart|target|costco|ikea/i, category: 'cat-shopping', merchant: 'Retail Store' },
  { pattern: /etsy/i, category: 'cat-shopping', merchant: 'Etsy' },
  { pattern: /shop|store|boutique|apparel|clothing|fashion/i, category: 'cat-shopping', merchant: 'Shopping' },

  { pattern: /netflix/i, category: 'cat-entertainment', merchant: 'Netflix' },
  { pattern: /spotify/i, category: 'cat-entertainment', merchant: 'Spotify' },
  { pattern: /hulu|disney|hbo|max|prime ?video/i, category: 'cat-entertainment', merchant: 'Streaming' },
  { pattern: /cinema|movie|theater|theatre|pvr|inox/i, category: 'cat-entertainment', merchant: 'Cinema' },
  { pattern: /game|steam|playstation|xbox|nintendo/i, category: 'cat-entertainment', merchant: 'Gaming' },
  { pattern: /concert|ticket|eventbrite/i, category: 'cat-entertainment', merchant: 'Events' },

  { pattern: /rent|mortgage|landlord/i, category: 'cat-rent', merchant: 'Rent' },
  { pattern: /electric|electricity|ceb|lec ?bill/i, category: 'cat-bills', merchant: 'Electricity' },
  { pattern: /water ?bill|water ?board/i, category: 'cat-bills', merchant: 'Water' },
  { pattern: /gas ?bill|lpg|indane|bharat ?gas/i, category: 'cat-bills', merchant: 'Gas' },
  { pattern: /internet|broadband|fiber|slt|dialog|mobitel|hutch|airtel/i, category: 'cat-bills', merchant: 'Internet/Phone' },
  { pattern: /mobile ?bill|phone ?bill|postpaid/i, category: 'cat-bills', merchant: 'Phone Bill' },
  { pattern: /insurance|allianz|cigna|aia|srilanka ?insurance/i, category: 'cat-insurance', merchant: 'Insurance' },
  { pattern: /maintenance|society|hoa|condo/i, category: 'cat-bills', merchant: 'Maintenance' },

  { pattern: /hospital|clinic|medical|pharmacy|drug ?store|health/i, category: 'cat-health', merchant: 'Medical' },
  { pattern: /doctor|dental|dentist|optician|eye/i, category: 'cat-health', merchant: 'Healthcare' },
  { pattern: /gym|fitness|yoga|pilates/i, category: 'cat-health', merchant: 'Fitness' },
  { pattern: /medicine|tablet|prescription/i, category: 'cat-health', merchant: 'Pharmacy' },

  { pattern: /school|college|university|tuition|exam|fee/i, category: 'cat-education', merchant: 'Education' },
  { pattern: /course|udemy|coursera|edx|skillshare/i, category: 'cat-education', merchant: 'Online Course' },
  { pattern: /book|stationery|notebook/i, category: 'cat-education', merchant: 'Books' },

  { pattern: /flight|airline|air ?ticket|emirates|qatar|sri ?lankan|air ?india|indigo|spice ?jet/i, category: 'cat-travel', merchant: 'Flight' },
  { pattern: /hotel|booking\.com|agoda|airbnb|hostel|resort/i, category: 'cat-travel', merchant: 'Hotel' },
  { pattern: /visa|passport|travel ?insurance/i, category: 'cat-travel', merchant: 'Travel' },

  { pattern: /gift|present|bouquet/i, category: 'cat-gifts', merchant: 'Gift' },
  { pattern: /donat|charity|temple|church|mosque|fund/i, category: 'cat-donations', merchant: 'Donation' },

  { pattern: /salon|barber|beauty|spa|nail|haircut|cosmetic/i, category: 'cat-personal', merchant: 'Personal Care' },
  { pattern: /laundry|dry ?clean/i, category: 'cat-personal', merchant: 'Laundry' },

  { pattern: /pet|vet|kennel/i, category: 'cat-pets', merchant: 'Pet Care' },

  { pattern: /netflix|spotify|prime|hulu|disney|iCloud|google ?one|dropbox|office ?365|adobe/i, category: 'cat-subscriptions', merchant: 'Subscription' },
  { pattern: /amazon ?prime|youtube ?premium|apple ?music|deezer/i, category: 'cat-subscriptions', merchant: 'Streaming Subscription' },

  { pattern: /salary|payroll|wage|compensation/i, category: 'cat-salary', merchant: 'Salary', type: 'income' },
  { pattern: /freelance|consulting|contract ?work/i, category: 'cat-freelance', merchant: 'Freelance', type: 'income' },
  { pattern: /refund|cashback|reversal|return/i, category: 'cat-refunds', merchant: 'Refund', type: 'income' },
  { pattern: /interest|savings ?interest|fd ?interest/i, category: 'cat-interest', merchant: 'Interest', type: 'income' },
  { pattern: /dividend|stock|share|mf|mutual ?fund/i, category: 'cat-dividends', merchant: 'Dividend', type: 'income' },

  { pattern: /atm ?withdraw|cash ?withdraw|withdrawal/i, category: 'cat-transfer', merchant: 'ATM Withdrawal', type: 'transfer' },
  { pattern: /transfer|neft|rtgs|imps|upi|wire/i, category: 'cat-transfer', merchant: 'Transfer', type: 'transfer' },
  { pattern: /deposit|topup|top-?up|recharge/i, category: 'cat-transfer', merchant: 'Deposit', type: 'transfer' },

  { pattern: /investment|stock|bond|mf|mutual ?fund|sip|etf/i, category: 'cat-investments', merchant: 'Investment' },
]

export const LEARNED_MERCHANTS = new Map()

function normalizeMerchant(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function loadLearnedMerchants() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('learnedMerchants')
      if (stored) {
        const data = JSON.parse(stored)
        Object.entries(data).forEach(([key, value]) => {
          LEARNED_MERCHANTS.set(key, value)
        })
      }
    }
  } catch (e) {}
}

loadLearnedMerchants()

const KEYWORD_FALLBACKS = {
  'cat-transport': [new RegExp('\\b(taxi|cab|bus|train|metro|subway|railway|transit|parking|pickup|rickshaw|tuk)\\b', 'i'), new RegExp('\\b(uber|ola|lyft|grab|pickme)\\b', 'i')],
  'cat-fuel': [new RegExp('\\b(petrol|diesel|gasoline|fuel|gas station|shell|ceypetco|lanka ioc|hpcl|bpcl)\\b', 'i')],
  'cat-food': [new RegExp('\\b(food|restaurant|dining|lunch|dinner|breakfast|cafe|coffee|pizza|burger|fast food|biryani|dosa|kottu|hoppers|bakery)\\b', 'i')],
  'cat-groceries': [new RegExp('\\b(grocery|supermarket|keells|cargills|arpico|laughing|vegetable|fruit|meat|fish market)\\b', 'i')],
  'cat-shopping': [new RegExp('\\b(shopping|clothes|fashion|apparel|shoes|mall|retail|boutique|store)\\b', 'i')],
  'cat-bills': [new RegExp('\\b(electricity|water bill|internet|broadband|phone bill|mobile bill|postpaid|dialog|slt|mobitel|hutch|airtel|bill payment)\\b', 'i')],
  'cat-entertainment': [new RegExp('\\b(movie|cinema|theatre|theater|netflix|spotify|concert|event|game|gaming|streaming)\\b', 'i')],
  'cat-travel': [new RegExp('\\b(hotel|booking|airbnb|flight|air ticket|travel|visa|resort|tour|trip)\\b', 'i')],
  'cat-health': [new RegExp('\\b(hospital|clinic|pharmacy|medicine|doctor|dental|medical|healthcare|gym|fitness)\\b', 'i')],
  'cat-education': [new RegExp('\\b(school|college|university|tuition|course|book|stationery|exam|fee|udemy|coursera)\\b', 'i')],
  'cat-subscriptions': [new RegExp('\\b(subscription|monthly|recurring|membership|icloud|google one|adobe|office 365)\\b', 'i')],
  'cat-gifts': [new RegExp('\\b(gift|present|bouquet|flower)\\b', 'i')],
  'cat-donations': [new RegExp('\\b(donation|charity|temple|church|mosque|fund|relief)\\b', 'i')],
  'cat-personal': [new RegExp('\\b(salon|spa|beauty|haircut|cosmetic|laundry|dry clean)\\b', 'i')],
  'cat-pets': [new RegExp('\\b(pet|vet|kennel|dog|cat food)\\b', 'i')],
  'cat-investments': [new RegExp('\\b(investment|stock|mutual fund|sip|etf|bond|fixed deposit|fd)\\b', 'i')],
  'cat-salary': [new RegExp('\\b(salary|payroll|wage|pay day|pay slip)\\b', 'i')],
  'cat-freelance': [new RegExp('\\b(freelance|consulting|contract|invoice|client payment)\\b', 'i')],
  'cat-refunds': [new RegExp('\\b(refund|cashback|reversal|return)\\b', 'i')],
  'cat-transfer': [new RegExp('\\b(transfer|withdrawal|atm|neft|rtgs|imps|upi|deposit|topup|top-up)\\b', 'i')]
}

const CATEGORY_FALLBACKS = {
  expense: 'cat-other',
  income: 'cat-salary',
  transfer: 'cat-transfer'
}

export function learnMerchantCategory(text, categoryId) {
  if (!text || !categoryId) return
  const normalized = normalizeMerchant(text)
  LEARNED_MERCHANTS.set(normalized, categoryId)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('learnedMerchants', JSON.stringify(Object.fromEntries(LEARNED_MERCHANTS)))
    }
  } catch (e) {}
}

export function guessCategoryByKeywords(text, type = 'expense') {
  if (!text) return null
  const lower = text.toLowerCase()
  let best = null
  let bestScore = 0
  for (const [catId, patterns] of Object.entries(KEYWORD_FALLBACKS)) {
    for (const pattern of patterns) {
      const globalPattern = new RegExp(pattern.source, 'gi')
      const allMatches = [...lower.matchAll(globalPattern)]
      if (allMatches.length > 0) {
        const score = allMatches.length
        if (score > bestScore) {
          bestScore = score
          best = catId
        }
      }
    }
  }
  // For income, only allow income categories; otherwise pick a default.
  if (type === 'income') {
    return best && ['cat-salary', 'cat-freelance', 'cat-refunds', 'cat-interest', 'cat-dividends', 'cat-cashback'].includes(best) ? best : 'cat-salary'
  }
  if (type === 'transfer') return 'cat-transfer'
  return best
}

export function matchMerchant(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(lower)) {
      return {
        categoryId: rule.category,
        merchant: rule.merchant,
        type: rule.type || 'expense',
        confidence: 0.85,
        source: 'merchant-rule'
      }
    }
  }
  return null
}

export function autoCategorize(transaction) {
  const text = [transaction.note, transaction.merchant, transaction.description]
    .filter(Boolean)
    .join(' ')
  const match = matchMerchant(text)
  if (match) {
    return {
      ...transaction,
      categoryId: match.categoryId,
      type: match.type,
      merchant: match.merchant,
      autoCategorized: true,
      categorizationConfidence: match.confidence
    }
  }

  const learnedKey = normalizeMerchant(transaction.merchant || text)
  const learnedCategory = LEARNED_MERCHANTS.get(learnedKey)
  if (learnedCategory) {
    return {
      ...transaction,
      categoryId: learnedCategory,
      merchant: transaction.merchant || 'Unknown',
      autoCategorized: true,
      categorizationConfidence: 0.7
    }
  }

  const keywordCategory = guessCategoryByKeywords(text, transaction.type)
  if (keywordCategory) {
    return {
      ...transaction,
      categoryId: keywordCategory,
      merchant: transaction.merchant || 'Unknown',
      autoCategorized: true,
      categorizationConfidence: 0.55
    }
  }

  const fallback = CATEGORY_FALLBACKS[transaction.type] || 'cat-other'
  return {
    ...transaction,
    categoryId: fallback,
    merchant: transaction.merchant || 'Unknown',
    autoCategorized: true,
    categorizationConfidence: transaction.type === 'expense' ? 0.3 : 0.55,
    ...(transaction.type === 'expense' && fallback === 'cat-other' ? { needsReview: true } : {})
  }
}

export function getMerchantRules() {
  return MERCHANT_RULES
}

export { MERCHANT_RULES }
