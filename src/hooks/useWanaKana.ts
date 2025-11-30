'use client'

import { useEffect, useRef, type RefObject } from 'react'
import * as wanakana from 'wanakana'

// Re-export useful utilities for search logic
export const { toHiragana, toKatakana, toRomaji, isRomaji, isJapanese, isKana } = wanakana

/**
 * Hook that binds WanaKana IME mode to an input element.
 * Converts romaji to hiragana by default, katakana when Shift is held.
 * 
 * @param inputRef - React ref to the input element
 * 
 * @example
 * const inputRef = useRef<HTMLInputElement>(null)
 * useWanaKanaBind(inputRef)
 * return <input ref={inputRef} />
 */
export function useWanaKanaBind(inputRef: RefObject<HTMLInputElement | null>) {
  const isShiftHeld = useRef(false)
  const isBound = useRef(false)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    // Bind with default hiragana mode
    const bindInput = () => {
      if (isBound.current && input) {
        wanakana.unbind(input)
      }
      wanakana.bind(input, { 
        IMEMode: isShiftHeld.current ? 'toKatakana' : 'toHiragana'
      })
      isBound.current = true
    }

    // Initial bind
    bindInput()

    // Track Shift key state and rebind when it changes
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isShiftHeld.current) {
        isShiftHeld.current = true
        bindInput()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && isShiftHeld.current) {
        isShiftHeld.current = false
        bindInput()
      }
    }

    // Handle focus loss to reset shift state
    const handleBlur = () => {
      if (isShiftHeld.current) {
        isShiftHeld.current = false
        bindInput()
      }
    }

    input.addEventListener('keydown', handleKeyDown)
    input.addEventListener('keyup', handleKeyUp)
    input.addEventListener('blur', handleBlur)

    return () => {
      if (isBound.current && input) {
        wanakana.unbind(input)
        isBound.current = false
      }
      input.removeEventListener('keydown', handleKeyDown)
      input.removeEventListener('keyup', handleKeyUp)
      input.removeEventListener('blur', handleBlur)
    }
  }, [inputRef])
}
