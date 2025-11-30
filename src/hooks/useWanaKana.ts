'use client'

import { useEffect, useState, useCallback, useRef, type RefObject } from 'react'
import * as wanakana from 'wanakana'

// Re-export useful utilities for search logic
export const { toHiragana, toKatakana, toRomaji, isRomaji, isJapanese, isKana } = wanakana

interface UseWanaKanaOptions {
  /** Whether IME mode is enabled initially (default: false) */
  enabled?: boolean
}

/**
 * Hook that binds WanaKana IME mode to an input element.
 * Converts romaji to hiragana by default, katakana when Shift is held.
 * Returns toggle function to enable/disable IME mode.
 * 
 * @param inputRef - React ref to the input element
 * @param options - Configuration options
 * @returns Object with enabled state and toggle function
 * 
 * @example
 * const inputRef = useRef<HTMLInputElement>(null)
 * const { enabled, toggle } = useWanaKanaBind(inputRef, { enabled: false })
 * return (
 *   <>
 *     <input ref={inputRef} />
 *     <button onClick={toggle}>{enabled ? 'あ' : 'A'}</button>
 *   </>
 * )
 */
export function useWanaKanaBind(
  inputRef: RefObject<HTMLInputElement | null>,
  options: UseWanaKanaOptions = {}
) {
  const { enabled: initialEnabled = false } = options
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  
  // Track bound state to avoid unsafe unbind calls
  const isBoundRef = useRef(false)

  const toggle = useCallback(() => {
    setEnabled(prev => !prev)
  }, [])

  // Track Shift key state for katakana mode - use stable callbacks
  useEffect(() => {
    if (!enabled) {
      setIsShiftHeld(false)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(false)
    }
    const handleBlur = () => {
      setIsShiftHeld(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      setIsShiftHeld(false)
    }
  }, [enabled])

  // Bind/unbind WanaKana to input based on enabled state
  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    // Unbind if currently bound
    if (isBoundRef.current) {
      try {
        wanakana.unbind(input)
      } catch {
        // Ignore errors
      }
      isBoundRef.current = false
    }

    // Only bind if enabled
    if (enabled) {
      try {
        wanakana.bind(input, {
          IMEMode: isShiftHeld ? 'toKatakana' : 'toHiragana'
        })
        isBoundRef.current = true
      } catch {
        // Ignore bind errors
      }
    }

    return () => {
      if (isBoundRef.current && input) {
        try {
          wanakana.unbind(input)
        } catch {
          // Ignore errors
        }
        isBoundRef.current = false
      }
    }
  }, [inputRef, enabled, isShiftHeld])

  return { enabled, toggle }
}
