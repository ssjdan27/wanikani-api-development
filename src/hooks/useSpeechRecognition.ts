'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

// Web Speech API types (not included in standard TypeScript lib)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'aborted' | 'language-not-supported' | 'service-not-allowed'
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance
}

// Extend Window interface for webkit prefix
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  transcript: string
  interimTranscript: string
  confidence: number
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'ja-JP',
    continuous = true, // Changed to true - keep listening until explicitly stopped
    interimResults = true,
    maxAlternatives = 3
  } = options

  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const mountedRef = useRef(true)
  const accumulatedTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')

  // Check for browser support
  useEffect(() => {
    mountedRef.current = true
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognitionAPI)
    
    return () => {
      mountedRef.current = false
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser')
      return
    }

    // Clean up any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognitionAPI()
    recognitionRef.current = recognition

    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = maxAlternatives

    recognition.onstart = () => {
      if (mountedRef.current) {
        console.log('[SpeechRecognition] Started listening...')
        setIsListening(true)
        setError(null)
        setInterimTranscript('')
        accumulatedTranscriptRef.current = ''
      }
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return

      let finalTranscript = ''
      let interimText = ''

      // Process all results from the beginning to accumulate properly
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          finalTranscript += text
          console.log('[SpeechRecognition] Final result:', text, 'confidence:', result[0].confidence)
        } else {
          interimText += text
        }
      }

      if (finalTranscript) {
        accumulatedTranscriptRef.current = finalTranscript
        setTranscript(finalTranscript)
        setConfidence(event.results[event.results.length - 1][0].confidence)
        setInterimTranscript('')
        interimTranscriptRef.current = ''
      } else if (interimText) {
        console.log('[SpeechRecognition] Interim:', interimText)
        setInterimTranscript(interimText)
        interimTranscriptRef.current = interimText
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return
      console.log('[SpeechRecognition] Error:', event.error)

      let errorMessage: string
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'no-speech'
          break
        case 'audio-capture':
          errorMessage = 'audio-capture'
          break
        case 'not-allowed':
          errorMessage = 'not-allowed'
          break
        case 'network':
          errorMessage = 'network'
          break
        case 'aborted':
          errorMessage = 'aborted'
          break
        case 'language-not-supported':
          errorMessage = 'language-not-supported'
          break
        default:
          errorMessage = 'unknown'
      }
      setError(errorMessage)
      setIsListening(false)
    }

    recognition.onend = () => {
      if (mountedRef.current) {
        console.log('[SpeechRecognition] Ended. Accumulated transcript:', accumulatedTranscriptRef.current)
        setIsListening(false)
        
        // If we have interim text but no final transcript, use the interim as final
        // This helps when recognition ends abruptly (common on mobile/some browsers)
        if (!accumulatedTranscriptRef.current && interimTranscriptRef.current) {
          console.log('[SpeechRecognition] Using interim as final:', interimTranscriptRef.current)
          setTranscript(interimTranscriptRef.current)
          setInterimTranscript('')
          interimTranscriptRef.current = ''
        }
      }
    }

    try {
      recognition.start()
    } catch (err) {
      setError('Failed to start speech recognition')
      setIsListening(false)
    }
  }, [lang, continuous, interimResults, maxAlternatives])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setConfidence(0)
    setError(null)
    accumulatedTranscriptRef.current = ''
    interimTranscriptRef.current = ''
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
}
