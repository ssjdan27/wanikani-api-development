'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { Subject, Assignment } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface BurnedItemsGalleryProps {
  subjects: Subject[]
  assignments: Assignment[]
}

type FilterType = 'all' | 'radical' | 'kanji' | 'vocabulary'
type SortType = 'newest' | 'oldest' | 'level' | 'character'

interface BurnedItem {
  subjectId: number
  character: string
  meaning: string
  readings: string[]
  type: string
  level: number
  burnedAt: Date
  documentUrl?: string
}

const ITEMS_PER_PAGE = 100

const getSubjectColor = (type: string): string => {
  switch (type) {
    case 'radical': return 'bg-wanikani-radical'
    case 'kanji': return 'bg-wanikani-kanji'
    case 'vocabulary':
    case 'kana_vocabulary': return 'bg-wanikani-vocabulary'
    default: return 'bg-gray-500'
  }
}

export default function BurnedItemsGallery({ subjects, assignments }: BurnedItemsGalleryProps) {
  const { t } = useLanguage()
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortType, setSortType] = useState<SortType>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)

  // Build burned items list
  const burnedItems = useMemo(() => {
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const items: BurnedItem[] = []

    for (const assignment of assignments) {
      if (assignment.data.hidden || !assignment.data.burned_at) continue

      const subject = subjectById.get(assignment.data.subject_id)
      if (!subject) continue

      const character = subject.data.characters || subject.data.slug || '?'
      const meaning = subject.data.meanings?.find(m => m.primary)?.meaning || 
                      subject.data.meanings?.[0]?.meaning || ''
      const readings = subject.data.readings?.filter(r => r.primary).map(r => r.reading) || []

      items.push({
        subjectId: subject.id,
        character,
        meaning,
        readings,
        type: subject.object,
        level: subject.data.level,
        burnedAt: new Date(assignment.data.burned_at),
        documentUrl: subject.data.document_url
      })
    }

    return items
  }, [subjects, assignments])

  // Calculate stats by type
  const stats = useMemo(() => {
    const radicals = burnedItems.filter(i => i.type === 'radical').length
    const kanji = burnedItems.filter(i => i.type === 'kanji').length
    const vocabulary = burnedItems.filter(i => i.type === 'vocabulary' || i.type === 'kana_vocabulary').length
    return { total: burnedItems.length, radicals, kanji, vocabulary }
  }, [burnedItems])

  // Get milestone badge
  const getMilestoneBadge = (): string | null => {
    if (stats.total >= 2000) return t('burnGallery.milestone2000')
    if (stats.total >= 1000) return t('burnGallery.milestone1000')
    if (stats.total >= 500) return t('burnGallery.milestone500')
    if (stats.total >= 100) return t('burnGallery.milestone100')
    return null
  }

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...burnedItems]

    // Filter by type
    if (filterType !== 'all') {
      items = items.filter(i => {
        if (filterType === 'vocabulary') {
          return i.type === 'vocabulary' || i.type === 'kana_vocabulary'
        }
        return i.type === filterType
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(i => 
        i.character.toLowerCase().includes(query) ||
        i.meaning.toLowerCase().includes(query) ||
        i.readings.some(r => r.includes(query))
      )
    }

    // Sort
    switch (sortType) {
      case 'newest':
        items.sort((a, b) => b.burnedAt.getTime() - a.burnedAt.getTime())
        break
      case 'oldest':
        items.sort((a, b) => a.burnedAt.getTime() - b.burnedAt.getTime())
        break
      case 'level':
        items.sort((a, b) => a.level - b.level || a.burnedAt.getTime() - b.burnedAt.getTime())
        break
      case 'character':
        items.sort((a, b) => a.character.localeCompare(b.character, 'ja'))
        break
    }

    return items
  }, [burnedItems, filterType, sortType, searchQuery])

  const displayedItems = filteredItems.slice(0, displayCount)
  const hasMore = filteredItems.length > displayCount
  const remaining = filteredItems.length - displayCount
  const milestoneBadge = getMilestoneBadge()

  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredItems.length))
  }

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
              {t('burnGallery.totalBurned').replace('{count}', stats.total.toLocaleString())}
            </span>
            {milestoneBadge && (
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium">
                {milestoneBadge}
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-1 text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-wanikani-radical"></span>
              {t('burnGallery.radicals')}: {stats.radicals}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-wanikani-kanji"></span>
              {t('burnGallery.kanji')}: {stats.kanji}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-wanikani-vocabulary"></span>
              {t('burnGallery.vocabulary')}: {stats.vocabulary}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wanikani-text-light" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setDisplayCount(ITEMS_PER_PAGE)
            }}
            placeholder={t('burnGallery.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 text-sm border border-wanikani-border dark:border-wanikani-border-dark rounded-lg bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark focus:outline-none focus:ring-2 focus:ring-wanikani-pink"
          />
        </div>

        {/* Filter */}
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as FilterType)
            setDisplayCount(ITEMS_PER_PAGE)
          }}
          className="px-3 py-2 text-sm border border-wanikani-border dark:border-wanikani-border-dark rounded-lg bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark focus:outline-none focus:ring-2 focus:ring-wanikani-pink"
        >
          <option value="all">{t('burnGallery.filterAll')}</option>
          <option value="radical">{t('burnGallery.filterRadicals')}</option>
          <option value="kanji">{t('burnGallery.filterKanji')}</option>
          <option value="vocabulary">{t('burnGallery.filterVocab')}</option>
        </select>

        {/* Sort */}
        <select
          value={sortType}
          onChange={(e) => {
            setSortType(e.target.value as SortType)
            setDisplayCount(ITEMS_PER_PAGE)
          }}
          className="px-3 py-2 text-sm border border-wanikani-border dark:border-wanikani-border-dark rounded-lg bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark focus:outline-none focus:ring-2 focus:ring-wanikani-pink"
        >
          <option value="newest">{t('burnGallery.sortNewest')}</option>
          <option value="oldest">{t('burnGallery.sortOldest')}</option>
          <option value="level">{t('burnGallery.sortLevel')}</option>
          <option value="character">{t('burnGallery.sortCharacter')}</option>
        </select>
      </div>

      {/* Gallery Grid */}
      {burnedItems.length === 0 ? (
        <div className="text-center py-12 text-wanikani-text-light dark:text-wanikani-text-light-dark">
          {t('burnGallery.noBurned')}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-wanikani-text-light dark:text-wanikani-text-light-dark">
          {t('dependencyTree.noResults')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {displayedItems.map((item) => (
              <a
                key={item.subjectId}
                href={item.documentUrl}
                target="_blank"
                rel="noreferrer"
                className={`group relative aspect-square flex items-center justify-center rounded-lg ${getSubjectColor(item.type)} text-white font-bold hover:ring-2 hover:ring-wanikani-gold hover:scale-105 transition-all cursor-pointer`}
                title={`${item.meaning}${item.readings.length > 0 ? ` (${item.readings.join(', ')})` : ''}\n${t('burnGallery.level')} ${item.level}\n${t('burnGallery.burned')}: ${format(item.burnedAt, 'PPP')}`}
              >
                <span className={`${item.character.length > 2 ? 'text-xs' : item.character.length > 1 ? 'text-sm' : 'text-lg'}`}>
                  {item.character}
                </span>
                
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 hidden sm:block">
                  <div className="font-bold">{item.character}</div>
                  <div>{item.meaning}</div>
                  {item.readings.length > 0 && (
                    <div className="text-gray-300">{item.readings.join(', ')}</div>
                  )}
                  <div className="text-gray-400 mt-1">
                    {t('burnGallery.level')} {item.level} • {formatDistanceToNow(item.burnedAt, { addSuffix: true })}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </a>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-2 text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark hover:text-wanikani-text dark:hover:text-wanikani-text-dark border border-wanikani-border dark:border-wanikani-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('burnGallery.showMore').replace('{count}', String(Math.min(ITEMS_PER_PAGE, remaining)))}
            </button>
          )}
        </>
      )}
    </div>
  )
}
