import { api } from './api'
import { readImageFile } from './readImageFile'

async function uploadBlob(blob) {
  const contentType = blob.type.split(';', 1)[0].trim().toLowerCase()
  const upload = await api.post('/api/v1/media/upload-url/', {
    content_type: contentType,
    size: blob.size
  })
  const response = await fetch(upload.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': upload.content_type },
    body: blob
  })
  if (!response.ok) {
    throw new Error(`Media upload failed (${response.status}). Check the R2 bucket CORS configuration and try again.`)
  }
  return upload.url
}

export async function uploadImage(file) {
  const resized = await readImageFile(file)
  const blob = await fetch(resized).then(response => response.blob())
  return uploadBlob(blob)
}

export async function uploadVideo(file) {
  const maxBytes = 50 * 1024 * 1024
  const contentType = file.type.split(';', 1)[0].trim().toLowerCase()
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(contentType)) {
    throw new Error('Choose an MP4, WebM, or QuickTime video.')
  }
  if (!file.size || file.size > maxBytes) {
    throw new Error('Videos must be smaller than 50 MB.')
  }
  return uploadBlob(file)
}

export function getVideoDuration(file) {
  const contentType = file.type.split(';', 1)[0].trim().toLowerCase()
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(contentType)) {
    return Promise.reject(new Error('Choose an MP4, WebM, or QuickTime video.'))
  }
  if (!file.size || file.size > 50 * 1024 * 1024) {
    return Promise.reject(new Error('Videos must be smaller than 50 MB.'))
  }
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = Math.ceil(video.duration)
      cleanup()
      if (!Number.isFinite(duration) || duration < 1 || duration > 60) {
        reject(new Error('Videos must be between 1 and 60 seconds long.'))
        return
      }
      resolve(duration)
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('The video duration could not be read. Choose a playable video file.'))
    }
    video.src = objectUrl
  })
}
