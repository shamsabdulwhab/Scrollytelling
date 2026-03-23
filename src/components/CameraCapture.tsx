import { useEffect, useRef, useState } from 'react'

type CameraCaptureProps = {
  photoUrl: string | null
  onPhotoChange: (photoUrl: string | null) => void
  /** Extra class on the root (e.g. for profile circle layout) */
  className?: string
  /**
   * Shown inside the frame before the camera is opened. Hidden as soon as the user
   * starts the camera (requesting/ready) or after a photo is taken.
   */
  placeholderSrc?: string
}

export function CameraCapture({ photoUrl, onPhotoChange, className, placeholderSrc }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'requesting' | 'ready' | 'blocked' | 'unsupported'
  >('idle')

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => {
    return () => stopStream()
  }, [])

  const enableCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setStatus('ready')
    } catch {
      setStatus('blocked')
    }
  }

  const takePhoto = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    const width = Math.max(1, video.videoWidth || 640)
    const height = Math.max(1, video.videoHeight || 480)
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    onPhotoChange(dataUrl)
    stopStream()
    setStatus('idle')
  }

  const showPlaceholder =
    Boolean(placeholderSrc) &&
    !photoUrl &&
    (status === 'idle' || status === 'blocked' || status === 'unsupported')

  return (
    <div className={className ? `camera-mini ${className}` : 'camera-mini'}>
      <div className="camera-mini-row">
        <div className="camera-mini-actions">
          {!photoUrl && status !== 'ready' && (
            <button
              type="button"
              className="camera-icon-button camera-icon-button--icon-only"
              onClick={enableCamera}
              disabled={status === 'requesting'}
              aria-label="Enable camera"
              title="Enable camera"
            >
              {status === 'requesting' ? (
                <span className="camera-icon-button__spinner" aria-hidden="true" />
              ) : (
                <span className="camera-icon-button__glyph" aria-hidden="true">
                  📷
                </span>
              )}
            </button>
          )}
          {status === 'ready' && (
            <button
              type="button"
              className="camera-icon-button camera-icon-button--primary"
              onClick={takePhoto}
              aria-label="Take photo"
              title="Take photo"
            >
              Shot
            </button>
          )}
          {photoUrl && (
            <button
              type="button"
              className="camera-icon-button"
              onClick={() => onPhotoChange(null)}
              aria-label="Reshot — take photo again"
              title="Reshot"
            >
              Reshot
            </button>
          )}
        </div>
      </div>

      <div
        className={`camera-frame camera-frame--mini${showPlaceholder ? ' camera-frame--has-placeholder' : ''}`}
      >
        {photoUrl ? (
          <img className="camera-photo" src={photoUrl} alt="Captured photo" />
        ) : (
          <>
            <video
              className={`camera-video${showPlaceholder ? ' camera-video--hidden-until-live' : ''}`}
              ref={videoRef}
              playsInline
              muted
            />
            {showPlaceholder && (
              <img
                className="camera-placeholder"
                src={placeholderSrc}
                alt=""
                draggable={false}
              />
            )}
          </>
        )}

        {status === 'blocked' && (
          <p className="camera-hint">
            Camera permission was blocked. Allow it in your browser site settings and try again.
          </p>
        )}
        {status === 'unsupported' && (
          <p className="camera-hint">
            Your browser doesn&apos;t support camera capture. Try Chrome, or use another device.
          </p>
        )}
        {status !== 'ready' && !photoUrl && status !== 'blocked' && status !== 'unsupported' && (
          <p className="camera-hint">
            Tap the camera icon to open the camera, then take your shot
          </p>
        )}
      </div>
    </div>
  )
}
