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
    'token.stepsTitle': 'How to get your API token:',
    'token.step1': 'Go to your WaniKani Profile → Settings → API Tokens',
    'token.step2': 'Click "Generate a new token"',
    'token.step3': 'Give your token a description (e.g., "Dashboard")',
    'token.step4': 'Leave all permission boxes unchecked (read-only access is automatic)',
    'token.step5': 'Click "Generate token" and copy it here',
    
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
    'accuracy.title': 'Accuracy by Level',
    'accuracy.subtitle': 'Your review accuracy for each WaniKani level',
    'accuracy.level': 'Level',
    'accuracy.accuracyPercent': 'Accuracy %',
    'accuracy.bestLevel': 'Best Level',
    'accuracy.worstLevel': 'Needs Work',
    'accuracy.noData': 'No review data available yet',
    
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
    'tabs.reviewForecast': 'Review Forecast',
    
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
    'projection.projected': 'Projected (Avg)',
    'projection.fastPace': 'Fast',
    'projection.avgPace': 'Avg',
    'projection.slowPace': 'Slow',
    'projection.paceComparison': 'Pace comparison (days/level)',
    
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
    
    // Review Forecast
    'forecast.title': 'Review Forecast',
    'forecast.subtitle': 'Upcoming reviews for the next 7 days',
    'forecast.today': 'Today',
    'forecast.overdue': 'overdue',
    'forecast.thisWeek': 'This Week',
    'forecast.peakDay': 'Peak Day',
    'forecast.dailyAvg': 'Daily Avg',
    'forecast.reviews': 'reviews',
    'forecast.heavyWorkload': 'Heavy workload!',
    'forecast.busyDay': 'Busy day',
    'forecast.clickToExpand': 'Click a bar to see hourly breakdown',
    'forecast.backToWeek': 'Back to week view',
    'forecast.hourlyBreakdown': 'Hourly Breakdown',
    'forecast.hourlySubtitle': 'Reviews by hour (only hours with reviews shown)',
    'forecast.noReviewsThisDay': 'No reviews scheduled for this day',
    
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
    
    // Streak Analysis
    'streak.title': 'Streak Analysis',
    'streak.subtitle': 'Your longest answer streaks',
    'streak.longestStreak': 'Longest Streak',
    'streak.avgStreak': 'Avg Current',
    'streak.perfectItems': 'Perfect Items',
    'streak.totalReviewed': 'Total Reviewed',
    'streak.hotStreaks': 'Current Hot Streaks',
    'streak.bestStreaks': 'All-Time Best',
    'streak.inARow': 'in a row',
    'streak.record': 'record',
    'streak.noData': 'No streak data available yet. Complete some reviews!',
    
    // Critical Items
    'critical.title': 'Critical Items',
    'critical.subtitle': 'Items that dropped SRS stages - needs attention',
    'critical.count': '{count} items need review',
    'critical.noCritical': 'No critical items! All your items are progressing well.',
    'critical.resurrected': 'Resurrected',
    'critical.droppedGuru': 'Dropped from Guru',
    'critical.avgDrop': 'Avg Drop',
    'critical.nextReview': 'Next review',
    'critical.now': 'Now',
    
    // Footer
    'footer.message': 'Keep going!',
    
    // Errors
    'error.updateToken': 'Update Token',
    
    // Export
    'export.button': 'Export',
    'export.exporting': 'Exporting...',
    'export.assignments': 'Assignments',
    'export.reviewStats': 'Review Statistics',
    'export.levelProgress': 'Level Progressions',
    'export.subjects': 'Subjects',
    'export.allData': 'All Data',
    'export.exportingAssignments': 'Exporting assignments...',
    'export.exportingReviewStats': 'Exporting review stats...',
    'export.exportingLevelProgress': 'Exporting level progress...',
    'export.exportingSubjects': 'Exporting subjects...',
    'export.creatingZip': 'Creating zip file...',
    
    // Dependency Tree
    'dependencyTree.title': 'Dependency Tree',
    'dependencyTree.subtitle': 'Explore radical → kanji → vocabulary relationships',
    'dependencyTree.searchPlaceholder': 'Search by character or meaning...',
    'dependencyTree.emptyPrompt': 'Search for a kanji to explore its radical components and vocabulary usage 🌳',
    'dependencyTree.components': 'Components',
    'dependencyTree.usedIn': 'Used in',
    'dependencyTree.loadMore': 'Load more...',
    'dependencyTree.noResults': 'No subjects found',
    'dependencyTree.clickToOpen': 'Click to open on WaniKani',
    'dependencyTree.locked': 'Locked',
    'dependencyTree.apprentice': 'Apprentice',
    'dependencyTree.guru': 'Guru',
    'dependencyTree.master': 'Master',
    'dependencyTree.enlightened': 'Enlightened',
    'dependencyTree.burned': 'Burned',
    'dependencyTree.kanaModeOn': 'Kana input mode (type romaji → kana, hold Shift for katakana)',
    'dependencyTree.kanaModeOff': 'Direct input mode (English/Kanji)',
    'tabs.dependencyTree': 'Dependency Tree',
    
    // Similar Kanji Warnings
    'similarKanji.title': 'Similar Kanji Warnings',
    'similarKanji.subtitle': 'Kanji pairs you might confuse - sorted by combined errors',
    'similarKanji.count': '{count} confusing pairs',
    'similarKanji.noPairs': 'No similar kanji pairs found in your current studies - great job!',
    'similarKanji.showMore': 'Show {count} more',
    'similarKanji.errors': 'errors',
    'similarKanji.vsLabel': 'vs',
    
    // Burned Items Gallery
    'burnGallery.title': 'Burned Items Gallery',
    'burnGallery.subtitle': 'Celebrate your mastered items! 🎉',
    'burnGallery.totalBurned': '{count} items burned',
    'burnGallery.noBurned': 'No burned items yet. Keep studying! 💪',
    'burnGallery.filterAll': 'All',
    'burnGallery.filterRadicals': 'Radicals',
    'burnGallery.filterKanji': 'Kanji',
    'burnGallery.filterVocab': 'Vocabulary',
    'burnGallery.sortNewest': 'Newest first',
    'burnGallery.sortOldest': 'Oldest first',
    'burnGallery.sortLevel': 'By level',
    'burnGallery.sortCharacter': 'By character',
    'burnGallery.searchPlaceholder': 'Search burned items...',
    'burnGallery.showMore': 'Show {count} more',
    'burnGallery.level': 'Level',
    'burnGallery.burned': 'Burned',
    'burnGallery.milestone100': '🌟 100 burns!',
    'burnGallery.milestone500': '🌟 500 burns!',
    'burnGallery.milestone1000': '🏆 1,000 burns!',
    'burnGallery.milestone2000': '👑 2,000+ burns!',
    'burnGallery.radicals': 'Radicals',
    'burnGallery.kanji': 'Kanji',
    'burnGallery.vocabulary': 'Vocabulary',
    'tabs.burnGallery': 'Burned Gallery',
    
    // Reading vs Meaning Analysis
    'readingMeaning.title': 'Reading vs Meaning Analysis',
    'readingMeaning.subtitle': 'Identify your weak spots 🎯',
    'readingMeaning.meaningErrors': 'Meaning Errors',
    'readingMeaning.readingErrors': 'Reading Errors',
    'readingMeaning.balanced': 'Balanced - Great job keeping both skills sharp!',
    'readingMeaning.meaningWeak': 'You struggle more with meanings - focus on meaning mnemonics!',
    'readingMeaning.readingWeak': 'You struggle more with readings - practice reading out loud!',
    'readingMeaning.kanjiBreakdown': 'Kanji',
    'readingMeaning.vocabBreakdown': 'Vocabulary',
    'readingMeaning.meaningWeakItems': 'Meaning-weak items',
    'readingMeaning.readingWeakItems': 'Reading-weak items',
    'readingMeaning.gap': 'Gap',
    'readingMeaning.noData': 'No review data yet. Start reviewing to see your patterns!',
    'readingMeaning.showMore': 'Show {count} more',
    'readingMeaning.item': 'Item',
    'readingMeaning.meaning': 'Meaning',
    'readingMeaning.reading': 'Reading',
    
    // Vacation Recovery Planner
    'vacation.title': 'Vacation Recovery Planner',
    'vacation.subtitleCurrent': 'Your review pile-up status',
    'vacation.subtitlePlanning': 'Plan ahead for your vacation',
    'vacation.currentTab': 'Current',
    'vacation.planTab': 'Plan Ahead',
    'vacation.notOnVacation': 'You\'re not currently on vacation. Plan a future vacation to see how reviews will pile up!',
    'vacation.planFuture': 'Plan a Vacation',
    'vacation.planYourVacation': 'Plan Your Vacation',
    'vacation.startDate': 'Start Date',
    'vacation.duration': 'Duration',
    'vacation.onVacationSince': 'On vacation since {date}',
    'vacation.daysOnVacation': '{days} days on vacation mode',
    'vacation.reviewsPiledUp': 'Reviews Piled Up',
    'vacation.daysAway': 'Days Away',
    'vacation.plannedDays': 'Planned Days',
    'vacation.avgPerDay': 'Avg/Day Pile-up',
    'vacation.srsBreakdown': 'SRS Stage Breakdown',
    'vacation.recoveryPlan': 'Recovery Timeline',
    'vacation.lightPace': 'Light pace',
    'vacation.normalPace': 'Normal pace',
    'vacation.intensePace': 'Intense pace',
    'vacation.sprintPace': 'Sprint pace',
    'vacation.tip': 'Start with Apprentice items first - they\'re the most likely to slip from memory!',
    
    // Vocabulary Study
    'vocabStudy.title': 'Vocabulary Study',
    'vocabStudy.subtitle': 'Context sentences, audio & mnemonics',
    'vocabStudy.items': 'items',
    'vocabStudy.searchPlaceholder': 'Search vocabulary...',
    'vocabStudy.showFurigana': 'Show Furigana',
    'vocabStudy.hideFurigana': 'Hide Furigana',
    'vocabStudy.filterAll': 'All Stages',
    'vocabStudy.filterApprentice': 'Apprentice',
    'vocabStudy.filterGuru': 'Guru',
    'vocabStudy.filterMaster': 'Master',
    'vocabStudy.filterEnlightened': 'Enlightened',
    'vocabStudy.filterBurned': 'Burned',
    'vocabStudy.pronunciation': 'Pronunciation',
    'vocabStudy.contextSentences': 'Context Sentences',
    'vocabStudy.meaningMnemonic': 'Meaning Mnemonic',
    'vocabStudy.readingMnemonic': 'Reading Mnemonic',
    'vocabStudy.viewOnWK': 'View on WaniKani',
    'vocabStudy.noResults': 'No vocabulary found matching your search.',
    'vocabStudy.loadError': 'Failed to load details. Try again.',
    'vocabStudy.showMore': 'Show 20 more',
    'tabs.vocabStudy': 'Vocab Study',
    
    // Reading Aloud Practice
    'readingPractice.title': 'Reading Aloud Practice',
    'readingPractice.subtitle': 'Read the word aloud, then reveal to hear the pronunciation',
    'readingPractice.showMeaning': 'Show Meaning',
    'readingPractice.shuffle': 'Shuffle',
    'readingPractice.itemsAvailable': '{count} items available to practice',
    'readingPractice.startPractice': 'Start Practice',
    'readingPractice.instruction': 'Try reading this word aloud, then reveal the answer',
    'readingPractice.reveal': 'Reveal',
    'readingPractice.skip': 'Skip',
    'readingPractice.playAgain': 'Play Again',
    'readingPractice.gotIt': 'Got it!',
    'readingPractice.missedIt': 'Missed it',
    'readingPractice.endSession': 'End Session',
    'readingPractice.sessionComplete': 'Session Complete!',
    'readingPractice.practiced': 'Practiced',
    'readingPractice.correct': 'Correct',
    'readingPractice.accuracy': 'Accuracy',
    'readingPractice.practiceAgain': 'Practice Again',
    'readingPractice.noItems': 'No vocabulary items available for this filter.',
    'readingPractice.voiceMode': 'Voice Mode',
    'readingPractice.voiceInstruction': 'Press the microphone and say the reading aloud',
    'readingPractice.privacyTitle': 'Voice Recognition Privacy Notice',
    'readingPractice.privacyMessage': 'Voice recognition uses your browser\'s speech API. Your audio may be processed by third-party services (e.g., Google) for transcription. No data is stored by this application.',
    'readingPractice.accept': 'I Understand',
    'readingPractice.decline': 'Cancel',
    'readingPractice.voiceCorrect': 'Perfect!',
    'readingPractice.voiceClose': 'Almost!',
    'readingPractice.voiceIncorrect': 'Try again',
    'readingPractice.youSaid': 'You said',
    'readingPractice.noSpeech': 'No speech detected. Try again.',
    'readingPractice.micNotAllowed': 'Microphone access denied. Please allow access in your browser settings.',
    'readingPractice.networkError': 'Network error. Please check your connection.',
    'tabs.readingPractice': 'Reading Practice',
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
    'token.stepsTitle': 'APIトークンの取得方法：',
    'token.step1': 'WaniKaniのプロフィール → 設定 → APIトークンへ移動',
    'token.step2': '「新しいトークンを生成」をクリック',
    'token.step3': 'トークンに説明を入力（例：「ダッシュボード」）',
    'token.step4': '権限のチェックボックスはすべて空のまま（読み取り専用アクセスは自動）',
    'token.step5': '「トークンを生成」をクリックしてここにコピー',
    
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
    'accuracy.title': 'レベル別正答率',
    'accuracy.subtitle': '各レベルの復習正答率',
    'accuracy.level': 'レベル',
    'accuracy.accuracyPercent': '正答率 %',
    'accuracy.bestLevel': '最高レベル',
    'accuracy.worstLevel': '要復習',
    'accuracy.noData': 'まだ復習データがありません',
    
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
    'tabs.reviewForecast': '復習予測',
    
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
    'projection.projected': '予測（平均）',
    'projection.fastPace': '速い',
    'projection.avgPace': '平均',
    'projection.slowPace': '遅い',
    'projection.paceComparison': 'ペース比較（日/レベル）',
    
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
    
    // Review Forecast
    'forecast.title': '復習予測',
    'forecast.subtitle': '今後7日間の復習予定',
    'forecast.today': '今日',
    'forecast.overdue': '期限切れ',
    'forecast.thisWeek': '今週',
    'forecast.peakDay': 'ピーク日',
    'forecast.dailyAvg': '日平均',
    'forecast.reviews': '復習',
    'forecast.heavyWorkload': '大量の復習！',
    'forecast.busyDay': '忙しい日',
    'forecast.clickToExpand': 'バーをクリックして時間別の詳細を表示',
    'forecast.backToWeek': '週間表示に戻る',
    'forecast.hourlyBreakdown': '時間別詳細',
    'forecast.hourlySubtitle': '時間別の復習（復習がある時間のみ表示）',
    'forecast.noReviewsThisDay': 'この日は復習予定なし',
    
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
    
    // Streak Analysis
    'streak.title': 'ストリーク分析',
    'streak.subtitle': '最長連続正解記録',
    'streak.longestStreak': '最長ストリーク',
    'streak.avgStreak': '平均現在',
    'streak.perfectItems': '完璧なアイテム',
    'streak.totalReviewed': '総復習数',
    'streak.hotStreaks': '現在のホットストリーク',
    'streak.bestStreaks': '歴代ベスト',
    'streak.inARow': '連続',
    'streak.record': '記録',
    'streak.noData': 'ストリークデータがまだありません。復習を完了してください！',
    
    // Critical Items
    'critical.title': '要注意アイテム',
    'critical.subtitle': 'SRSステージが下がったアイテム - 注意が必要',
    'critical.count': '{count}個のアイテムが復習必要',
    'critical.noCritical': '要注意アイテムなし！全てのアイテムが順調に進んでいます。',
    'critical.resurrected': '復活済み',
    'critical.droppedGuru': 'Guruから低下',
    'critical.avgDrop': '平均低下',
    'critical.nextReview': '次の復習',
    'critical.now': '今すぐ',
    
    // Footer
    'footer.message': '頑張って！',
    
    // Errors
    'error.updateToken': 'トークンを更新',
    
    // Export
    'export.button': 'エクスポート',
    'export.exporting': 'エクスポート中...',
    'export.assignments': '課題',
    'export.reviewStats': '復習統計',
    'export.levelProgress': 'レベル進捗',
    'export.subjects': '学習項目',
    'export.allData': '全データ',
    'export.exportingAssignments': '課題をエクスポート中...',
    'export.exportingReviewStats': '復習統計をエクスポート中...',
    'export.exportingLevelProgress': 'レベル進捗をエクスポート中...',
    'export.exportingSubjects': '学習項目をエクスポート中...',
    'export.creatingZip': 'ZIPファイルを作成中...',
    
    // Dependency Tree
    'dependencyTree.title': '依存関係ツリー',
    'dependencyTree.subtitle': '部首 → 漢字 → 単語の関係を探索',
    'dependencyTree.searchPlaceholder': '文字または意味で検索...',
    'dependencyTree.emptyPrompt': '漢字を検索して、部首の構成要素と単語での使用法を探索 🌳',
    'dependencyTree.components': '構成要素',
    'dependencyTree.usedIn': '使用先',
    'dependencyTree.loadMore': 'もっと読み込む...',
    'dependencyTree.noResults': '該当項目なし',
    'dependencyTree.clickToOpen': 'クリックでWaniKaniを開く',
    'dependencyTree.locked': 'ロック中',
    'dependencyTree.apprentice': '見習い',
    'dependencyTree.guru': 'グル',
    'dependencyTree.master': 'マスター',
    'dependencyTree.enlightened': '悟り',
    'dependencyTree.burned': 'バーン',
    'dependencyTree.kanaModeOn': 'かな入力モード（ローマ字→かな、Shiftでカタカナ）',
    'dependencyTree.kanaModeOff': '直接入力モード（英語・漢字）',
    'tabs.dependencyTree': '依存関係ツリー',
    
    // Similar Kanji Warnings
    'similarKanji.title': '類似漢字警告',
    'similarKanji.subtitle': '混同しやすい漢字ペア - 合計エラー数順',
    'similarKanji.count': '{count}組の混同ペア',
    'similarKanji.noPairs': '学習中の類似漢字ペアは見つかりませんでした - 素晴らしい！',
    'similarKanji.showMore': 'あと{count}組を表示',
    'similarKanji.errors': 'エラー',
    'similarKanji.vsLabel': 'vs',
    
    // Burned Items Gallery
    'burnGallery.title': '習得アイテムギャラリー',
    'burnGallery.subtitle': 'マスターしたアイテムを祈おう！🎉',
    'burnGallery.totalBurned': '{count}個のアイテムを習得',
    'burnGallery.noBurned': 'まだ習得アイテムはありません。勉強を続けよう！💪',
    'burnGallery.filterAll': 'すべて',
    'burnGallery.filterRadicals': '部首',
    'burnGallery.filterKanji': '漢字',
    'burnGallery.filterVocab': '単語',
    'burnGallery.sortNewest': '新しい順',
    'burnGallery.sortOldest': '古い順',
    'burnGallery.sortLevel': 'レベル順',
    'burnGallery.sortCharacter': '文字順',
    'burnGallery.searchPlaceholder': '習得アイテムを検索...',
    'burnGallery.showMore': 'あと{count}個を表示',
    'burnGallery.level': 'レベル',
    'burnGallery.burned': '習得',
    'burnGallery.milestone100': '🌟 100個習得！',
    'burnGallery.milestone500': '🌟 500個習得！',
    'burnGallery.milestone1000': '🏆 1,000個習得！',
    'burnGallery.milestone2000': '👑 2,000個以上習得！',
    'burnGallery.radicals': '部首',
    'burnGallery.kanji': '漢字',
    'burnGallery.vocabulary': '単語',
    'tabs.burnGallery': '習得ギャラリー',
    
    // Reading vs Meaning Analysis
    'readingMeaning.title': '読み vs 意味分析',
    'readingMeaning.subtitle': '弱点を特定しよう 🎯',
    'readingMeaning.meaningErrors': '意味エラー',
    'readingMeaning.readingErrors': '読みエラー',
    'readingMeaning.balanced': 'バランスが取れています - 素晴らしい！',
    'readingMeaning.meaningWeak': '意味が苦手です - 意味のニーモニックに集中！',
    'readingMeaning.readingWeak': '読みが苦手です - 声に出して練習！',
    'readingMeaning.kanjiBreakdown': '漢字',
    'readingMeaning.vocabBreakdown': '単語',
    'readingMeaning.meaningWeakItems': '意味が弱い項目',
    'readingMeaning.readingWeakItems': '読みが弱い項目',
    'readingMeaning.gap': '差',
    'readingMeaning.noData': 'まだ復習データがありません。復習を始めてパターンを確認！',
    'readingMeaning.showMore': 'あと{count}個を表示',
    'readingMeaning.item': '項目',
    'readingMeaning.meaning': '意味',
    'readingMeaning.reading': '読み',
    
    // Vacation Recovery Planner
    'vacation.title': '休暇リカバリープランナー',
    'vacation.subtitleCurrent': '復習の溜まり状況',
    'vacation.subtitlePlanning': '休暇の計画を立てよう',
    'vacation.currentTab': '現在',
    'vacation.planTab': '計画する',
    'vacation.notOnVacation': '現在休暇モードではありません。将来の休暇を計画して復習の溜まり具合を確認しましょう！',
    'vacation.planFuture': '休暇を計画',
    'vacation.planYourVacation': '休暇を計画する',
    'vacation.startDate': '開始日',
    'vacation.duration': '期間',
    'vacation.onVacationSince': '{date}から休暇中',
    'vacation.daysOnVacation': '休暇モード{days}日目',
    'vacation.reviewsPiledUp': '溜まった復習',
    'vacation.daysAway': '休暇日数',
    'vacation.plannedDays': '計画日数',
    'vacation.avgPerDay': '1日あたり',
    'vacation.srsBreakdown': 'SRSステージ内訳',
    'vacation.recoveryPlan': 'リカバリー目安',
    'vacation.lightPace': 'ゆっくり',
    'vacation.normalPace': '通常',
    'vacation.intensePace': '集中',
    'vacation.sprintPace': '全力',
    'vacation.tip': 'Apprenticeアイテムから始めましょう - 一番忘れやすいです！',
    
    // Vocabulary Study
    'vocabStudy.title': '単語学習',
    'vocabStudy.subtitle': '例文・音声・ニーモニック',
    'vocabStudy.items': '件',
    'vocabStudy.searchPlaceholder': '単語を検索...',
    'vocabStudy.showFurigana': 'ふりがな表示',
    'vocabStudy.hideFurigana': 'ふりがな非表示',
    'vocabStudy.filterAll': '全ステージ',
    'vocabStudy.filterApprentice': '見習い',
    'vocabStudy.filterGuru': 'グル',
    'vocabStudy.filterMaster': 'マスター',
    'vocabStudy.filterEnlightened': '悟り',
    'vocabStudy.filterBurned': 'バーン',
    'vocabStudy.pronunciation': '発音',
    'vocabStudy.contextSentences': '例文',
    'vocabStudy.meaningMnemonic': '意味のニーモニック',
    'vocabStudy.readingMnemonic': '読みのニーモニック',
    'vocabStudy.viewOnWK': 'WaniKaniで見る',
    'vocabStudy.noResults': '検索に一致する単語が見つかりませんでした。',
    'vocabStudy.loadError': '詳細の読み込みに失敗しました。もう一度お試しください。',
    'vocabStudy.showMore': 'あと20件を表示',
    'tabs.vocabStudy': '単語学習',
    
    // Reading Aloud Practice
    'readingPractice.title': '音読練習',
    'readingPractice.subtitle': '単語を声に出して読み、発音を確認しましょう',
    'readingPractice.showMeaning': '意味を表示',
    'readingPractice.shuffle': 'シャッフル',
    'readingPractice.itemsAvailable': '{count}件の練習アイテム',
    'readingPractice.startPractice': '練習開始',
    'readingPractice.instruction': 'この単語を声に出して読んでから答えを確認',
    'readingPractice.reveal': '答えを見る',
    'readingPractice.skip': 'スキップ',
    'readingPractice.playAgain': 'もう一度再生',
    'readingPractice.gotIt': '正解！',
    'readingPractice.missedIt': '不正解',
    'readingPractice.endSession': 'セッション終了',
    'readingPractice.sessionComplete': 'セッション完了！',
    'readingPractice.practiced': '練習数',
    'readingPractice.correct': '正解',
    'readingPractice.accuracy': '正答率',
    'readingPractice.practiceAgain': 'もう一度練習',
    'readingPractice.noItems': 'このフィルターで利用可能な単語がありません。',
    'readingPractice.voiceMode': '音声モード',
    'readingPractice.voiceInstruction': 'マイクを押して読み方を声に出してください',
    'readingPractice.privacyTitle': '音声認識プライバシー通知',
    'readingPractice.privacyMessage': '音声認識はブラウザの音声APIを使用します。音声はサードパーティサービス（例：Google）で処理される場合があります。このアプリケーションはデータを保存しません。',
    'readingPractice.accept': '了解',
    'readingPractice.decline': 'キャンセル',
    'readingPractice.voiceCorrect': '完璧！',
    'readingPractice.voiceClose': 'おしい！',
    'readingPractice.voiceIncorrect': 'もう一度',
    'readingPractice.youSaid': 'あなたの発音',
    'readingPractice.noSpeech': '音声が検出されませんでした。もう一度お試しください。',
    'readingPractice.micNotAllowed': 'マイクへのアクセスが拒否されました。ブラウザの設定で許可してください。',
    'readingPractice.networkError': 'ネットワークエラー。接続を確認してください。',
    'tabs.readingPractice': '音読練習',
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
