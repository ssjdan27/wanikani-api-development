'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Volume2, Eye, EyeOff, SkipForward, Shuffle, RotateCcw, ChevronDown, Check, X } from 'lucide-react'
import type { Subject, Assignment, PronunciationAudio } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { WaniKaniService } from '@/services/wanikani'

interface ReadingAloudPracticeProps {
  subjects: Subject[]
  assignments: Assignment[]
  apiToken: string
}

type FilterType = 'all' | 'apprentice' | 'guru' | 'master' | 'enlightened' | 'burned'

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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Memoize the WaniKani service
  const wanikaniService = useMemo(() => new WaniKaniService(apiToken), [apiToken])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current = null
      }
    }
  }, [])

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

  // Reveal answer and play audio
  const handleReveal = useCallback(async () => {
    setIsRevealed(true)
    await playAudio()
  }, [playAudio])

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
        </div>

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
          {!isRevealed && (
            <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark mb-6 italic">
              {t('readingPractice.instruction')}
            </p>
          )}

          {/* Revealed reading */}
          {isRevealed && (
            <div className="space-y-4 mb-6">
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
