'use client'

import { useEffect, useId, useRef, useState } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectMenuProps {
  id?: string
  label: string
  menuLabel: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  variant?: 'filter' | 'field'
}

export default function SelectMenu({
  id,
  label,
  menuLabel,
  value,
  options,
  onChange,
  disabled = false,
  variant = 'filter',
}: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const [opensUp, setOpensUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selectedLabel = options[selectedIndex]?.label || label

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[selectedIndex]?.focus()

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open, selectedIndex])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  function showMenu() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setOpensUp(spaceBelow < 280 && rect.top > spaceBelow)
    }
    setOpen(true)
  }

  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function focusOption(index: number) {
    rootRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[index]?.focus()
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const current = Number((event.target as HTMLElement).dataset.index)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption((current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusOption(event.key === 'Home' ? 0 : options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(current)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const next = options.findIndex((option, index) => index > current && option.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()))
      const first = options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()))
      if (next !== -1 || first !== -1) focusOption(next !== -1 ? next : first)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`select-menu select-menu--${variant}${value ? ' select-menu--active' : ''}${open ? ' select-menu--open' : ''}${opensUp ? ' select-menu--up' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="select-menu-trigger"
        aria-label={`${label}: ${selectedLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : showMenu()}
        onKeyDown={(event) => {
          if (!open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            showMenu()
          } else if (open && event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
          }
        }}
      >
        <span className="select-menu-value">{selectedLabel}</span>
        <svg className="select-menu-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="select-menu-popover">
          <div className="select-menu-heading">{menuLabel}</div>
          <ul id={listId} className="select-menu-list" role="listbox" aria-label={label} onKeyDown={handleListKeyDown}>
            {options.map((option, index) => (
              <li
                key={option.value}
                className="select-menu-option"
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                data-index={index}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === value && <span className="select-menu-check" aria-hidden="true">✓</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
