interface SpinnerProps {
  size?: number
  className?: string
}

export default function Spinner({ size = 20, className = '' }: SpinnerProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="31.4"
        strokeDashoffset="10"
        strokeLinecap="round"
      />
    </svg>
  )
}
