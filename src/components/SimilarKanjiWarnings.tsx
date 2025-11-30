'use client'

import { useMemo, useState } from 'react'
import type { ReviewStatistic, Subject } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'

interface SimilarKanjiWarningsProps {
  subjects: Subject[]
  reviewStats: ReviewStatistic[]
}

interface KanjiPair {
  kanji1: {
    id: number
    character: string
    meaning: string
    errors: number
    link?: string
  }
  kanji2: {
    id: number
    character: string
    meaning: string
    errors: number
    link?: string
  }
  combinedErrors: number
}

const ITEMS_PER_PAGE = 10

export default function SimilarKanjiWarnings({ subjects, reviewStats }: SimilarKanjiWarningsProps) {
  const { t } = useLanguage()
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)

  const similarPairs = useMemo(() => {
    // Create lookup maps
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const errorsBySubjectId = new Map<number, number>()
    
    // Build error count map from review stats
    for (const stat of reviewStats) {
      if (stat.data.hidden) continue
      const errors = stat.data.meaning_incorrect + stat.data.reading_incorrect
      errorsBySubjectId.set(stat.data.subject_id, errors)
    }

    // Track pairs we've already seen to avoid duplicates (A-B and B-A)
    const seenPairs = new Set<string>()
    const pairs: KanjiPair[] = []

    // Find all kanji with visually similar pairs
    for (const subject of subjects) {
      if (subject.object !== 'kanji') continue
      if (!subject.data.visually_similar_subject_ids?.length) continue
      if (!subject.data.characters) continue

      const kanji1Errors = errorsBySubjectId.get(subject.id) ?? 0
      const kanji1Meaning = subject.data.meanings?.[0]?.meaning ?? ''

      for (const similarId of subject.data.visually_similar_subject_ids) {
        // Create a normalized key to avoid duplicates
        const pairKey = [subject.id, similarId].sort((a, b) => a - b).join('-')
        if (seenPairs.has(pairKey)) continue
        seenPairs.add(pairKey)

        const similarSubject = subjectById.get(similarId)
        if (!similarSubject || similarSubject.object !== 'kanji') continue
        if (!similarSubject.data.characters) continue

        const kanji2Errors = errorsBySubjectId.get(similarId) ?? 0
        const kanji2Meaning = similarSubject.data.meanings?.[0]?.meaning ?? ''
        const combinedErrors = kanji1Errors + kanji2Errors

        // Only include pairs where at least one kanji has been reviewed (has errors or is in stats)
        if (!errorsBySubjectId.has(subject.id) && !errorsBySubjectId.has(similarId)) continue

        pairs.push({
          kanji1: {
            id: subject.id,
            character: subject.data.characters,
            meaning: kanji1Meaning,
            errors: kanji1Errors,
            link: subject.data.document_url
          },
          kanji2: {
            id: similarId,
            character: similarSubject.data.characters,
            meaning: kanji2Meaning,
            errors: kanji2Errors,
            link: similarSubject.data.document_url
          },
          combinedErrors
        })
      }
    }

    // Sort by combined errors (most confusing first)
    return pairs.sort((a, b) => b.combinedErrors - a.combinedErrors)
  }, [subjects, reviewStats])

  const displayedPairs = similarPairs.slice(0, displayCount)
  const hasMore = similarPairs.length > displayCount
  const remaining = similarPairs.length - displayCount

  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, similarPairs.length))
  }

  return (
    <div className="wk-card rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-wanikani-text dark:text-wanikani-text-dark">
            {t('similarKanji.title')} 👯
          </h2>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('similarKanji.subtitle')}
          </p>
        </div>
        <div className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
          {t('similarKanji.count').replace('{count}', String(similarPairs.length))}
        </div>
      </div>

      {similarPairs.length === 0 ? (
        <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
          <span>✓</span>
          {t('similarKanji.noPairs')}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayedPairs.map((pair) => (
              <div
                key={`${pair.kanji1.id}-${pair.kanji2.id}`}
                className="flex items-center gap-4 p-3 rounded-lg border border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {/* Kanji 1 */}
                <div className="flex-1 text-center">
                  {pair.kanji1.link ? (
                    <a
                      href={pair.kanji1.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block"
                    >
                      <div className="text-3xl font-bold text-white bg-wanikani-kanji rounded-lg px-3 py-2 hover:ring-2 hover:ring-wanikani-cyan/50 transition-all">
                        {pair.kanji1.character}
                      </div>
                    </a>
                  ) : (
                    <div className="text-3xl font-bold text-white bg-wanikani-kanji rounded-lg px-3 py-2 inline-block">
                      {pair.kanji1.character}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark truncate max-w-[100px] mx-auto">
                    {pair.kanji1.meaning}
                  </div>
                  {pair.kanji1.errors > 0 && (
                    <div className="text-xs text-red-500 mt-0.5">
                      {pair.kanji1.errors} {t('similarKanji.errors')}
                    </div>
                  )}
                </div>

                {/* VS divider */}
                <div className="flex-shrink-0 text-wanikani-text-light dark:text-wanikani-text-light-dark text-sm font-medium">
                  {t('similarKanji.vsLabel')}
                </div>

                {/* Kanji 2 */}
                <div className="flex-1 text-center">
                  {pair.kanji2.link ? (
                    <a
                      href={pair.kanji2.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block"
                    >
                      <div className="text-3xl font-bold text-white bg-wanikani-kanji rounded-lg px-3 py-2 hover:ring-2 hover:ring-wanikani-cyan/50 transition-all">
                        {pair.kanji2.character}
                      </div>
                    </a>
                  ) : (
                    <div className="text-3xl font-bold text-white bg-wanikani-kanji rounded-lg px-3 py-2 inline-block">
                      {pair.kanji2.character}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark truncate max-w-[100px] mx-auto">
                    {pair.kanji2.meaning}
                  </div>
                  {pair.kanji2.errors > 0 && (
                    <div className="text-xs text-red-500 mt-0.5">
                      {pair.kanji2.errors} {t('similarKanji.errors')}
                    </div>
                  )}
                </div>

                {/* Combined error badge */}
                <div className="flex-shrink-0">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    pair.combinedErrors >= 10
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : pair.combinedErrors >= 5
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-wanikani-text-light dark:text-wanikani-text-light-dark'
                  }`}>
                    {pair.combinedErrors}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show more button */}
          {hasMore && (
            <button
              onClick={loadMore}
              className="mt-4 w-full py-2 text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark hover:text-wanikani-text dark:hover:text-wanikani-text-dark border border-wanikani-border dark:border-wanikani-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('similarKanji.showMore').replace('{count}', String(Math.min(ITEMS_PER_PAGE, remaining)))}
            </button>
          )}
        </>
      )}
    </div>
  )
}
