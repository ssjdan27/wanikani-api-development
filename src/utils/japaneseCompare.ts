/**
 * Utilities for comparing Japanese text, particularly for
 * speech recognition comparison with expected readings.
 */

/**
 * Convert katakana to hiragana
 */
export function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  )
}

/**
 * Convert hiragana to katakana
 */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) + 0x60)
  )
}

/**
 * Normalize Japanese text to hiragana for comparison
 * - Converts katakana to hiragana
 * - Removes spaces and punctuation
 * - Converts full-width characters
 */
export function normalizeToHiragana(text: string): string {
  let normalized = text
    // Convert katakana to hiragana
    .replace(/[\u30A1-\u30F6]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60)
    )
    // Convert full-width alphanumeric to half-width
    .replace(/[\uFF01-\uFF5E]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0xFEE0)
    )
    // Remove spaces and common punctuation
    .replace(/[\s\u3000、。！？・「」『』（）]/g, '')
    // Normalize long vowel mark (ー) - often used in katakana
    .replace(/ー/g, '')
    .toLowerCase()
    .trim()

  return normalized
}

/**
 * Common phonetic confusions in Japanese that should be accepted as "close"
 */
const PHONETIC_CONFUSIONS: [string, string][] = [
  // Voiced/unvoiced pairs that sound similar
  ['ず', 'づ'],
  ['じ', 'ぢ'],
  // Particles that sound different than spelled
  ['は', 'わ'], // when は is particle
  ['へ', 'え'], // when へ is particle
  ['を', 'お'],
  // Long vowel variations
  ['おう', 'おお'],
  ['えい', 'ええ'],
  ['ゆう', 'ゆー'],
  ['きゅう', 'きゅー'],
  // Small tsu variations
  ['っ', ''],
  // N sounds
  ['ん', 'む'], // sometimes confused
  ['ん', 'ぬ'],
]

/**
 * Create phonetic variants of a reading that should be accepted
 */
export function createPhoneticVariants(reading: string): string[] {
  const normalized = normalizeToHiragana(reading)
  let variants = new Set<string>([normalized])

  // Apply each confusion pair, but iterate over a snapshot to avoid infinite loop
  PHONETIC_CONFUSIONS.forEach(([a, b]) => {
    const currentVariants = Array.from(variants) // snapshot
    currentVariants.forEach(variant => {
      if (variant.includes(a)) {
        variants.add(variant.replace(new RegExp(a, 'g'), b))
      }
      if (variant.includes(b)) {
        variants.add(variant.replace(new RegExp(b, 'g'), a))
      }
    })
  })

  // Limit the size to prevent memory issues
  const result = Array.from(variants)
  if (result.length > 100) {
    return result.slice(0, 100)
  }
  return result
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

export type PronunciationFeedback = 'correct' | 'close' | 'incorrect'

export interface PronunciationScore {
  exactMatch: boolean
  similarityScore: number // 0-100
  feedback: PronunciationFeedback
  spokenNormalized: string
  expectedNormalized: string
}

/**
 * Score a spoken pronunciation against the expected reading
 */
export function scorePronunciation(
  spoken: string,
  expected: string
): PronunciationScore {
  const spokenNormalized = normalizeToHiragana(spoken)
  const expectedNormalized = normalizeToHiragana(expected)

  // Exact match
  if (spokenNormalized === expectedNormalized) {
    return {
      exactMatch: true,
      similarityScore: 100,
      feedback: 'correct',
      spokenNormalized,
      expectedNormalized
    }
  }

  // Check phonetic variants (fuzzy match)
  const variants = createPhoneticVariants(expected)
  if (variants.includes(spokenNormalized)) {
    return {
      exactMatch: false,
      similarityScore: 95,
      feedback: 'correct', // Accept phonetic variants as correct
      spokenNormalized,
      expectedNormalized
    }
  }

  // Calculate similarity using Levenshtein distance
  const distance = levenshteinDistance(spokenNormalized, expectedNormalized)
  const maxLen = Math.max(spokenNormalized.length, expectedNormalized.length)
  
  // Avoid division by zero
  if (maxLen === 0) {
    return {
      exactMatch: true,
      similarityScore: 100,
      feedback: 'correct',
      spokenNormalized,
      expectedNormalized
    }
  }

  const similarity = Math.round(((maxLen - distance) / maxLen) * 100)

  // Determine feedback based on similarity
  let feedback: PronunciationFeedback
  if (similarity >= 80) {
    feedback = 'close'
  } else if (similarity >= 50) {
    feedback = 'close'
  } else {
    feedback = 'incorrect'
  }

  return {
    exactMatch: false,
    similarityScore: similarity,
    feedback,
    spokenNormalized,
    expectedNormalized
  }
}

/**
 * Check if the spoken text matches any of the acceptable readings
 */
export function matchesAnyReading(
  spoken: string,
  readings: string[]
): PronunciationScore | null {
  let bestScore: PronunciationScore | null = null

  for (const reading of readings) {
    const score = scorePronunciation(spoken, reading)
    
    if (score.exactMatch || score.feedback === 'correct') {
      return score // Return immediately on exact/correct match
    }
    
    if (!bestScore || score.similarityScore > bestScore.similarityScore) {
      bestScore = score
    }
  }

  return bestScore
}
