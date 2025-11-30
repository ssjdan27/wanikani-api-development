'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Volume2, Eye, EyeOff, SkipForward, Shuffle, RotateCcw, ChevronDown, Check, X, Mic, MicOff, AlertCircle } from 'lucide-react'
import type { Subject, Assignment, PronunciationAudio } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { WaniKaniService } from '@/services/wanikani'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { scorePronunciation, matchesAnyReading, type PronunciationScore } from '@/utils/japaneseCompare'

interface ReadingAloudPracticeProps {
  subjects: Subject[]
  assignments: Assignment[]
  apiToken: string
}

type FilterType = 'all' | 'apprentice' | 'guru' | 'master' | 'enlightened' | 'burned'
type PracticeMode = 'manual' | 'voice'

interface PracticeItem {
  subject: Subject
  srsStage: number
}

interface SessionStats {
  total: number
  correct: number
  incorrect: number
}

export default function ReadingAloudPractice({ subjects, assignments, apiToken }: ReadingAloudPracticeProps) {
  const { t } = useLanguage()
  const [filter, setFilter] = useState<FilterType>('all')
  const [showMeaning, setShowMeaning] = useState(true)
  const [isRevealed, setIsRevealed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [playingAudio, setPlayingAudio] = useState(false)
  const [audioCache, setAudioCache] = useState<Map<number, PronunciationAudio[]>>(new Map())
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats>({ total: 0, correct: 0, incorrect: 0 })
  const [isPracticing, setIsPracticing] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('manual')
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [voiceScore, setVoiceScore] = useState<PronunciationScore | null>(null)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Speech recognition hook
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    confidence,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({ lang: 'ja-JP' })
  
  // Memoize the WaniKani service
  const wanikaniService = useMemo(() => new WaniKaniService(apiToken), [apiToken])

  // Check localStorage for privacy acceptance
  useEffect(() => {
    const accepted = localStorage.getItem('voice-privacy-accepted') === 'true'
    setPrivacyAccepted(accepted)
  }, [])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current = null
      }
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer)
      }
    }
  }, [autoAdvanceTimer])

  // Build assignment map for SRS stage lookup
  const assignmentMap = useMemo(() => {
    const map = new Map<number, number>()
    assignments.forEach(a => {
      if (!a.data.hidden) {
        map.set(a.data.subject_id, a.data.srs_stage)
      }
    })
    return map
  }, [assignments])

  // Filter vocabulary subjects with readings
  const practiceItems = useMemo(() => {
    let items = subjects
      .filter(s => (s.object === 'vocabulary' || s.object === 'kana_vocabulary') && s.data.readings?.length)
      .map(subject => ({
        subject,
        srsStage: assignmentMap.get(subject.id) ?? -1
      }))

    // Apply SRS filter
    if (filter !== 'all') {
      items = items.filter(item => {
        const stage = item.srsStage
        switch (filter) {
          case 'apprentice': return stage >= 1 && stage <= 4
          case 'guru': return stage >= 5 && stage <= 6
          case 'master': return stage === 7
          case 'enlightened': return stage === 8
          case 'burned': return stage === 9
          default: return true
        }
      })
    }

    // Shuffle if enabled
    if (isShuffled) {
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed++) * 10000
        return x - Math.floor(x)
      }
      items = [...items].sort((a, b) => seededRandom(shuffleSeed + a.subject.id) - seededRandom(shuffleSeed + b.subject.id))
    }

    return items
  }, [subjects, assignmentMap, filter, isShuffled, shuffleSeed])

  const currentItem = practiceItems[currentIndex]

  // Fetch audio for current item
  const fetchAudio = useCallback(async (subjectId: number) => {
    if (audioCache.has(subjectId)) return audioCache.get(subjectId)
    
    setLoadingAudio(true)
    try {
      const details = await wanikaniService.getSubjectDetails(subjectId)
      if (details?.data.pronunciation_audios) {
        const audios = details.data.pronunciation_audios.filter(a => a.content_type === 'audio/mpeg')
        setAudioCache(prev => new Map(prev).set(subjectId, audios))
        return audios
      }
    } catch (error) {
      console.error('Failed to fetch audio:', error)
    } finally {
      setLoadingAudio(false)
    }
    return []
  }, [wanikaniService, audioCache])

  // Play audio
  const playAudio = useCallback(async () => {
    if (!currentItem) return
    
    let audios = audioCache.get(currentItem.subject.id)
    if (!audios) {
      audios = await fetchAudio(currentItem.subject.id)
    }
    
    if (!audios || audios.length === 0) return
    
    // Use first audio
    const audio = audios[0]
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
    }
    
    const audioElement = new Audio(audio.url)
    audioRef.current = audioElement
    setPlayingAudio(true)
    
    audioElement.onended = () => setPlayingAudio(false)
    audioElement.onerror = () => setPlayingAudio(false)
    audioElement.play().catch(() => setPlayingAudio(false))
  }, [currentItem, audioCache, fetchAudio])

  // Advance to next item (shared logic)
  const advanceToNextItem = useCallback((correct: boolean) => {
    stopListening()
    
    setSessionStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }))
    
    // Move to next item
    if (currentIndex < practiceItems.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsRevealed(false)
      setVoiceScore(null)
      resetTranscript()
    } else {
      setIsPracticing(false)
    }
  }, [currentIndex, practiceItems.length, stopListening, resetTranscript])

  // Store latest advanceToNextItem in a ref to avoid stale closures
  const advanceToNextItemRef = useRef(advanceToNextItem)
  useEffect(() => {
    advanceToNextItemRef.current = advanceToNextItem
  }, [advanceToNextItem])

  // Track processed transcript to prevent double processing  
  const processedTranscriptRef = useRef<string | null>(null)

  // Process voice recognition result
  useEffect(() => {
    if (!transcript || !currentItem || practiceMode !== 'voice' || isRevealed) return
    
    // Prevent double processing
    if (processedTranscriptRef.current === transcript) return
    processedTranscriptRef.current = transcript
    
    const readings = currentItem.subject.data.readings
      ?.filter(r => r.primary)
      .map(r => r.reading) || []
    
    if (readings.length === 0) return
    
    console.log('[ReadingPractice] Processing final transcript:', transcript)
    
    const score = matchesAnyReading(transcript, readings)
    if (score) {
      setVoiceScore(score)
      setIsRevealed(true)
      
      // Auto-advance after showing result
      const isCorrect = score.feedback === 'correct' || score.feedback === 'close'
      const timer = setTimeout(() => {
        advanceToNextItemRef.current(isCorrect)
      }, 2500)
      setAutoAdvanceTimer(timer)
    }
  }, [transcript, currentItem, practiceMode, isRevealed])

  // Reset processed refs when moving to next item
  useEffect(() => {
    processedTranscriptRef.current = null
  }, [currentIndex])

  // Handle manual voice-based assessment (for skipping auto-advance)
  const handleVoiceAssessment = useCallback((correct: boolean) => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      setAutoAdvanceTimer(null)
    }
    advanceToNextItem(correct)
  }, [autoAdvanceTimer, advanceToNextItem])

  // Reveal answer and play audio
  const handleReveal = useCallback(async () => {
    setIsRevealed(true)
    await playAudio()
  }, [playAudio])

  // Toggle voice recording
  const toggleVoiceRecording = useCallback(() => {
    if (isListening) {
      // When stopping, if we have interim but no final transcript, use interim
      if (interimTranscript && !transcript) {
        // The hook's onend handler should handle this, but trigger a check
        console.log('[ReadingPractice] Stopping with interim:', interimTranscript)
      }
      stopListening()
    } else {
      resetTranscript()
      setVoiceScore(null)
      startListening()
    }
  }, [isListening, startListening, stopListening, resetTranscript, interimTranscript, transcript])

  // Track if we've processed this interim result to prevent double processing
  const processedInterimRef = useRef<string | null>(null)

  // Also process interimTranscript when listening stops without a final transcript
  useEffect(() => {
    // When listening stops and we have an interim transcript but no final one
    if (!isListening && interimTranscript && !transcript && practiceMode === 'voice' && !isRevealed && currentItem) {
      // Prevent double processing of the same interim
      if (processedInterimRef.current === interimTranscript) {
        return
      }
      processedInterimRef.current = interimTranscript
      
      console.log('[ReadingPractice] Processing interim on stop:', interimTranscript)
      
      const readings = currentItem.subject.data.readings
        ?.filter(r => r.primary)
        .map(r => r.reading) || []
      
      if (readings.length > 0) {
        const score = matchesAnyReading(interimTranscript, readings)
        if (score) {
          setVoiceScore(score)
          setIsRevealed(true)
          // Don't call playAudio in effect - it causes issues
          // User can click play button manually
          
          const isCorrect = score.feedback === 'correct' || score.feedback === 'close'
          const timer = setTimeout(() => {
            advanceToNextItemRef.current(isCorrect)
          }, 2500)
          setAutoAdvanceTimer(timer)
        }
      }
    } else if (isListening) {
      // Reset when starting to listen again
      processedInterimRef.current = null
    }
  }, [isListening, interimTranscript, transcript, practiceMode, isRevealed, currentItem])

  // Handle self-assessment
  const handleAssessment = useCallback((correct: boolean) => {
    setSessionStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }))
    
    // Move to next item
    if (currentIndex < practiceItems.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsRevealed(false)
    } else {
      // End of session
      setIsPracticing(false)
    }
  }, [currentIndex, practiceItems.length])

  // Skip to next without assessment
  const handleSkip = useCallback(() => {
    if (currentIndex < practiceItems.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsRevealed(false)
    }
  }, [currentIndex, practiceItems.length])

  // Toggle shuffle
  const handleShuffle = useCallback(() => {
    setIsShuffled(prev => !prev)
    setShuffleSeed(Date.now())
    setCurrentIndex(0)
    setIsRevealed(false)
  }, [])

  // Start practice session
  const startPractice = useCallback(() => {
    setIsPracticing(true)
    setCurrentIndex(0)
    setIsRevealed(false)
    setSessionStats({ total: 0, correct: 0, incorrect: 0 })
    setVoiceScore(null)
    resetTranscript()
  }, [resetTranscript])

  // Handle enabling voice mode
  const handleEnableVoiceMode = useCallback(() => {
    if (!privacyAccepted) {
      setShowPrivacyNotice(true)
    } else {
      setPracticeMode('voice')
    }
  }, [privacyAccepted])

  // Accept privacy notice
  const acceptPrivacy = useCallback(() => {
    localStorage.setItem('voice-privacy-accepted', 'true')
    setPrivacyAccepted(true)
    setShowPrivacyNotice(false)
    setPracticeMode('voice')
  }, [])

  // Restart session
  const restartSession = useCallback(() => {
    setCurrentIndex(0)
    setIsRevealed(false)
    setSessionStats({ total: 0, correct: 0, incorrect: 0 })
    setIsPracticing(true)
  }, [])

  // Get SRS stage color
  const getSrsColor = (stage: number) => {
    if (stage >= 1 && stage <= 4) return 'bg-pink-500'
    if (stage >= 5 && stage <= 6) return 'bg-purple-500'
    if (stage === 7) return 'bg-blue-500'
    if (stage === 8) return 'bg-cyan-500'
    if (stage === 9) return 'bg-amber-500'
    return 'bg-gray-400'
  }

  // Session complete view
  if (isPracticing && currentIndex >= practiceItems.length && practiceItems.length > 0) {
    const accuracy = sessionStats.total > 0 
      ? Math.round((sessionStats.correct / sessionStats.total) * 100) 
      : 0

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-wanikani-text dark:text-wanikani-text-dark mb-2">
            {t('readingPractice.title')}
          </h3>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('readingPractice.subtitle')}
          </p>
        </div>

        <div className="bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-wanikani-card-dark rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h4 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark mb-4">
            {t('readingPractice.sessionComplete')}
          </h4>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-wanikani-card-dark rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-wanikani-text dark:text-wanikani-text-dark">{sessionStats.total}</div>
              <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('readingPractice.practiced')}</div>
            </div>
            <div className="bg-white dark:bg-wanikani-card-dark rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-500">{sessionStats.correct}</div>
              <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('readingPractice.correct')}</div>
            </div>
            <div className="bg-white dark:bg-wanikani-card-dark rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-wanikani-pink">{accuracy}%</div>
              <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('readingPractice.accuracy')}</div>
            </div>
          </div>
          <button
            onClick={restartSession}
            className="inline-flex items-center gap-2 px-6 py-3 bg-wanikani-pink hover:bg-pink-600 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('readingPractice.practiceAgain')}
          </button>
        </div>
      </div>
    )
  }

  // No items available
  if (practiceItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-wanikani-text dark:text-wanikani-text-dark mb-2">
            {t('readingPractice.title')}
          </h3>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('readingPractice.subtitle')}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-center gap-4">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="appearance-none pl-3 pr-8 py-2 border border-wanikani-border dark:border-wanikani-border-dark rounded-lg bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-wanikani-pink"
            >
              <option value="all">{t('vocabStudy.filterAll')}</option>
              <option value="apprentice">{t('vocabStudy.filterApprentice')}</option>
              <option value="guru">{t('vocabStudy.filterGuru')}</option>
              <option value="master">{t('vocabStudy.filterMaster')}</option>
              <option value="enlightened">{t('vocabStudy.filterEnlightened')}</option>
              <option value="burned">{t('vocabStudy.filterBurned')}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-wanikani-text-light pointer-events-none" />
          </div>
        </div>

        <div className="text-center py-12 text-wanikani-text-light dark:text-wanikani-text-light-dark">
          <div className="text-4xl mb-4">📚</div>
          <p>{t('readingPractice.noItems')}</p>
        </div>
      </div>
    )
  }

  // Start screen
  if (!isPracticing) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-wanikani-text dark:text-wanikani-text-dark mb-2">
            {t('readingPractice.title')}
          </h3>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('readingPractice.subtitle')}
          </p>
        </div>

        {/* Settings */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="appearance-none pl-3 pr-8 py-2 border border-wanikani-border dark:border-wanikani-border-dark rounded-lg bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-wanikani-pink"
            >
              <option value="all">{t('vocabStudy.filterAll')}</option>
              <option value="apprentice">{t('vocabStudy.filterApprentice')}</option>
              <option value="guru">{t('vocabStudy.filterGuru')}</option>
              <option value="master">{t('vocabStudy.filterMaster')}</option>
              <option value="enlightened">{t('vocabStudy.filterEnlightened')}</option>
              <option value="burned">{t('vocabStudy.filterBurned')}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-wanikani-text-light pointer-events-none" />
          </div>

          {/* Show meaning toggle */}
          <button
            onClick={() => setShowMeaning(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
              showMeaning
                ? 'bg-wanikani-pink/10 border-wanikani-pink text-wanikani-pink'
                : 'border-wanikani-border dark:border-wanikani-border-dark text-wanikani-text-light dark:text-wanikani-text-light-dark hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {showMeaning ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {t('readingPractice.showMeaning')}
          </button>

          {/* Shuffle toggle */}
          <button
            onClick={handleShuffle}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
              isShuffled
                ? 'bg-wanikani-pink/10 border-wanikani-pink text-wanikani-pink'
                : 'border-wanikani-border dark:border-wanikani-border-dark text-wanikani-text-light dark:text-wanikani-text-light-dark hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            {t('readingPractice.shuffle')}
          </button>

          {/* Voice mode toggle - only show if supported */}
          {voiceSupported && (
            <button
              onClick={practiceMode === 'voice' ? () => setPracticeMode('manual') : handleEnableVoiceMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                practiceMode === 'voice'
                  ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'border-wanikani-border dark:border-wanikani-border-dark text-wanikani-text-light dark:text-wanikani-text-light-dark hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {practiceMode === 'voice' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {t('readingPractice.voiceMode')}
            </button>
          )}
        </div>

        {/* Privacy Notice Modal */}
        {showPrivacyNotice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-wanikani-card-dark rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-wanikani-text dark:text-wanikani-text-dark mb-2">
                    {t('readingPractice.privacyTitle')}
                  </h3>
                  <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
                    {t('readingPractice.privacyMessage')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPrivacyNotice(false)}
                  className="px-4 py-2 text-sm border border-wanikani-border dark:border-wanikani-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-wanikani-text dark:text-wanikani-text-dark transition-colors"
                >
                  {t('readingPractice.decline')}
                </button>
                <button
                  onClick={acceptPrivacy}
                  className="px-4 py-2 text-sm bg-wanikani-pink hover:bg-pink-600 text-white rounded-lg transition-colors"
                >
                  {t('readingPractice.accept')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Item count and start button */}
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎤</div>
          <p className="text-wanikani-text-light dark:text-wanikani-text-light-dark mb-6">
            {t('readingPractice.itemsAvailable').replace('{count}', practiceItems.length.toString())}
          </p>
          <button
            onClick={startPractice}
            className="px-8 py-3 bg-wanikani-pink hover:bg-pink-600 text-white rounded-lg transition-colors text-lg font-semibold"
          >
            {t('readingPractice.startPractice')}
          </button>
        </div>
      </div>
    )
  }

  // Practice view
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-wanikani-text dark:text-wanikani-text-dark mb-2">
          {t('readingPractice.title')}
        </h3>
        <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
          {t('readingPractice.subtitle')}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-wanikani-pink transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / practiceItems.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark whitespace-nowrap">
          {currentIndex + 1} / {practiceItems.length}
        </span>
      </div>

      {/* Session stats mini */}
      {sessionStats.total > 0 && (
        <div className="flex justify-center gap-6 text-sm">
          <span className="text-green-500">✓ {sessionStats.correct}</span>
          <span className="text-red-500">✗ {sessionStats.incorrect}</span>
        </div>
      )}

      {/* Current card */}
      {currentItem && (
        <div className="bg-gradient-to-b from-purple-50 to-white dark:from-purple-900/20 dark:to-wanikani-card-dark rounded-xl p-8 text-center">
          {/* SRS indicator */}
          <div className="flex justify-center mb-4">
            <span className={`px-2 py-0.5 rounded text-xs text-white ${getSrsColor(currentItem.srsStage)}`}>
              {t('common.level')} {currentItem.subject.data.level}
            </span>
          </div>

          {/* Vocabulary word */}
          <div className="text-6xl font-bold text-wanikani-text dark:text-wanikani-text-dark mb-4">
            {currentItem.subject.data.characters}
          </div>

          {/* Meaning (optional) */}
          {showMeaning && (
            <div className="text-lg text-wanikani-text-light dark:text-wanikani-text-light-dark mb-6">
              {currentItem.subject.data.meanings?.filter(m => m.primary).map(m => m.meaning).join(', ')}
            </div>
          )}

          {/* Instruction */}
          {!isRevealed && practiceMode === 'manual' && (
            <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark mb-6 italic">
              {t('readingPractice.instruction')}
            </p>
          )}

          {/* Voice mode instruction and microphone */}
          {!isRevealed && practiceMode === 'voice' && (
            <div className="mb-6 space-y-4">
              <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark italic">
                {t('readingPractice.voiceInstruction')}
              </p>
              
              {/* Microphone button */}
              <button
                onClick={toggleVoiceRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-200 dark:ring-red-800' 
                    : 'bg-wanikani-pink hover:bg-pink-600'
                } text-white`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              
              {/* Interim transcript display */}
              {interimTranscript && (
                <div className="text-lg text-wanikani-text-light dark:text-wanikani-text-light-dark animate-pulse">
                  {interimTranscript}
                </div>
              )}
              
              {/* Voice error display */}
              {voiceError && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  {voiceError === 'no-speech' && t('readingPractice.noSpeech')}
                  {voiceError === 'not-allowed' && t('readingPractice.micNotAllowed')}
                  {voiceError === 'network' && t('readingPractice.networkError')}
                  {!['no-speech', 'not-allowed', 'network'].includes(voiceError) && voiceError}
                </div>
              )}
            </div>
          )}

          {/* Revealed reading */}
          {isRevealed && (
            <div className="space-y-4 mb-6">
              {/* Voice score feedback */}
              {practiceMode === 'voice' && voiceScore && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  voiceScore.feedback === 'correct' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : voiceScore.feedback === 'close'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {voiceScore.feedback === 'correct' && <Check className="w-4 h-4" />}
                  {voiceScore.feedback === 'close' && '△'}
                  {voiceScore.feedback === 'incorrect' && <X className="w-4 h-4" />}
                  <span>
                    {voiceScore.feedback === 'correct' && t('readingPractice.voiceCorrect')}
                    {voiceScore.feedback === 'close' && t('readingPractice.voiceClose')}
                    {voiceScore.feedback === 'incorrect' && t('readingPractice.voiceIncorrect')}
                  </span>
                  <span className="text-xs opacity-75">({voiceScore.similarityScore}%)</span>
                </div>
              )}
              
              {/* Show what was spoken */}
              {practiceMode === 'voice' && transcript && (
                <div className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
                  {t('readingPractice.youSaid')}: <span className="font-medium">{transcript}</span>
                </div>
              )}
              
              <div className="text-3xl text-wanikani-pink font-medium">
                {currentItem.subject.data.readings?.filter(r => r.primary).map(r => r.reading).join(', ')}
              </div>
              
              {/* Play audio button */}
              <button
                onClick={playAudio}
                disabled={loadingAudio || playingAudio}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  playingAudio
                    ? 'bg-wanikani-pink text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-wanikani-text dark:text-wanikani-text-dark'
                }`}
              >
                <Volume2 className={`w-5 h-5 ${playingAudio ? 'animate-pulse' : ''}`} />
                {loadingAudio ? t('loading') : t('readingPractice.playAgain')}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-center gap-3">
            {!isRevealed ? (
              <>
                <button
                  onClick={handleReveal}
                  className="flex items-center gap-2 px-6 py-3 bg-wanikani-pink hover:bg-pink-600 text-white rounded-lg transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  {t('readingPractice.reveal')}
                </button>
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-2 px-4 py-3 border border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-50 dark:hover:bg-gray-700 text-wanikani-text-light dark:text-wanikani-text-light-dark rounded-lg transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                  {t('readingPractice.skip')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAssessment(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <Check className="w-5 h-5" />
                  {t('readingPractice.gotIt')}
                </button>
                <button
                  onClick={() => handleAssessment(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                  {t('readingPractice.missedIt')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* End session button */}
      <div className="text-center">
        <button
          onClick={() => setIsPracticing(false)}
          className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark hover:text-wanikani-pink transition-colors"
        >
          {t('readingPractice.endSession')}
        </button>
      </div>
    </div>
  )
}
