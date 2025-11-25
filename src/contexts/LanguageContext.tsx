'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'en' | 'ja'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'header.title': 'WANIKANI DASHBOARD',
    'header.level': 'Level',
    'header.logout': 'Logout',
    
    // API Token Input
    'token.title': 'WaniKani Dashboard',
    'token.subtitle': 'Enter your API token to view your stats',
    'token.placeholder': 'Enter your WaniKani API token',
    'token.submit': 'Connect',
    'token.help': 'Get your API token from',
    'token.settings': 'WaniKani Settings',
    
    // Loading
    'loading': 'Loading...',
    
    // Common
    'common.radicals': 'Radicals',
    'common.kanji': 'Kanji',
    'common.vocabulary': 'Vocabulary',
    'common.days': 'days',
    'common.day': 'day',
    'common.lessons': 'lessons',
    'common.none': 'None',
    'common.level': 'Level',
    
    // Stats Overview
    'stats.title': 'Statistics Overview',
    'stats.currentLevel': 'Current Level',
    'stats.totalReviews': 'Total Reviews',
    'stats.overallAccuracy': 'Overall Accuracy',
    'stats.radicalAccuracy': 'Radical Accuracy',
    'stats.kanjiAccuracy': 'Kanji Accuracy',
    'stats.vocabAccuracy': 'Vocabulary Accuracy',
    'stats.accountAge': 'Account Age',
    'stats.itemsStudied': 'Items Studied',
    
    // Subscription Info
    'subscription.statusUnknown': 'Subscription Status Unknown',
    'subscription.unableToDetermine': 'Unable to determine subscription status. Some features may be limited.',
    'subscription.lifetime': 'Lifetime Member',
    'subscription.active': 'Active Subscription',
    'subscription.free': 'Free Account',
    'subscription.inactive': 'Inactive',
    'subscription.unknown': 'Unknown',
    'subscription.access': 'Access',
    'subscription.fullAccess': 'Full Access (All 60 Levels)',
    'subscription.levels': 'Levels',
    'subscription.renews': 'Renews',
    'subscription.ends': 'Ends',
    'subscription.note': 'Note',
    'subscription.contentFiltered': 'Content above level {level} is filtered to respect subscription limits.',
    'subscription.notice': 'Notice',
    'subscription.inactiveNotice': 'Subscription inactive. Some features are limited.',
    
    // Level Progress
    'levelProgress.title': 'Level {level} Progress',
    'levelProgress.guruNote': 'Guru+ items count as completed',
    'levelProgress.levelOption': 'Level {level}',
    'levelProgress.current': '(current)',
    'levelProgress.noData': 'No subject data available for this level yet. Try refreshing or check your subscription limits.',
    
    // Accuracy Chart
    'accuracy.title': 'Accuracy by Type',
    
    // Level Pacing Coach
    'pacing.title': 'Level Pacing Coach',
    'pacing.subtitle': 'Which kanji are blocking level-up',
    'pacing.gatingKanji': 'Gating kanji',
    'pacing.etaNextLevel': 'ETA to next level',
    'pacing.ready': 'Ready!',
    'pacing.passingStage': 'Passing stage',
    'pacing.timeInLevel': 'Time in level',
    'pacing.allPassed': 'All current-level kanji are at or above passing. You can level up as soon as your reviews allow!',
    'pacing.focusNext': 'Focus these next',
    
    // Lesson Batching Helper
    'batching.title': 'Lesson Batching Helper',
    'batching.subtitle': 'Match your lesson pace to upcoming reviews',
    'batching.recommendedToday': 'Recommended today',
    'batching.lessonsAvailable': 'Lessons available',
    'batching.nextReviews': 'Next reviews',
    'batching.reviewsIn24h': 'Reviews in 24h',
    'batching.peakHour': 'Peak hour',
    'batching.average': 'Average',
    'batching.noData': 'Summary data not loaded yet.',
    
    // Tabs
    'tabs.levelProjection': 'Level Projection',
    'tabs.burnProjection': 'Burn Projection',
    'tabs.studyHeatmap': 'Study Heatmap',
    
    // Level Projection
    'projection.title': 'Level Up Projection',
    'projection.basedOnPace': 'Based on your recent pace (last {count} levels)',
    'projection.averagePace': 'Average pace',
    'projection.daysPerLevel': 'days/level',
    'projection.level60Eta': 'Level 60 ETA',
    'projection.latestLevel': 'Latest completed level',
    'projection.projectionStart': 'Projection start',
    'projection.totalToGo': 'Total to go',
    'projection.levels': 'levels',
    'projection.actual': 'Actual',
    'projection.projected': 'Projected',
    
    // Burn Radar
    'burn.title': 'Burn Radar',
    'burn.subtitle': 'Upcoming burns and burn velocity',
    'burn.totalBurned': 'Total burned',
    'burn.nextBurns': 'Next burns (fastest to slowest)',
    'burn.noItems': 'No items approaching burn yet. Keep studying!',
    'burn.burnsPerWeek': 'Burns per week',
    
    // Burn Projection
    'burnProjection.title': 'Burn Projection',
    'burnProjection.basedOnPace': 'Based on level pace ({days} days/level)',
    'burnProjection.totalBurnable': 'Total burnable',
    'burnProjection.burnedSoFar': 'Burned so far',
    'burnProjection.burnRate': 'Burn rate',
    'burnProjection.eta': 'ETA',
    'burnProjection.noData': 'Not enough burn data yet. Complete more reviews to burn items.',
    'burnProjection.actualLabel': 'Burned (actual)',
    'burnProjection.projectedLabel': 'Projected (all burns)',
    
    // Study Heatmap
    'heatmap.title': 'Study Heatmap',
    'heatmap.subtitle': 'Hover to see daily lessons. Total: {total}',
    'heatmap.less': 'Less',
    'heatmap.more': 'More',
    'heatmap.maxLessons': 'Max lessons in a day',
    'heatmap.totalLessons': 'Total lessons loaded',
    'heatmap.noActivity': 'No study activity found for {year}. Try a different year.',
    
    // Leech Detector
    'leech.title': 'Leech Detector',
    'leech.subtitle': 'Items with low accuracy - drill these first',
    'leech.topLeeches': 'Top {count} leeches',
    'leech.noLeeches': 'No leeches detected yet. Great job! Keep it up!',
    'leech.item': 'Item',
    'leech.accuracy': 'Accuracy',
    'leech.incorrect': 'Incorrect',
    'leech.link': 'Link',
    'leech.view': 'View',
    
    // SRS Histogram
    'srs.title': 'SRS Stage Histogram',
    'srs.subtitle': 'Distribution across SRS stages',
    'srs.vocab': 'Vocab',
    
    // Footer
    'footer.message': 'Keep going!',
    
    // Errors
    'error.updateToken': 'Update Token',
  },
  ja: {
    // Header
    'header.title': 'ワニカニ ダッシュボード',
    'header.level': 'レベル',
    'header.logout': 'ログアウト',
    
    // API Token Input
    'token.title': 'ワニカニ ダッシュボード',
    'token.subtitle': 'APIトークンを入力して統計を表示',
    'token.placeholder': 'WaniKani APIトークンを入力',
    'token.submit': '接続',
    'token.help': 'APIトークンの取得先：',
    'token.settings': 'WaniKani設定',
    
    // Loading
    'loading': '読み込み中...',
    
    // Common
    'common.radicals': '部首',
    'common.kanji': '漢字',
    'common.vocabulary': '単語',
    'common.days': '日',
    'common.day': '日',
    'common.lessons': 'レッスン',
    'common.none': 'なし',
    'common.level': 'レベル',
    
    // Stats Overview
    'stats.title': '統計概要',
    'stats.currentLevel': '現在のレベル',
    'stats.totalReviews': '総復習数',
    'stats.overallAccuracy': '全体正答率',
    'stats.radicalAccuracy': '部首正答率',
    'stats.kanjiAccuracy': '漢字正答率',
    'stats.vocabAccuracy': '単語正答率',
    'stats.accountAge': 'アカウント年齢',
    'stats.itemsStudied': '学習項目数',
    
    // Subscription Info
    'subscription.statusUnknown': 'サブスクリプション状態不明',
    'subscription.unableToDetermine': 'サブスクリプション状態を確認できません。一部の機能が制限される場合があります。',
    'subscription.lifetime': '生涯会員',
    'subscription.active': '有効なサブスクリプション',
    'subscription.free': '無料アカウント',
    'subscription.inactive': '無効',
    'subscription.unknown': '不明',
    'subscription.access': 'アクセス',
    'subscription.fullAccess': 'フルアクセス（全60レベル）',
    'subscription.levels': 'レベル',
    'subscription.renews': '更新日',
    'subscription.ends': '終了日',
    'subscription.note': '注意',
    'subscription.contentFiltered': 'レベル{level}以上のコンテンツはサブスクリプション制限によりフィルタリングされています。',
    'subscription.notice': '通知',
    'subscription.inactiveNotice': 'サブスクリプションが無効です。一部の機能が制限されています。',
    
    // Level Progress
    'levelProgress.title': 'レベル{level}の進捗',
    'levelProgress.guruNote': 'Guru以上のアイテムが完了としてカウントされます',
    'levelProgress.levelOption': 'レベル {level}',
    'levelProgress.current': '（現在）',
    'levelProgress.noData': 'このレベルのデータがまだありません。更新するか、サブスクリプション制限を確認してください。',
    
    // Accuracy Chart
    'accuracy.title': '種類別正答率',
    
    // Level Pacing Coach
    'pacing.title': 'レベルペースコーチ',
    'pacing.subtitle': 'レベルアップを妨げている漢字',
    'pacing.gatingKanji': '制限漢字',
    'pacing.etaNextLevel': '次レベルまで',
    'pacing.ready': '準備完了！',
    'pacing.passingStage': '合格ステージ',
    'pacing.timeInLevel': 'レベル滞在時間',
    'pacing.allPassed': '現在のレベルの全ての漢字が合格ステージに達しています。復習次第でレベルアップできます！',
    'pacing.focusNext': '次に集中すべき',
    
    // Lesson Batching Helper
    'batching.title': 'レッスンバッチヘルパー',
    'batching.subtitle': 'レッスンペースを今後の復習に合わせる',
    'batching.recommendedToday': '今日のおすすめ',
    'batching.lessonsAvailable': '利用可能なレッスン',
    'batching.nextReviews': '次の復習',
    'batching.reviewsIn24h': '24時間以内の復習',
    'batching.peakHour': 'ピーク時間',
    'batching.average': '平均',
    'batching.noData': 'サマリーデータがまだ読み込まれていません。',
    
    // Tabs
    'tabs.levelProjection': 'レベル予測',
    'tabs.burnProjection': 'バーン予測',
    'tabs.studyHeatmap': '学習ヒートマップ',
    
    // Level Projection
    'projection.title': 'レベルアップ予測',
    'projection.basedOnPace': '最近のペースに基づく（直近{count}レベル）',
    'projection.averagePace': '平均ペース',
    'projection.daysPerLevel': '日/レベル',
    'projection.level60Eta': 'レベル60到達予定',
    'projection.latestLevel': '最新完了レベル',
    'projection.projectionStart': '予測開始',
    'projection.totalToGo': '残り',
    'projection.levels': 'レベル',
    'projection.actual': '実績',
    'projection.projected': '予測',
    
    // Burn Radar
    'burn.title': 'バーンレーダー',
    'burn.subtitle': '今後のバーンとバーン速度',
    'burn.totalBurned': '総バーン数',
    'burn.nextBurns': '次のバーン（速い順）',
    'burn.noItems': 'バーンに近いアイテムはまだありません。勉強を続けましょう！',
    'burn.burnsPerWeek': '週間バーン数',
    
    // Burn Projection
    'burnProjection.title': 'バーン予測',
    'burnProjection.basedOnPace': 'レベルペースに基づく（{days}日/レベル）',
    'burnProjection.totalBurnable': 'バーン可能総数',
    'burnProjection.burnedSoFar': 'バーン済み',
    'burnProjection.burnRate': 'バーン率',
    'burnProjection.eta': '完了予定',
    'burnProjection.noData': 'バーンデータがまだ十分にありません。復習を続けてアイテムをバーンしてください。',
    'burnProjection.actualLabel': 'バーン済み（実績）',
    'burnProjection.projectedLabel': '予測（全バーン）',
    
    // Study Heatmap
    'heatmap.title': '学習ヒートマップ',
    'heatmap.subtitle': 'ホバーで日別レッスン数を表示。合計: {total}',
    'heatmap.less': '少',
    'heatmap.more': '多',
    'heatmap.maxLessons': '1日の最大レッスン数',
    'heatmap.totalLessons': '読み込まれた総レッスン数',
    'heatmap.noActivity': '{year}年の学習活動が見つかりません。別の年を試してください。',
    
    // Leech Detector
    'leech.title': 'リーチ検出器',
    'leech.subtitle': '正答率が低いアイテム - 優先的に復習',
    'leech.topLeeches': 'トップ{count}リーチ',
    'leech.noLeeches': 'リーチは検出されていません。素晴らしい！この調子で！',
    'leech.item': 'アイテム',
    'leech.accuracy': '正答率',
    'leech.incorrect': '不正解',
    'leech.link': 'リンク',
    'leech.view': '表示',
    
    // SRS Histogram
    'srs.title': 'SRSステージ分布',
    'srs.subtitle': 'SRSステージ別の分布',
    'srs.vocab': '単語',
    
    // Footer
    'footer.message': '頑張って！',
    
    // Errors
    'error.updateToken': 'トークンを更新',
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const savedLang = localStorage.getItem('wanikani-dashboard-lang') as Language
    if (savedLang && (savedLang === 'en' || savedLang === 'ja')) {
      setLanguageState(savedLang)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('wanikani-dashboard-lang', lang)
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
