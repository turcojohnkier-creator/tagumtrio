function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Unable to read image file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unable to load image file.'))
      img.onload = () => resolve(img)
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Downscale + re-encode before staging so a slow connection has far less to
// upload — phone camera photos can be several MB each; this brings them down
// to a few hundred KB without a visible quality loss in the verification photo.
export async function compressImageFile(file, { maxDimension = 1600, quality = 0.7 } = {}) {
  const img = await loadImageFromFile(file)
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

// Center-crop to a square and shrink to `size` px — a profile picture this
// size is typically 10–30 KB as JPEG.
export async function makeAvatarDataUrl(file, { size = 256, quality = 0.85 } = {}) {
  const img = await loadImageFromFile(file)
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  const target = Math.min(size, side)
  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, target, target)
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target)
  return canvas.toDataURL('image/jpeg', quality)
}
