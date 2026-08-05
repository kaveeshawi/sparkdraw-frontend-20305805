import { useState } from 'react'

const fieldClass =
  'w-full rounded-xl border bg-muted/60 px-2.75 py-2 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-card-solid focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sd-grad-from)_12%,transparent)]'

function Label({ label, required }) {
  if (!label) return null
  return (
    <label className="text-[11px] font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-primary">*</span>}
    </label>
  )
}

export function Input({ label, hint, error, required, style: extra = {}, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <Label label={label} required={required} />
      <input
        {...props}
        style={extra}
        className={`${fieldClass} ${error ? 'border-destructive/60' : 'border-border'}`}
      />
      {error && <span className="text-[10px] text-destructive">{error}</span>}
      {hint && !error && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function Textarea({ label, hint, error, required, rows = 3, style: extra = {}, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <Label label={label} required={required} />
      <textarea
        {...props}
        rows={rows}
        style={{ resize: 'none', ...extra }}
        className={`${fieldClass} ${error ? 'border-destructive/60' : 'border-border'}`}
      />
      {error && <span className="text-[10px] text-destructive">{error}</span>}
      {hint && !error && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function Select({ label, hint, error, required, children, style: extra = {}, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <Label label={label} required={required} />
      <div className="relative">
        <select
          {...props}
          style={{
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23a855f7' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            paddingRight: '28px',
            cursor: 'pointer',
            ...extra,
          }}
          className={`${fieldClass} ${error ? 'border-destructive/60' : 'border-border'}`}
        >
          {children}
        </select>
      </div>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
      {hint && !error && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

export default Input
