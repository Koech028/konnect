export function readImageFile(file, maxSize = 5 * 1024 * 1024) {
  if (!file || !file.type.startsWith('image/')) {
    return Promise.reject(new Error('Choose an image file.'))
  }
  if (file.size > maxSize) {
    return Promise.reject(new Error('Choose an image smaller than 5 MB.'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Image resizing is not supported in this browser.'))
          return
        }
        try {
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.72))
        } catch (error) {
          reject(new Error(`The image could not be processed: ${error.message}`))
        }
      }
      image.onerror = () => reject(new Error('The image could not be decoded. Please try another file.'))
      image.src = reader.result
    }
    reader.onerror = () => reject(new Error('The image could not be read. Please try another file.'))
    reader.readAsDataURL(file)
  })
}
