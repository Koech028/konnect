import { api } from './api'
import { readImageFile } from './readImageFile'

export async function uploadImage(file) {
  const resized = await readImageFile(file)
  const blob = await fetch(resized).then(response => response.blob())
  const upload = await api.post('/api/v1/media/upload-url/', {
    content_type: blob.type,
    size: blob.size
  })
  const response = await fetch(upload.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': upload.content_type },
    body: blob
  })
  if (!response.ok) {
    throw new Error(`Image upload failed (${response.status}). Check the R2 bucket CORS configuration and try again.`)
  }
  return upload.url
}
