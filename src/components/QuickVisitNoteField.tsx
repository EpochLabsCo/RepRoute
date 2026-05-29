import { useId, useRef, useState } from 'react'
import { uiText } from '../constants/uiText'

type QuickVisitNoteFieldProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function QuickVisitNoteField({
  value,
  onChange,
  className = '',
}: QuickVisitNoteFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const showExpanded = isFocused || expanded

  function handleFocus() {
    setIsFocused(true)
    setExpanded(true)
  }

  function handleBlur() {
    setIsFocused(false)
    setExpanded(false)
  }

  function handleChange(nextValue: string) {
    onChange(nextValue)

    if (nextValue.includes('\n')) {
      setExpanded(true)
    }
  }

  return (
    <label
      htmlFor={inputId}
      className={`quick-visit-note field-group ${showExpanded ? 'quick-visit-note--expanded' : ''} ${className}`.trim()}
    >
      <span className="quick-visit-note__label field-label">{uiText.routes.quickNoteLabel}</span>
      <textarea
        id={inputId}
        ref={inputRef}
        className="quick-visit-note__input"
        rows={showExpanded ? 3 : 1}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={uiText.routes.quickNotePlaceholder}
        aria-expanded={showExpanded}
      />
    </label>
  )
}
