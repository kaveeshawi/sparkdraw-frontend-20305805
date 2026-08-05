export default function Card({ children, style: extra = {}, className: extraClass = '', onClick, hoverable = false }) {
  const interactive = onClick || hoverable
  return (
    <div
      onClick={onClick}
      style={extra}
      className={`sd-card ${interactive ? 'sd-card--interactive' : ''} p-4 ${
        interactive ? 'cursor-pointer' : ''
      } ${extraClass}`}
    >
      {children}
    </div>
  )
}
