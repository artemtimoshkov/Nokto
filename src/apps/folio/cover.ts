/** Turns a picked image into a small 2:3 JPEG data URL (center-cropped), small enough to keep on the book's row. */
export async function coverFromFile(file: File, w = 240, h = 360): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const { naturalWidth: iw, naturalHeight: ih } = img
    const scale = Math.min(iw / w, ih / h)
    const sw = w * scale, sh = h * scale
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d')!.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}
