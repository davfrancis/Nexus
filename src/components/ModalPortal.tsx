'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ModalPortal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 9999, overflowY: 'auto' }}
    >
      {children}
    </div>,
    document.body
  )
}
