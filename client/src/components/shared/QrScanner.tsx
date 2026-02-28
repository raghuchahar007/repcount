import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QrScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [started, setStarted] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scannerId = 'qr-reader-' + Math.random().toString(36).slice(2, 8)

    if (!containerRef.current) return

    const el = document.createElement('div')
    el.id = scannerId
    containerRef.current.appendChild(el)

    const scanner = new Html5Qrcode(scannerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
          scanner.stop().catch(() => {})
        },
        () => {}
      )
      .then(() => setStarted(true))
      .catch((err) => {
        onError?.(err?.message || 'Camera access denied')
      })

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div>
      <div ref={containerRef} className="rounded-2xl overflow-hidden" />
      {!started && (
        <p className="text-text-muted text-sm text-center mt-2">Starting camera...</p>
      )}
    </div>
  )
}
