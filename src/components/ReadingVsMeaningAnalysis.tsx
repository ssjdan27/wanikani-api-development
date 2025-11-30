'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Subject, ReviewStatistic } from '../types/wanikani';

interface Props {
  reviewStats: ReviewStatistic[];
  subjects: Subject[];
}

type WeakType = 'meaning' | 'reading';

export default function ReadingVsMeaningAnalysis({ reviewStats, subjects }: Props) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<WeakType>('meaning');
  const [visibleCount, setVisibleCount] = useState(10);

  const subjectMap = useMemo(() => {
    const map = new Map<number, Subject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  const analysis = useMemo(() => {
    let totalMeaningErrors = 0;
    let totalReadingErrors = 0;
    let kanjiMeaningErrors = 0;
    let kanjiReadingErrors = 0;
    let vocabMeaningErrors = 0;
    let vocabReadingErrors = 0;

    const itemsWithGap: Array<{
      subject: Subject;
      meaningErrors: number;
      readingErrors: number;
      gap: number;
      weakType: WeakType;
    }> = [];

    reviewStats.forEach(stat => {
      const subject = subjectMap.get(stat.data.subject_id);
      if (!subject) return;
      
      // Only kanji and vocabulary have both reading and meaning
      if (subject.object !== 'kanji' && subject.object !== 'vocabulary') return;

      const meaningErr = stat.data.meaning_incorrect || 0;
      const readingErr = stat.data.reading_incorrect || 0;

      totalMeaningErrors += meaningErr;
      totalReadingErrors += readingErr;

      if (subject.object === 'kanji') {
        kanjiMeaningErrors += meaningErr;
        kanjiReadingErrors += readingErr;
      } else {
        vocabMeaningErrors += meaningErr;
        vocabReadingErrors += readingErr;
      }

      // Only include items with errors and a clear weak side (not ties)
      if ((meaningErr > 0 || readingErr > 0) && meaningErr !== readingErr) {
        const gap = Math.abs(meaningErr - readingErr);
        itemsWithGap.push({
          subject,
          meaningErrors: meaningErr,
          readingErrors: readingErr,
          gap,
          weakType: meaningErr > readingErr ? 'meaning' : 'reading'
        });
      }
    });

    // Sort by gap (biggest weakness first)
    const meaningWeakItems = itemsWithGap
      .filter(i => i.weakType === 'meaning')
      .sort((a, b) => b.meaningErrors - a.meaningErrors);
    
    const readingWeakItems = itemsWithGap
      .filter(i => i.weakType === 'reading')
      .sort((a, b) => b.readingErrors - a.readingErrors);

    return {
      totalMeaningErrors,
      totalReadingErrors,
      kanjiMeaningErrors,
      kanjiReadingErrors,
      vocabMeaningErrors,
      vocabReadingErrors,
      meaningWeakItems,
      readingWeakItems
    };
  }, [reviewStats, subjectMap]);

  const totalErrors = analysis.totalMeaningErrors + analysis.totalReadingErrors;
  const meaningPercent = totalErrors > 0 ? (analysis.totalMeaningErrors / totalErrors) * 100 : 50;
  const readingPercent = totalErrors > 0 ? (analysis.totalReadingErrors / totalErrors) * 100 : 50;

  // Determine recommendation
  const getRecommendation = () => {
    if (totalErrors === 0) return '';
    const diff = Math.abs(meaningPercent - readingPercent);
    if (diff < 10) return t('readingMeaning.balanced');
    return meaningPercent > readingPercent 
      ? t('readingMeaning.meaningWeak')
      : t('readingMeaning.readingWeak');
  };

  const activeItems = activeTab === 'meaning' 
    ? analysis.meaningWeakItems 
    : analysis.readingWeakItems;
  const visibleItems = activeItems.slice(0, visibleCount);
  const hasMore = activeItems.length > visibleCount;

  const getSubjectColor = (type: string) => {
    switch (type) {
      case 'kanji': return 'bg-pink-500';
      case 'vocabulary': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Mini ratio bar for breakdown
  const RatioBar = ({ meaning, reading, label }: { meaning: number; reading: number; label: string }) => {
    const total = meaning + reading;
    const mPct = total > 0 ? (meaning / total) * 100 : 50;
    const rPct = total > 0 ? (reading / total) * 100 : 50;
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{label}</span>
          <span>{meaning} / {reading}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
          <div 
            className="bg-orange-500 transition-all" 
            style={{ width: `${mPct}%` }}
          />
          <div 
            className="bg-blue-500 transition-all" 
            style={{ width: `${rPct}%` }}
          />
        </div>
      </div>
    );
  };

  if (totalErrors === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          {t('readingMeaning.title')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">{t('readingMeaning.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">
        {t('readingMeaning.title')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('readingMeaning.subtitle')}
      </p>

      {/* Main Ratio Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-orange-600 dark:text-orange-400 font-medium">
            {t('readingMeaning.meaningErrors')}: {analysis.totalMeaningErrors} ({meaningPercent.toFixed(1)}%)
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {t('readingMeaning.readingErrors')}: {analysis.totalReadingErrors} ({readingPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="h-4 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
          <div 
            className="bg-orange-500 transition-all duration-500" 
            style={{ width: `${meaningPercent}%` }}
          />
          <div 
            className="bg-blue-500 transition-all duration-500" 
            style={{ width: `${readingPercent}%` }}
          />
        </div>
      </div>

      {/* Recommendation */}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        {getRecommendation()}
      </p>

      {/* Breakdown by Type */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <RatioBar 
          meaning={analysis.kanjiMeaningErrors} 
          reading={analysis.kanjiReadingErrors}
          label={t('readingMeaning.kanjiBreakdown')}
        />
        <RatioBar 
          meaning={analysis.vocabMeaningErrors} 
          reading={analysis.vocabReadingErrors}
          label={t('readingMeaning.vocabBreakdown')}
        />
      </div>

      {/* Tabs for weak items */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => { setActiveTab('meaning'); setVisibleCount(10); }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeTab === 'meaning'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('readingMeaning.meaningWeakItems')} ({analysis.meaningWeakItems.length})
        </button>
        <button
          onClick={() => { setActiveTab('reading'); setVisibleCount(10); }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            activeTab === 'reading'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('readingMeaning.readingWeakItems')} ({analysis.readingWeakItems.length})
        </button>
      </div>

      {/* Items Table */}
      {visibleItems.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                    {t('readingMeaning.item')}
                  </th>
                  <th className="text-center py-2 text-orange-600 dark:text-orange-400 font-medium">
                    {t('readingMeaning.meaning')}
                  </th>
                  <th className="text-center py-2 text-blue-600 dark:text-blue-400 font-medium">
                    {t('readingMeaning.reading')}
                  </th>
                  <th className="text-center py-2 text-gray-600 dark:text-gray-400 font-medium">
                    {t('readingMeaning.gap')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item, idx) => (
                  <tr 
                    key={item.subject.id} 
                    className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/30' : ''}
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className={`${getSubjectColor(item.subject.object)} text-white px-2 py-1 rounded text-lg font-medium`}>
                          {item.subject.data.characters || item.subject.data.slug}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          {item.subject.data.meanings?.[0]?.meaning}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-2 text-orange-600 dark:text-orange-400 font-medium">
                      {item.meaningErrors}
                    </td>
                    <td className="text-center py-2 text-blue-600 dark:text-blue-400 font-medium">
                      {item.readingErrors}
                    </td>
                    <td className="text-center py-2 text-gray-600 dark:text-gray-400">
                      +{item.gap}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + 10)}
              className="mt-4 w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              {t('readingMeaning.showMore').replace('{count}', '10')}
            </button>
          )}
        </>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 py-4">
          {activeTab === 'meaning' 
            ? 'No items where meaning errors exceed reading errors'
            : 'No items where reading errors exceed meaning errors'}
        </p>
      )}
    </div>
  );
}
