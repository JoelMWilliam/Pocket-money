import { useState, useEffect } from 'react'
import { getReceipt, isIndexedDBReceipt, getReceiptIdFromReference } from '../lib/receipts'
import { Receipt } from 'lucide-react'

export default function ReceiptImage({ src, alt, className, fallbackClassName }) {
  const [dataUrl, setDataUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!src) {
        setDataUrl(null)
        setLoading(false)
        return
      }
      if (isIndexedDBReceipt(src)) {
        const id = getReceiptIdFromReference(src)
        try {
          const data = await getReceipt(id)
          if (!cancelled) {
            setDataUrl(data)
            setLoading(false)
          }
        } catch (err) {
          if (!cancelled) {
            setDataUrl(null)
            setLoading(false)
          }
        }
      } else {
        if (!cancelled) {
          setDataUrl(src)
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [src])

  if (loading) {
    return (
      <div className={`skeleton ${className || ''}`} />
    )
  }

  if (!dataUrl) {
    return (
      <div className={`flex items-center justify-center bg-surface-variant ${fallbackClassName || className || ''}`}>
        <Receipt size={24} className="text-on-surface-variant" />
      </div>
    )
  }

  return <img src={dataUrl} alt={alt || 'Receipt'} className={className} />
}
