import { useRef, useState } from 'react'
import { User, X } from 'lucide-react'
import AvatarCropper from './AvatarCropper'

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AvatarPicker({ value, onChange, label = 'Tap to change', size = 80 }) {
  const inputRef = useRef(null)
  const [cropImage, setCropImage] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    try {
      const dataUrl = await readImageFile(file)
      setCropImage(dataUrl)
    } catch (err) {
      alert('Failed to load image')
    }
  }

  const handleCrop = (cropped) => {
    onChange(cropped)
    setCropImage(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    setCropImage(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ width: size, height: size }}
        aria-label={label}
      >
        {value ? (
          <img src={value} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <User size={size * 0.4} className="text-on-surface-variant" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </button>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex items-center gap-1 text-xs text-error"
        >
          <X size={14} /> Remove
        </button>
      ) : (
        <p className="text-xs text-on-surface-variant">{label}</p>
      )}

      {cropImage && (
        <AvatarCropper
          image={cropImage}
          onCrop={handleCrop}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
