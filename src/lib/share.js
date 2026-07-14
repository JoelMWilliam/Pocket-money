import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

export async function nativeShare(options) {
  try {
    await Share.share({
      title: options.title || 'Pocket Money',
      text: options.text || '',
      url: options.url || undefined,
      dialogTitle: options.dialogTitle || 'Share'
    })
    return true
  } catch (err) {
    if (err.message?.includes('cancelled') || err.message?.includes('canceled')) return false
    console.error('Share failed', err)
    return false
  }
}

export async function shareFile(blob, filename, title) {
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    const path = `pocket-money/${filename}`
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      recursive: true
    })

    const fileUri = await Filesystem.getUri({
      path,
      directory: Directory.Cache
    })

    await Share.share({
      title: title || filename,
      url: fileUri.uri,
      dialogTitle: title || 'Share file'
    })
    return true
  } catch (err) {
    console.error('shareFile failed', err)
    return false
  }
}

export async function downloadOrShare(blob, filename, title) {
  if (Capacitor.isNativePlatform()) {
    const ok = await shareFile(blob, filename, title)
    if (!ok) throw new Error('Share failed or was cancelled.')
    return true
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}
