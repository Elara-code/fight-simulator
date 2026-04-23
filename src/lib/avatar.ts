// Stores the user's avatar (from local upload) as a small base64 data URL
// in localStorage. Used by SharePage so the screenshot distinguishes
// "me" from the other person. No server upload — stays on device.

const KEY = 'fightsim.avatar.v1'
const MAX_SIZE = 128 // px — 128x128 is plenty for a 28px round avatar
const MAX_BYTES = 200_000 // ~200 KiB ceiling on the data URL after encode

type Listener = (dataUrl: string | null) => void
const listeners = new Set<Listener>()

export function getUserAvatar(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearUserAvatar() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  for (const l of listeners) l(null)
}

export function onUserAvatarChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Accepts a File (from <input type=file>), downscales it via canvas to a
// square 128x128 JPEG, and stores the data URL. Throws on load failures
// so the caller can show a toast.
export async function setUserAvatarFromFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }

  const bitmap = await loadImageBitmap(file)
  const dataUrl = resizeToSquareDataUrl(bitmap, MAX_SIZE)
  bitmap.close?.()

  if (dataUrl.length > MAX_BYTES) {
    // Shouldn't happen with 128x128 JPEG q=0.82, but guard against huge uploads.
    throw new Error('图片过大，请换一张更小的')
  }

  try {
    localStorage.setItem(KEY, dataUrl)
  } catch {
    throw new Error('存储失败，请清理浏览器数据后重试')
  }
  for (const l of listeners) l(dataUrl)
  return dataUrl
}

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  // Fallback for older browsers.
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      // Return a bitmap-like shim. Canvas handles HTMLImageElement too.
      resolve(img as unknown as ImageBitmap)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败'))
    }
    img.src = url
  })
}

function resizeToSquareDataUrl(src: CanvasImageSource, size: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持 Canvas')

  // Center-crop the longest dimension to a square, then draw into target.
  const w = (src as ImageBitmap).width ?? (src as HTMLImageElement).naturalWidth
  const h = (src as ImageBitmap).height ?? (src as HTMLImageElement).naturalHeight
  const side = Math.min(w, h)
  const sx = (w - side) / 2
  const sy = (h - side) / 2
  ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.82)
}
