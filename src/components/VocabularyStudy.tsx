'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { Search, Volume2, VolumeX, ChevronDown, ChevronUp, BookOpen, Lightbulb, ExternalLink } from 'lucide-react'
import type { Subject, Assignment, ContextSentence, PronunciationAudio } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { WaniKaniService } from '@/services/wanikani'
import { useWanaKanaBind } from '@/hooks/useWanaKana'

interface VocabularyStudyProps {
  subjects: Subject[]
  assignments: Assignment[]
  apiToken: string
}

type FilterType = 'all' | 'apprentice' | 'guru' | 'master' | 'enlightened' | 'burned'

interface VocabItemDetails {
  context_sentences?: ContextSentence[]
  pronunciation_audios?: PronunciationAudio[]
  meaning_mnemonic?: string
  reading_mnemonic?: string
  parts_of_speech?: string[]
}

export default function VocabularyStudy({ subjects, assignments, apiToken }: VocabularyStudyProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showFurigana, setShowFurigana] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null)
  const [itemDetails, setItemDetails] = useState<Map<number, VocabItemDetails>>(new Map())
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const { enabled: kanaEnabled, toggle: toggleKana } = useWanaKanaBind(searchInputRef, { enabled: false })

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

  // Filter vocabulary subjects
  const vocabularyItems = useMemo(() => {
    return subjects.filter(s => 
      s.object === 'vocabulary' || s.object === 'kana_vocabulary'
    )
  }, [subjects])

  // Apply search and filter
  const filteredItems = useMemo(() => {
    let items = vocabularyItems

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(s => {
        const chars = s.data.characters?.toLowerCase() || ''
        const meanings = s.data.meanings?.map(m => m.meaning.toLowerCase()).join(' ') || ''
        const readings = s.data.readings?.map(r => r.reading.toLowerCase()).join(' ') || ''
        return chars.includes(query) || meanings.includes(query) || readings.includes(query)
      })
    }

    // SRS stage filter
    if (filter !== 'all') {
      items = items.filter(s => {
        const stage = assignmentMap.get(s.id) ?? -1
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

    return items
  }, [vocabularyItems, searchQuery, filter, assignmentMap])

  const visibleItems = filteredItems.slice(0, visibleCount)
  const hasMore = filteredItems.length > visibleCount

  // Get SRS stage color
  const getSrsColor = (subjectId: number) => {
    const stage = assignmentMap.get(subjectId) ?? -1
    if (stage >= 1 && stage <= 4) return 'bg-pink-500'
    if (stage >= 5 && stage <= 6) return 'bg-purple-500'
    if (stage === 7) return 'bg-blue-500'
    if (stage === 8) return 'bg-cyan-500'
    if (stage === 9) return 'bg-amber-500'
    return 'bg-gray-400'
  }

  // Fetch details on-demand
  const fetchDetails = useCallback(async (subjectId: number) => {
    if (itemDetails.has(subjectId)) return
    
    setLoadingDetails(subjectId)
    try {
      const service = new WaniKaniService(apiToken)
      const details = await service.getSubjectDetails(subjectId)
      if (details) {
        setItemDetails(prev => new Map(prev).set(subjectId, {
          context_sentences: details.data.context_sentences,
          pronunciation_audios: details.data.pronunciation_audios,
          meaning_mnemonic: details.data.meaning_mnemonic,
          reading_mnemonic: details.data.reading_mnemonic,
          parts_of_speech: details.data.parts_of_speech
        }))
      }
    } catch (error) {
      console.error('Failed to fetch details:', error)
    } finally {
      setLoadingDetails(null)
    }
  }, [apiToken, itemDetails])

  // Toggle expansion
  const toggleExpand = async (subjectId: number) => {
    if (expandedId === subjectId) {
      setExpandedId(null)
    } else {
      setExpandedId(subjectId)
      await fetchDetails(subjectId)
    }
  }

  // Play audio
  const playAudio = useCallback((audio: PronunciationAudio) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    
    const audioElement = new Audio(audio.url)
    audioRef.current = audioElement
    setPlayingAudio(audio.url)
    
    audioElement.onended = () => setPlayingAudio(null)
    audioElement.onerror = () => setPlayingAudio(null)
    audioElement.play().catch(() => setPlayingAudio(null))
  }, [])

  // Render context sentence with furigana toggle
  const renderSentence = (sentence: ContextSentence) => {
    return (
      <div className="border-l-2 border-purple-300 dark:border-purple-600 pl-3 py-2">
        <p 
          className={`text-gray-900 dark:text-white text-lg ${!showFurigana ? 'hide-furigana' : ''}`}
          dangerouslySetInnerHTML={{ __html: sentence.ja }}
        />
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{sentence.en}</p>
      </div>
    )
  }

  // Render mnemonic with WK markup
  const renderMnemonic = (text: string) => {
    // WaniKani uses tags like <radical>...</radical>, <kanji>...</kanji>, <vocabulary>...</vocabulary>, <reading>...</reading>
    let html = text
      .replace(/<radical>([^<]+)<\/radical>/g, '<span class="bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 px-1 rounded">$1</span>')
      .replace(/<kanji>([^<]+)<\/kanji>/g, '<span class="bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 px-1 rounded">$1</span>')
      .replace(/<vocabulary>([^<]+)<\/vocabulary>/g, '<span class="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1 rounded">$1</span>')
      .replace(/<reading>([^<]+)<\/reading>/g, '<span class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1 rounded font-mono">$1</span>')
      .replace(/<ja>([^<]+)<\/ja>/g, '<span class="font-japanese">$1</span>')
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <div className="space-y-4">
      {/* CSS for hiding furigana */}
      <style jsx global>{`
        .hide-furigana ruby rt,
        .hide-furigana ruby rp {
          visibility: hidden;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('vocabStudy.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('vocabStudy.subtitle')} · {filteredItems.length} {t('vocabStudy.items')}
          </p>
        </div>
        
        {/* Furigana Toggle */}
        <button
          onClick={() => setShowFurigana(!showFurigana)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            showFurigana
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {showFurigana ? t('vocabStudy.hideFurigana') : t('vocabStudy.showFurigana')}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(20) }}
            placeholder={t('vocabStudy.searchPlaceholder')}
            className="w-full pl-10 pr-20 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
          <button
            onClick={toggleKana}
            className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded transition-colors ${
              kanaEnabled
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}
            title={kanaEnabled ? t('dependencyTree.kanaModeOn') : t('dependencyTree.kanaModeOff')}
          >
            {kanaEnabled ? 'かな' : 'ABC'}
          </button>
        </div>
        
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as FilterType); setVisibleCount(20) }}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">{t('vocabStudy.filterAll')}</option>
          <option value="apprentice">{t('vocabStudy.filterApprentice')}</option>
          <option value="guru">{t('vocabStudy.filterGuru')}</option>
          <option value="master">{t('vocabStudy.filterMaster')}</option>
          <option value="enlightened">{t('vocabStudy.filterEnlightened')}</option>
          <option value="burned">{t('vocabStudy.filterBurned')}</option>
        </select>
      </div>

      {/* Vocabulary List */}
      <div className="space-y-2">
        {visibleItems.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('vocabStudy.noResults')}
          </p>
        ) : (
          visibleItems.map(item => {
            const isExpanded = expandedId === item.id
            const details = itemDetails.get(item.id)
            const isLoading = loadingDetails === item.id
            
            return (
              <div 
                key={item.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
              >
                {/* Header Row */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  {/* Character */}
                  <span className={`${getSrsColor(item.id)} text-white px-3 py-2 rounded text-xl font-bold min-w-[80px] text-center`}>
                    {item.data.characters}
                  </span>
                  
                  {/* Meanings & Readings */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium truncate">
                      {item.data.meanings?.filter(m => m.primary).map(m => m.meaning).join(', ')}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
                      {item.data.readings?.filter(r => r.primary).map(r => r.reading).join(', ')}
                    </p>
                  </div>
                  
                  {/* Expand Icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    ) : details ? (
                      <>
                        {/* Parts of Speech */}
                        {details.parts_of_speech && details.parts_of_speech.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {details.parts_of_speech.map((pos, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                {pos}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Audio Players */}
                        {details.pronunciation_audios && details.pronunciation_audios.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Volume2 className="w-4 h-4" />
                              {t('vocabStudy.pronunciation')}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {details.pronunciation_audios
                                .filter(a => a.content_type === 'audio/mpeg')
                                .map((audio, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); playAudio(audio) }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                      playingAudio === audio.url
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {playingAudio === audio.url ? (
                                      <VolumeX className="w-4 h-4" />
                                    ) : (
                                      <Volume2 className="w-4 h-4" />
                                    )}
                                    {audio.metadata.voice_actor_name}
                                    <span className="text-xs opacity-70">
                                      ({audio.metadata.gender === 'male' ? '♂' : '♀'})
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Context Sentences */}
                        {details.context_sentences && details.context_sentences.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              {t('vocabStudy.contextSentences')}
                            </h4>
                            <div className="space-y-3">
                              {details.context_sentences.map((sentence, idx) => (
                                <div key={idx}>
                                  {renderSentence(sentence)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Meaning Mnemonic */}
                        {details.meaning_mnemonic && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              {t('vocabStudy.meaningMnemonic')}
                            </h4>
                            <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                              {renderMnemonic(details.meaning_mnemonic)}
                            </div>
                          </div>
                        )}

                        {/* Reading Mnemonic */}
                        {details.reading_mnemonic && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              {t('vocabStudy.readingMnemonic')}
                            </h4>
                            <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                              {renderMnemonic(details.reading_mnemonic)}
                            </div>
                          </div>
                        )}

                        {/* Link to WaniKani */}
                        {item.data.document_url && (
                          <a
                            href={item.data.document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t('vocabStudy.viewOnWK')}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        {t('vocabStudy.loadError')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount(prev => prev + 20)}
          className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          {t('vocabStudy.showMore')}
        </button>
      )}
    </div>
  )
}
