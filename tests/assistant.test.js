import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/storage', () => ({
  storageGet: vi.fn(() => Promise.resolve({ provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-test' })),
  storageSet: vi.fn(() => Promise.resolve())
}))

import { getLLMConfig, setLLMConfig, DEFAULT_CONFIG, PRESETS } from '../src/lib/assistant'

describe('DEFAULT_CONFIG and PRESETS', () => {
  it('DEFAULT_CONFIG has correct shape', () => {
    expect(DEFAULT_CONFIG.provider).toBe('OpenAI')
    expect(DEFAULT_CONFIG.baseUrl).toBe('https://api.openai.com/v1')
    expect(DEFAULT_CONFIG.model).toBe('gpt-4o-mini')
    expect(DEFAULT_CONFIG.apiKey).toBe('')
  })

  it('PRESETS contains all providers', () => {
    expect(PRESETS.openai.provider).toBe('OpenAI')
    expect(PRESETS.groq.model).toBe('llama3-8b-8192')
    expect(PRESETS.ollama.baseUrl).toBe('http://localhost:11434/v1')
    expect(PRESETS.lmstudio.model).toBe('local-model')
    expect(PRESETS.custom.apiKey).toBeUndefined()
  })
})

describe('getLLMConfig / setLLMConfig', () => {
  it('getLLMConfig returns stored config', async () => {
    const config = await getLLMConfig()
    expect(config.provider).toBe('OpenAI')
    expect(config.apiKey).toBe('sk-test')
  })

  it('setLLMConfig merges with defaults', async () => {
    await setLLMConfig({ model: 'gpt-4' })
    const { storageSet } = await import('../src/lib/storage')
    expect(storageSet).toHaveBeenCalled()
  })
})
