import React, { useEffect } from 'react'

export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

const STATUS_STYLES = {
  applied: { label: 'Applied', tone: 'neutral' },
  screening: { label: 'Screening', tone: 'amber' },
  interview: { label: 'Interview', tone: 'maroon' },
  offer: { label: 'Offer', tone: 'green' },
  rejected: { label: 'Not selected', tone: 'red' },
  open: { label: 'Open', tone: 'green' },
  draft: { label: 'Draft', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'red' },
  'in review': { label: 'In review', tone: 'amber' },
  graded: { label: 'Graded', tone: 'green' },
  pending: { label: 'Pending', tone: 'neutral' },
}

export function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { label: status, tone: 'neutral' }
  return (
    <span className={`pill pill-${s.tone}`}>
      <span className="pill-dot" />
      {s.label}
    </span>
  )
}

const STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Decision' },
]

export function StageTracker({ status }) {
  const activeIndex = status === 'rejected' ? STAGES.length - 1 : STAGES.findIndex((s) => s.key === status)
  const cols = STAGES.map(() => 'auto').join(' 1fr ')
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center' }}>
        {STAGES.map((s, i) => {
          const nodeState = status === 'rejected' ? 'done' : i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''
          const lineDone = status === 'rejected' ? true : i < activeIndex
          return (
            <React.Fragment key={s.key}>
              {i !== 0 && <div className={`thread-line ${lineDone ? 'done' : ''}`} />}
              <div className={`thread-node ${nodeState}`} />
            </React.Fragment>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, marginTop: 8 }}>
        {STAGES.map((s, i) => (
          <React.Fragment key={s.key}>
            {i !== 0 && <div />}
            <span className="stage-label" style={{ justifySelf: 'start', transform: 'translateX(-6px)' }}>
              {status === 'rejected' && i === STAGES.length - 1 ? 'Not selected' : s.label}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export function Initials({ text }) {
  return <div className="avatar">{text}</div>
}
