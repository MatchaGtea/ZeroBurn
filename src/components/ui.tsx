import type { PropsWithChildren, ReactNode } from 'react'

export function Card({ title, action, children, className = '' }: PropsWithChildren<{ title?: string; action?: ReactNode; className?: string }>) {
  return (
    <section className={`zb-card ${className}`}>
      {(title || action) && (
        <div className="zb-card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Pill({ children, tone = 'green' }: PropsWithChildren<{ tone?: 'green' | 'amber' | 'red' | 'blue' | 'neutral' }>) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function StatTile({ label, value, helper, icon }: { label: string; value: string | number; helper?: string; icon?: ReactNode }) {
  return (
    <div className="stat-tile">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  )
}

export function FormField({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string | number
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} />
    </label>
  )
}

export function TextAreaField({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="form-field form-field-full">
      <span>{label}</span>
      <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={4} />
    </label>
  )
}
