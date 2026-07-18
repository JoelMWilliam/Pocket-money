import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockShare = vi.fn()
const mockWriteFile = vi.fn()
const mockGetUri = vi.fn()

vi.mock('@capacitor/share', () => ({
  Share: { share: (...args) => mockShare(...args) }
}))

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: (...args) => mockWriteFile(...args),
    getUri: (...args) => mockGetUri(...args)
  },
  Directory: { Cache: 'cache' }
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: vi.fn(() => ({}))
}))

vi.mock('../src/lib/storage', () => ({
  storageGet: vi.fn(() => Promise.resolve(null)),
  storageSet: vi.fn(() => Promise.resolve())
}))

import { nativeShare, downloadOrShare } from '../src/lib/share'

describe('nativeShare', () => {
  beforeEach(() => {
    mockShare.mockReset()
  })

  it('returns true on successful share', async () => {
    mockShare.mockResolvedValue({})
    const result = await nativeShare({ text: 'hello' })
    expect(result).toBe(true)
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Pocket Money',
      text: 'hello',
      url: undefined,
      dialogTitle: 'Share'
    })
  })

  it('returns false when user cancels', async () => {
    mockShare.mockRejectedValue(new Error('cancelled'))
    const result = await nativeShare({ text: 'test' })
    expect(result).toBe(false)
  })

  it('handles canceled spelling variant', async () => {
    mockShare.mockRejectedValue(new Error('canceled'))
    const result = await nativeShare({ text: 'test' })
    expect(result).toBe(false)
  })

  it('returns false on other errors', async () => {
    mockShare.mockRejectedValue(new Error('Network error'))
    const result = await nativeShare({ text: 'test' })
    expect(result).toBe(false)
  })
})

describe('downloadOrShare (web)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('uses URL.createObjectURL and creates a temp download link', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    const originalURL = globalThis.URL
    globalThis.URL = { createObjectURL, revokeObjectURL } 

    const blob = new Blob(['test data'], { type: 'text/plain' })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(globalThis.HTMLElement.prototype, 'remove')

    const result = await downloadOrShare(blob, 'test.txt', 'Test File')

    expect(result).toBe(true)
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(appendSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledTimes(1)
    const appendedLink = appendSpy.mock.calls[0][0]
    expect(appendedLink.tagName).toBe('A')
    expect(appendedLink.download).toBe('test.txt')
    expect(appendedLink.href).toBe('blob:mock-url')

    globalThis.URL = originalURL
    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
