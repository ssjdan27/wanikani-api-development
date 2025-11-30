import type { 
  UserData, 
  ReviewStatistic, 
  Subject, 
  Assignment, 
  ApiResponse,
  CacheEntry,
  CacheConfig,
  LevelProgression,
  Review,
  SpacedRepetitionSystem,
  Summary
} from '@/types/wanikani'

// ============================================================================
// Cache Storage Interface (abstraction for future IndexedDB migration)
// ============================================================================

interface ICacheStorage {
  get<T>(key: string): CacheEntry<T> | null
  set<T>(key: string, entry: CacheEntry<T>): boolean
  delete(key: string): void
  getAllKeys(): string[]
  clear(): void
}

class LocalStorageCacheStorage implements ICacheStorage {
  private prefix = 'wanikani-'
  private maxEntrySize = 500000 // 500KB per entry

  get<T>(key: string): CacheEntry<T> | null {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null
      
      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Update lastAccessed for LRU tracking
      entry.lastAccessed = Date.now()
      try {
        localStorage.setItem(key, JSON.stringify(entry))
      } catch {
        // Ignore if we can't update lastAccessed
      }
      
      // Check if cache has expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        localStorage.removeItem(key)
        return null
      }
      
      return entry
    } catch (error) {
      console.warn('Error reading from cache:', error)
      localStorage.removeItem(key)
      return null
    }
  }

  set<T>(key: string, entry: CacheEntry<T>): boolean {
    try {
      entry.lastAccessed = Date.now()
      const jsonString = JSON.stringify(entry)
      
      // Check if the data is too large
      if (jsonString.length > this.maxEntrySize) {
        console.warn('Cache entry too large, skipping cache for:', key.substring(0, 50))
        return false
      }
      
      localStorage.setItem(key, jsonString)
      return true
    } catch (error) {
      // Likely quota exceeded - try LRU eviction
      if (this.isQuotaError(error)) {
        console.warn('Storage quota exceeded, attempting LRU eviction...')
        if (this.evictLRU(JSON.stringify(entry).length)) {
          try {
            localStorage.setItem(key, JSON.stringify(entry))
            return true
          } catch {
            console.warn('Failed to cache even after eviction')
          }
        }
      }
      return false
    }
  }

  delete(key: string): void {
    localStorage.removeItem(key)
  }

  getAllKeys(): string[] {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keys.push(key)
      }
    }
    return keys
  }

  clear(): void {
    const keys = this.getAllKeys()
    keys.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared ${keys.length} cache entries`)
  }

  private isQuotaError(error: unknown): boolean {
    return error instanceof DOMException && (
      error.code === 22 || // Legacy quota exceeded
      error.code === 1014 || // Firefox
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )
  }

  private evictLRU(neededBytes: number): boolean {
    const entries: { key: string; lastAccessed: number; size: number }[] = []
    
    // Collect all cache entries with their metadata
    for (const key of this.getAllKeys()) {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          const entry = JSON.parse(value)
          entries.push({
            key,
            lastAccessed: entry.lastAccessed || entry.timestamp || 0,
            size: value.length
          })
        }
      } catch {
        // Remove corrupted entries
        localStorage.removeItem(key)
      }
    }
    
    // Sort by lastAccessed (oldest first)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed)
    
    let freedBytes = 0
    let evictedCount = 0
    
    // Evict oldest entries until we have enough space (with buffer)
    for (const entry of entries) {
      if (freedBytes >= neededBytes * 1.5) break // 50% buffer
      
      localStorage.removeItem(entry.key)
      freedBytes += entry.size
      evictedCount++
    }
    
    console.log(`LRU eviction: removed ${evictedCount} entries, freed ~${Math.round(freedBytes / 1024)}KB`)
    return evictedCount > 0
  }
}

// ============================================================================
// Request Queue (concurrency limiting)
// ============================================================================

class RequestQueue {
  private maxConcurrent: number
  private currentRequests = 0
  private queue: Array<{
    execute: () => Promise<unknown>
    resolve: (value: unknown) => void
    reject: (error: unknown) => void
  }> = []

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent
  }

  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject
      })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.currentRequests >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const item = this.queue.shift()
    if (!item) return

    this.currentRequests++
    
    try {
      const result = await item.execute()
      item.resolve(result)
    } catch (error) {
      item.reject(error)
    } finally {
      this.currentRequests--
      this.processQueue()
    }
  }
}

// ============================================================================
// WaniKani Service
// ============================================================================

export class WaniKaniService {
  private apiToken: string
  private baseUrl = 'https://api.wanikani.com/v2'
  private cacheStorage: ICacheStorage
  private requestQueue: RequestQueue
  private inflightRequests: Map<string, Promise<unknown>> = new Map()
  
  // Cache configuration - extended TTLs for stable data
  private cacheConfig: CacheConfig = {
    subjects: 24 * 60 * 60 * 1000,     // 24 hours (was 4 hours)
    user: 60 * 60 * 1000,             // 1 hour
    assignments: 30 * 60 * 1000,      // 30 minutes
    reviewStats: 30 * 60 * 1000,      // 30 minutes
    reviews: Infinity,                // Never expire - reviews never change
    summary: 60 * 60 * 1000,          // 1 hour - changes every hour
    levelProgressions: 4 * 60 * 60 * 1000, // 4 hours (was 1 hour)
    spacedRepetitionSystems: 48 * 60 * 60 * 1000 // 48 hours (was 12 hours)
  }

  // Exponential backoff config
  private readonly maxRetries = 4
  private readonly baseRetryDelay = 1000 // 1 second

  constructor(apiToken: string) {
    this.apiToken = apiToken
    this.cacheStorage = new LocalStorageCacheStorage()
    this.requestQueue = new RequestQueue(3) // Max 3 concurrent requests
  }

  private getCacheKey(endpoint: string): string {
    // Create a cache key that includes the last 8 characters of the token for user isolation
    return `wanikani-${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}-${this.apiToken.slice(-8)}`
  }

  private getFromCache<T>(key: string): CacheEntry<T> | null {
    return this.cacheStorage.get<T>(key)
  }

  private setCache<T>(key: string, data: T, etag?: string, lastModified?: string, ttl?: number): void {
    // For large datasets like subjects, only cache essential data
    let cacheData = data
    if (key.includes('subjects') && Array.isArray(data)) {
      // Reduce subjects data size by removing less critical fields
      cacheData = data.map((item: unknown) => {
        const subject = item as { id: number; object: string; data: Record<string, unknown> }
        return {
          id: subject.id,
          object: subject.object,
          data: {
            level: subject.data.level,
            characters: subject.data.characters,
            slug: subject.data.slug,
            document_url: subject.data.document_url,
            spaced_repetition_system_id: subject.data.spaced_repetition_system_id,
            meanings: (subject.data.meanings as unknown[])?.slice(0, 3),
            readings: (subject.data.readings as unknown[])?.slice(0, 2),
            hidden_at: subject.data.hidden_at,
            // Preserve dependency tree fields
            component_subject_ids: subject.data.component_subject_ids,
            amalgamation_subject_ids: subject.data.amalgamation_subject_ids,
            // Preserve similar kanji fields
            visually_similar_subject_ids: subject.data.visually_similar_subject_ids
          }
        }
      }) as T
    }

    const entry: CacheEntry<T> = {
      data: cacheData,
      etag,
      lastModified,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
      lastAccessed: Date.now()
    }
    
    this.cacheStorage.set(key, entry)
  }

  private clearExpiredCache(): void {
    const now = Date.now()
    const keys = this.cacheStorage.getAllKeys()
    
    for (const key of keys) {
      try {
        const cached = localStorage.getItem(key)
        if (cached) {
          const entry = JSON.parse(cached)
          if (entry.expiresAt && now > entry.expiresAt) {
            this.cacheStorage.delete(key)
          }
        }
      } catch {
        this.cacheStorage.delete(key)
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async makeRequest<T>(
    endpoint: string, 
    useConditionalRequest: boolean = true,
    cacheTtl?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    const cacheKey = this.getCacheKey(endpoint)
    const cached = this.getFromCache<T>(cacheKey)
    
    // Request deduplication: return existing in-flight request if present
    const inflightKey = `${endpoint}-${this.apiToken.slice(-8)}`
    const existingRequest = this.inflightRequests.get(inflightKey)
    if (existingRequest) {
      return existingRequest as Promise<{ data: T; fromCache: boolean }>
    }

    // Set inflight key before enqueueing to handle sync throws
    let requestPromise: Promise<{ data: T; fromCache: boolean }>
    
    try {
      requestPromise = this.requestQueue.enqueue(async () => {
        return this.executeRequest<T>(endpoint, cacheKey, cached, useConditionalRequest, cacheTtl)
      })
      this.inflightRequests.set(inflightKey, requestPromise)
    } catch (error) {
      // Clean up if enqueue throws synchronously
      this.inflightRequests.delete(inflightKey)
      throw error
    }
    
    try {
      return await requestPromise as { data: T; fromCache: boolean }
    } finally {
      this.inflightRequests.delete(inflightKey)
    }
  }

  private async executeRequest<T>(
    endpoint: string,
    cacheKey: string,
    cached: CacheEntry<T> | null,
    useConditionalRequest: boolean,
    cacheTtl?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Wanikani-Revision': '20170710',
    }

    // Add conditional request headers if we have cached data
    if (useConditionalRequest && cached) {
      if (cached.etag) {
        headers['If-None-Match'] = cached.etag
      } else if (cached.lastModified) {
        headers['If-Modified-Since'] = cached.lastModified
      }
    }

    let lastError: Error | null = null

    // Exponential backoff retry loop
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, { headers })

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const delay = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : this.baseRetryDelay * Math.pow(2, attempt)
          
          console.warn(`Rate limited (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying after ${delay}ms`)
          
          if (attempt < this.maxRetries) {
            await this.sleep(delay)
            continue
          }
          
          // Last attempt failed - return cached data if available
          if (cached) {
            console.warn('Rate limit persists, using cached data')
            return { data: cached.data, fromCache: true }
          }
          throw new Error('Rate limit exceeded. Please wait a moment and try again.')
        }

        return this.handleResponse(response, cacheKey, cached, cacheTtl)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Network error - retry with backoff
        if (attempt < this.maxRetries && !lastError.message.includes('Invalid API token')) {
          const delay = this.baseRetryDelay * Math.pow(2, attempt)
          console.warn(`Request failed (attempt ${attempt + 1}/${this.maxRetries + 1}):`, lastError.message)
          await this.sleep(delay)
          continue
        }
      }
    }

    // All retries exhausted - return cached data if available
    if (cached) {
      console.warn('All retries failed, using cached data:', lastError?.message)
      return { data: cached.data, fromCache: true }
    }
    
    throw lastError || new Error('Request failed after all retries')
  }

  private async handleResponse<T>(
    response: Response,
    cacheKey: string,
    cached: CacheEntry<T> | null,
    cacheTtl?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    if (response.status === 304) {
      // Not modified - return cached data
      if (cached) {
        return { data: cached.data, fromCache: true }
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API token. Please check your token and try again.')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.')
      } else if (response.status === 403) {
        throw new Error('Access denied. Check your subscription level.')
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()
    
    // Cache the response with conditional request headers
    const etag = response.headers.get('ETag')
    const lastModified = response.headers.get('Last-Modified')
    
    this.setCache(cacheKey, data, etag || undefined, lastModified || undefined, cacheTtl)
    
    return { data, fromCache: false }
  }

  private async getAllPages<T>(
    endpoint: string, 
    updatedAfter?: string,
    cacheTtl?: number
  ): Promise<{ data: T[]; fromCache: boolean }> {
    let allData: T[] = []
    let nextUrl: string | undefined = endpoint
    let anyFromCache = false
    
    // Add updated_after filter if provided
    if (updatedAfter) {
      const separator = endpoint.includes('?') ? '&' : '?'
      nextUrl = `${endpoint}${separator}updated_after=${encodeURIComponent(updatedAfter)}`
    }

    while (nextUrl) {
      const result: { data: ApiResponse<T[]>; fromCache: boolean } = await this.makeRequest<ApiResponse<T[]>>(
        nextUrl.replace(this.baseUrl, ''),
        true,
        cacheTtl
      )
      
      const { data: response, fromCache } = result
      
      if (fromCache) anyFromCache = true
      
      allData = allData.concat(response.data)
      nextUrl = response.pages?.next_url

      // Add delay to be respectful to the API (only if not from cache)
      if (nextUrl && !fromCache) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { data: allData, fromCache: anyFromCache }
  }

  // Check if user has access to a specific level based on subscription
  private checkLevelAccess(userData: UserData, level: number): boolean {
    const maxLevel = userData.subscription?.max_level_granted || 3
    return level <= maxLevel
  }

  // Filter subjects based on subscription level
  private filterSubjectsBySubscription(subjects: Subject[], userData: UserData): Subject[] {
    return subjects.filter(subject => this.checkLevelAccess(userData, subject.data.level))
  }

  async getUser(): Promise<UserData> {
    const { data: response } = await this.makeRequest<ApiResponse<UserData>>(
      '/user', 
      true, 
      this.cacheConfig.user
    )
    return response.data
  }

  async getReviewStatistics(updatedAfter?: string): Promise<ReviewStatistic[]> {
    const { data } = await this.getAllPages<ReviewStatistic>(
      '/review_statistics',
      updatedAfter,
      this.cacheConfig.reviewStats
    )
    return data
  }

  async getSubjects(levels?: number[], updatedAfter?: string): Promise<Subject[]> {
    let endpoint = '/subjects'
    const params: string[] = []
    
    if (levels && levels.length > 0) {
      const uniqueLevels = Array.from(new Set(levels)).sort((a, b) => a - b)
      params.push(`levels=${uniqueLevels.join(',')}`)
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`
    }
    
    const { data } = await this.getAllPages<Subject>(
      endpoint,
      updatedAfter,
      this.cacheConfig.subjects
    )
    
    return data
  }

  async getSubjectsWithSubscriptionFilter(userData: UserData, levels?: number[], updatedAfter?: string): Promise<Subject[]> {
    const subjects = await this.getSubjects(levels, updatedAfter)
    return this.filterSubjectsBySubscription(subjects, userData)
  }

  async getAssignments(updatedAfter?: string): Promise<Assignment[]> {
    const { data } = await this.getAllPages<Assignment>(
      '/assignments',
      updatedAfter,
      this.cacheConfig.assignments
    )
    return data
  }

  async getReviews(updatedAfter?: string): Promise<Review[]> {
    const { data } = await this.getAllPages<Review>(
      '/reviews',
      updatedAfter,
      this.cacheConfig.reviews
    )
    return data
  }

  async getLevelProgressions(updatedAfter?: string): Promise<LevelProgression[]> {
    const { data } = await this.getAllPages<LevelProgression>(
      '/level_progressions',
      updatedAfter,
      this.cacheConfig.levelProgressions
    )
    return data
  }

  async getSpacedRepetitionSystems(updatedAfter?: string): Promise<SpacedRepetitionSystem[]> {
    const { data } = await this.getAllPages<SpacedRepetitionSystem>(
      '/spaced_repetition_systems',
      updatedAfter,
      this.cacheConfig.spacedRepetitionSystems
    )
    return data
  }

  async getSummary(): Promise<Summary> {
    const { data: response } = await this.makeRequest<Summary>(
      '/summary',
      true,
      this.cacheConfig.summary
    )
    return response
  }

  async getSubject(id: number): Promise<Subject> {
    const { data: response } = await this.makeRequest<ApiResponse<Subject>>(
      `/subjects/${id}`,
      true,
      this.cacheConfig.subjects
    )
    return response.data
  }

  // Get last sync timestamp for incremental updates
  getLastSyncTimestamp(dataType: keyof CacheConfig): string | null {
    const key = `wanikani-last-sync-${dataType}-${this.apiToken.slice(-8)}`
    return localStorage.getItem(key)
  }

  // Set last sync timestamp
  setLastSyncTimestamp(dataType: keyof CacheConfig, timestamp: string): void {
    const key = `wanikani-last-sync-${dataType}-${this.apiToken.slice(-8)}`
    localStorage.setItem(key, timestamp)
  }

  // Clear all cache for current user
  clearUserCache(): void {
    const userSuffix = this.apiToken.slice(-8)
    const keys = this.cacheStorage.getAllKeys()
    
    const keysToRemove = keys.filter(key => key.includes(`-${userSuffix}`))
    keysToRemove.forEach(key => this.cacheStorage.delete(key))
    console.log(`Cleared ${keysToRemove.length} user cache entries`)
  }

  // Clear all WaniKani cache (for quota issues)
  private clearAllCache(): void {
    this.cacheStorage.clear()
  }

  // Get cache statistics for debugging
  getCacheStats(): { entries: number; totalSize: number; oldestEntry: number | null } {
    const keys = this.cacheStorage.getAllKeys()
    let totalSize = 0
    let oldestTimestamp: number | null = null

    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value) {
        totalSize += value.length
        try {
          const entry = JSON.parse(value)
          if (!oldestTimestamp || (entry.lastAccessed && entry.lastAccessed < oldestTimestamp)) {
            oldestTimestamp = entry.lastAccessed || entry.timestamp
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }

    return {
      entries: keys.length,
      totalSize,
      oldestEntry: oldestTimestamp
    }
  }

  // Get stale cache data immediately (even if expired) for stale-while-revalidate
  getStaleCache<T>(endpoint: string): T | null {
    const cacheKey = this.getCacheKey(endpoint)
    try {
      const cached = localStorage.getItem(cacheKey)
      if (!cached) return null
      
      const entry: CacheEntry<T> = JSON.parse(cached)
      return entry.data
    } catch {
      return null
    }
  }

  // Check if fresh cache exists (not expired)
  hasFreshCache(endpoint: string): boolean {
    const cacheKey = this.getCacheKey(endpoint)
    const cached = this.getFromCache(cacheKey)
    return cached !== null
  }

  // Fetch full subject details by ID (on-demand, not cached to save space)
  async getSubjectDetails(subjectId: number): Promise<Subject | null> {
    try {
      const response = await fetch(`${this.baseUrl}/subjects/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Wanikani-Revision': '20170710'
        }
      })
      
      if (!response.ok) {
        console.error(`Failed to fetch subject ${subjectId}: ${response.status}`)
        return null
      }
      
      const data = await response.json()
      return {
        id: data.id,
        object: data.object,
        data: data.data
      } as Subject
    } catch (error) {
      console.error(`Error fetching subject ${subjectId}:`, error)
      return null
    }
  }
}
