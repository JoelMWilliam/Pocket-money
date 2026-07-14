import { storageGet, storageSet } from './storage'

const KEY = 'llm-config'

export const DEFAULT_CONFIG = {
  provider: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: ''
}

export const PRESETS = {
  openai: { provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { provider: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama3-8b-8192' },
  ollama: { provider: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
  lmstudio: { provider: 'LM Studio', baseUrl: 'http://localhost:1234/v1', model: 'local-model' },
  custom: { provider: 'Custom', baseUrl: '', model: '' }
}

export async function getLLMConfig() {
  return storageGet(KEY, DEFAULT_CONFIG)
}

export async function setLLMConfig(config) {
  return storageSet(KEY, { ...DEFAULT_CONFIG, ...config })
}

function buildSummary(data) {
  const { settings, accounts, transactions, categories, budgets, goals, debts, investments, loans } = data
  const currency = settings?.currency || 'LKR'
  const currentMonth = new Date().toISOString().slice(0, 7)
  const income = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const expense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const topCategories = categories
    .map((c) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.categoryId === c.id && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      return { name: c.name, amount: spent }
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const budgetSummary = budgets.map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId)
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    return { category: cat?.name || 'Unknown', limit: b.amount, spent, remaining: Math.max(0, b.amount - spent) }
  })

  const recent = transactions.slice(0, 15).map((t) => ({
    date: t.date,
    type: t.type,
    amount: t.amount,
    category: categories.find((c) => c.id === t.categoryId)?.name,
    account: accounts.find((a) => a.id === t.accountId)?.name
  }))

  return {
    currency,
    totalBalance: accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
    currentMonth: { income, expense },
    accounts: accounts.map((a) => ({ name: a.name, balance: a.balance })),
    topCategories,
    budgets: budgetSummary,
    goals: goals.map((g) => ({ name: g.name, current: g.current, target: g.target })),
    debts: debts.map((d) => ({ name: d.name, balance: d.balance })),
    investments: investments.map((i) => ({ name: i.name, value: i.units * i.currentPrice })),
    loans: loans.map((l) => ({ name: l.name, balance: l.amount - l.repaid })),
    recentTransactions: recent
  }
}

async function createOpenAIClient(config) {
  const { baseUrl, model, apiKey } = { ...DEFAULT_CONFIG, ...config }
  const key = apiKey?.trim() || 'not-needed'
  const { default: OpenAI } = await import('openai')
  return new OpenAI({
    baseURL: baseUrl?.trim() || DEFAULT_CONFIG.baseUrl,
    apiKey: key,
    dangerouslyAllowBrowser: true
  })
}

export async function askAssistant({ config, data, messages }) {
  const openai = await createOpenAIClient(config)
  const summary = buildSummary(data)
  const systemPrompt = `You are a helpful, privacy-conscious wealth assistant for the Pocket Money app. The user keeps their data local-first. Use the following financial summary to answer. Do not guess beyond what is provided. Keep answers concise and actionable. Currency: ${summary.currency}.

Financial summary:
${JSON.stringify(summary, null, 2)}`

  const res = await openai.chat.completions.create({
    model: config.model?.trim() || DEFAULT_CONFIG.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ],
    temperature: 0.6,
    max_tokens: 800
  })

  return res.choices[0].message.content
}

export async function testLLMConnection(config) {
  const openai = await createOpenAIClient(config)
  const res = await openai.chat.completions.create({
    model: config.model?.trim() || DEFAULT_CONFIG.model,
    messages: [{ role: 'user', content: 'Say OK' }],
    max_tokens: 5
  })
  return res.choices[0].message.content
}
