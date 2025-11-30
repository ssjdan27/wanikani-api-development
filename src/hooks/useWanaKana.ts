'use client'

import { useEffect, useState, useCallback, type RefObject } from 'react'
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

  const toggle = useCallback(() => {
    setEnabled(prev => !prev)
  }, [])

  // Track Shift key state for katakana mode
  useEffect(() => {
    if (!enabled) return

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
    }
  }, [enabled])

  // Bind/unbind WanaKana to input based on enabled state and shift key
  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    if (!enabled) {
      // Ensure unbound when disabled
      try {
        wanakana.unbind(input)
      } catch {
        // Ignore if not bound
      }
      return
    }

    // Bind with appropriate mode
    wanakana.bind(input, {
      IMEMode: isShiftHeld ? 'toKatakana' : 'toHiragana'
    })

    return () => {
      try {
        wanakana.unbind(input)
      } catch {
        // Ignore if not bound
      }
    }
  }, [inputRef, enabled, isShiftHeld])

  return { enabled, toggle }
}
