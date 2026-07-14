import { useState, useCallback } from 'react'
import { X, Check } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { RegisterModal } from './ModalRoot'

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (err) => reject(err))
    img.src = url
  })
}

async function getCroppedImg(imageSrc, pixelCrop, maxSize = 512) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const outputSize = Math.min(pixelCrop.width, maxSize)
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  )
  return canvas.toDataURL('image/jpeg', 0.9)
}

export default function AvatarCropper({ image, onCrop, onClose }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [loading, setLoading] = useState(false)

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setLoading(true)
    try {
      const cropped = await getCroppedImg(image, croppedAreaPixels)
      onCrop(cropped)
    } catch (err) {
      alert('Failed to crop image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <RegisterModal />
      <div className="fixed inset-0 z-[70] flex flex-col bg-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold text-on-surface">Crop Avatar</h2>
          <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant" aria-label="Cancel">
            <X size={24} />
          </button>
        </div>
        <div className="relative flex-1">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="space-y-4 bg-surface px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={loading || !croppedAreaPixels}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-50"
          >
            <Check size={20} /> {loading ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </>
  )
}
