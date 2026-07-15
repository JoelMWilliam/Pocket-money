import { useState, useRef, useCallback } from 'react'
import { Camera, X, ScanLine, Check, Loader2, Image as ImageIcon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { autoCategorize } from '../lib/merchantRules'

export default function ReceiptScanner({ onClose }) {
  const [processing, setProcessing] = useState(false)
  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState('')
  const [imageData, setImageData] = useState(null)
  const fileInputRef = useRef(null)
  const addTransaction = useAppStore((state) => state.addTransaction)
  const categories = useAppStore((state) => state.categories)
  const accounts = useAppStore((state) => state.accounts)

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return
    setProcessing(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target.result
        setImageData(dataUrl)

        try {
          const Tesseract = await import('tesseract.js')
          const result = await Tesseract.recognize(dataUrl, 'eng', {
            logger: () => {}
          })
          const text = result.data.text
          const parsed = extractReceiptData(text)
          setExtracted(parsed)
        } catch (err) {
          setError('OCR failed: ' + (err.message || 'unknown error'))
        } finally {
          setProcessing(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Failed to read file')
      setProcessing(false)
    }
  }, [])

  const extractReceiptData = (text) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    let total = null
    for (const line of lines) {
      const match = line.match(/(?:total|amount|grand\s*total|net\s*total|balance)\s*[:\s]*(?:rs\.?\s*|lkr\s*|₹\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i)
      if (match) {
        total = Number(match[1].replace(/,/g, ''))
        break
      }
    }
    if (!total) {
      for (const line of lines.reverse()) {
        const match = line.match(/(?:rs\.?\s*|lkr\s*|₹\s*)?([0-9,]+\.[0-9]{2})/i)
        if (match) {
          total = Number(match[1].replace(/,/g, ''))
          break
        }
      }
    }

    let merchant = lines[0] || 'Unknown Merchant'
    if (merchant.length > 40) merchant = merchant.slice(0, 40)

    let date = new Date().toISOString().slice(0, 10)
    for (const line of lines) {
      const match = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)
      if (match) {
        const d = new Date(match[1])
        if (!isNaN(d.getTime())) {
          date = d.toISOString().slice(0, 10)
          break
        }
      }
    }

    return {
      total,
      merchant,
      date,
      rawText: text.slice(0, 500)
    }
  }

  const handleConfirm = () => {
    if (!extracted?.total) return

    const txn = autoCategorize({
      amount: extracted.total,
      type: 'expense',
      date: extracted.date,
      note: extracted.merchant,
      merchant: extracted.merchant,
      accountId: accounts[0]?.id,
      categoryId: categories.find((c) => c.type === 'expense')?.id,
      tags: ['receipt-ocr']
    })

    addTransaction(txn)
    onClose?.()
  }

  const handleRetake = () => {
    setImageData(null)
    setExtracted(null)
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-surface p-6 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">Scan Receipt</h2>
          <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant">
            <X size={20} />
          </button>
        </div>

        {!imageData && !processing && (
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant py-12 text-on-surface-variant"
            >
              <ScanLine size={48} className="text-primary" />
              <p className="text-sm font-medium">Take photo or choose from gallery</p>
              <p className="text-xs text-on-surface-variant">We'll extract the amount, merchant, and date</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>
        )}

        {processing && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant">Reading receipt...</p>
          </div>
        )}

        {imageData && !processing && extracted && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-outline-variant">
              <img src={imageData} alt="Receipt" className="max-h-48 w-full object-contain" />
            </div>

            <div className="space-y-3 rounded-2xl bg-surface-variant p-4">
              <div>
                <p className="text-xs text-on-surface-variant">Merchant</p>
                <p className="text-sm font-semibold text-on-surface">{extracted.merchant}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Amount</p>
                <p className="text-2xl font-bold text-on-surface">
                  {extracted.total ? `LKR ${extracted.total.toLocaleString()}` : 'Not found'}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Date</p>
                <p className="text-sm text-on-surface">{extracted.date}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 rounded-2xl bg-surface-variant py-3 text-sm font-semibold text-on-surface"
              >
                Retake
              </button>
              <button
                onClick={handleConfirm}
                disabled={!extracted.total}
                className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary disabled:opacity-50"
              >
                <Check size={18} className="mr-1 inline" /> Add Transaction
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-error/10 p-4 text-center text-sm text-error">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
