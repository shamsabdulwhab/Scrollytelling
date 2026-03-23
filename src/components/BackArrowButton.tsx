type BackArrowButtonProps = {
  onClick: () => void
  /** Screen reader label, e.g. "Back to form" */
  label: string
}

export function BackArrowButton({ onClick, label }: BackArrowButtonProps) {
  return (
    <button type="button" className="panel-back" onClick={onClick} aria-label={label}>
      <span className="panel-back__icon" aria-hidden="true">
        ←
      </span>
    </button>
  )
}
