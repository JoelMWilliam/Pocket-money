import { useState, useEffect, useRef } from 'react'
import { Send, X, Bot, Sparkles, SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getLLMConfig, setLLMConfig, askAssistant, testLLMConnection, DEFAULT_CONFIG, PRESETS } from '../lib/assistant'

const SUGGESTIONS = [
  'Analyze my spending',
  'Am I on track with my budgets?',
  'How can I save more?',
  'Summarize my net worth'
]

export default function Assistant({ setScreen }) {
  const data = useAppStore((state) => ({
    settings: state.settings,
    accounts: state.accounts,
    transactions: state.transactions,
    categories: state.categories,
    budgets: state.budgets,
    goals: state.goals,
    debts: state.debts,
    investments: state.investments,
    loans: state.loans
  }))

  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [showConfig, setShowConfig] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help you understand your finances. Ask me anything.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    getLLMConfig().then((c) => setConfig({ ...DEFAULT_CONFIG, ...c }))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isConfigured = Boolean(config.baseUrl?.trim() && config.model?.trim())

  const handleSaveConfig = async () => {
    await setLLMConfig(config)
    setShowConfig(false)
  }

  const handleSend = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed) return
    if (!isConfigured) {
      setError('Configure your LLM provider first.')
      return
    }
    setInput('')
    setError(null)
    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setLoading(true)
    try {
      const reply = await askAssistant({ config, data, messages: nextMessages })
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your LLM settings and network.')
      setMessages(nextMessages)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in flex h-full flex-col px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">AI Wealth Assistant</p>
          <h1 className="text-2xl font-bold text-on-surface">Assistant</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowConfig(true)}
            className="rounded-full p-2 text-on-surface-variant"
            aria-label="Configure LLM"
          >
            <SlidersHorizontal size={20} />
          </button>
          <button onClick={() => setScreen('dashboard')} className="rounded-full p-2 text-on-surface-variant" aria-label="Close">
            <X size={20} />
          </button>
        </div>
      </header>

      {!isConfigured ? (
        <div className="flex-1 rounded-2xl bg-surface p-6 border border-outline-variant">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-primary-container p-3 text-primary">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Connect your LLM</h2>
              <p className="text-xs text-on-surface-variant">Works with OpenAI, Groq, Ollama, LM Studio...</p>
            </div>
          </div>
          <ConfigForm config={config} setConfig={setConfig} onSave={handleSaveConfig} />
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-xs font-medium text-on-surface"
              >
                <Sparkles size={12} /> {s}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface text-on-surface border border-outline-variant'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-on-surface border border-outline-variant">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant" style={{ animationDelay: '0.15s' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-2xl bg-error/10 p-3 text-sm text-error">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-outline-variant bg-surface py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about your finances..."
              className="flex-1 rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-primary p-3 text-on-primary disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}

      {showConfig && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-surface p-6 border-t border-outline-variant max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">LLM Provider</h2>
              <button onClick={() => setShowConfig(false)} className="rounded-full p-2 text-on-surface-variant">
                <X size={20} />
              </button>
            </div>
            <ConfigForm config={config} setConfig={setConfig} onSave={handleSaveConfig} />
          </div>
        </div>
      )}
    </div>
  )
}

function ConfigForm({ config, setConfig, onSave }) {
  const [testStatus, setTestStatus] = useState(null)
  const [testing, setTesting] = useState(false)

  const applyPreset = (key) => {
    const preset = PRESETS[key]
    if (!preset) return
    setConfig((prev) => ({
      ...prev,
      provider: preset.provider,
      baseUrl: preset.baseUrl,
      model: preset.model
    }))
  }

  const handleTest = async () => {
    setTesting(true)
    setTestStatus(null)
    try {
      const reply = await testLLMConnection(config)
      setTestStatus({ ok: true, message: `Connected! Response: ${reply}` })
    } catch (err) {
      setTestStatus({ ok: false, message: err.message || 'Connection failed.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface-variant">Preset</label>
        <select
          value={Object.keys(PRESETS).find((k) => PRESETS[k].provider === config.provider) || 'custom'}
          onChange={(e) => applyPreset(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
        >
          {Object.entries(PRESETS).map(([key, p]) => (
            <option key={key} value={key}>{p.provider}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface-variant">API Key (leave blank for local tools)</label>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface"
        />
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface p-3">
        <div className="mb-2">
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">Base URL</label>
          <input
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">Model</label>
          <input
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            placeholder="gpt-4o-mini"
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          />
        </div>
      </div>

      {testStatus && (
        <div className={`rounded-xl p-3 text-sm ${testStatus.ok ? 'bg-green-400/10 text-green-400' : 'bg-error/10 text-error'}`}>
          {testStatus.message}
        </div>
      )}

      <button
        onClick={handleTest}
        disabled={testing || !config.baseUrl?.trim() || !config.model?.trim()}
        className="w-full rounded-2xl border border-outline-variant bg-surface py-3 text-sm font-semibold text-on-surface disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>

      <button
        onClick={onSave}
        disabled={!config.baseUrl?.trim() || !config.model?.trim()}
        className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        Save Provider
      </button>
    </div>
  )
}
