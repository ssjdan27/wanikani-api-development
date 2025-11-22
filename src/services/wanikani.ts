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

export class WaniKaniService {
  private apiToken: string
  private baseUrl = 'https://api.wanikani.com/v2'
  
  // Cache configuration based on WaniKani recommendations
  private cacheConfig: CacheConfig = {
    subjects: 4 * 60 * 60 * 1000,     // 4 hours - reduced from 24 hours
    user: 60 * 60 * 1000,             // 1 hour
    assignments: 30 * 60 * 1000,      // 30 minutes
    reviewStats: 30 * 60 * 1000,      // 30 minutes
    reviews: Infinity,                // Never expire - reviews never change
    summary: 60 * 60 * 1000,          // 1 hour - changes every hour
    levelProgressions: 60 * 60 * 1000, // 1 hour
    spacedRepetitionSystems: 12 * 60 * 60 * 1000 // 12 hours
  }

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private getCacheKey(endpoint: string): string {
    // Create a cache key that includes the last 8 characters of the token for user isolation
    return `wanikani-${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}-${this.apiToken.slice(-8)}`
  }

  private getFromCache<T>(key: string): CacheEntry<T> | null {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null
      
      const entry: CacheEntry<T> = JSON.parse(cached)
      
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

  private setCache<T>(key: string, data: T, etag?: string, lastModified?: string, ttl?: number): void {
    try {
      // For large datasets like subjects, only cache essential data
      let cacheData = data
      if (key.includes('subjects') && Array.isArray(data)) {
        // Reduce subjects data size by removing less critical fields
        cacheData = data.map((item: any) => ({
          id: item.id,
          object: item.object,
          data: {
            level: item.data.level,
            characters: item.data.characters,
            slug: item.data.slug,
            document_url: item.data.document_url,
            spaced_repetition_system_id: item.data.spaced_repetition_system_id,
            meanings: item.data.meanings?.slice(0, 3), // Keep only first 3 meanings
            readings: item.data.readings?.slice(0, 2), // Keep only first 2 readings
            hidden_at: item.data.hidden_at
          }
        })) as T
      }

      const entry: CacheEntry<T> = {
        data: cacheData,
        etag,
        lastModified,
        timestamp: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : undefined
      }
      
      const jsonString = JSON.stringify(entry)
      
      // Check if the data is too large (>500KB per entry)
      if (jsonString.length > 500000) {
        console.warn('Cache entry too large, skipping cache for:', key.substring(0, 50))
        return
      }
      
      localStorage.setItem(key, jsonString)
    } catch (error) {
      console.warn('Error writing to cache:', error)
      // If localStorage is full, clear all cache and try again
      this.clearAllCache()
      try {
        const entry: CacheEntry<T> = {
          data,
          etag,
          lastModified,
          timestamp: Date.now(),
          expiresAt: ttl ? Date.now() + ttl : undefined
        }
        localStorage.setItem(key, JSON.stringify(entry))
      } catch (retryError) {
        console.warn('Failed to cache even after clearing:', retryError)
      }
    }
  }

  private clearExpiredCache(): void {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('wanikani-')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key)!)
          if (entry.expiresAt && now > entry.expiresAt) {
            keysToRemove.push(key)
          }
        } catch (error) {
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  private async makeRequest<T>(
    endpoint: string, 
    useConditionalRequest: boolean = true,
    cacheTtl?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    const cacheKey = this.getCacheKey(endpoint)
    const cached = this.getFromCache<T>(cacheKey)
    
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

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { headers })

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000
        
        console.warn(`Rate limited. Retrying after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Retry the request once
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, { headers })
        return this.handleResponse(retryResponse, cacheKey, cached, cacheTtl)
      }

      return this.handleResponse(response, cacheKey, cached, cacheTtl)
    } catch (error) {
      // If network fails and we have cached data, return it
      if (cached) {
        console.warn('Network error, using cached data:', error)
        return { data: cached.data, fromCache: true }
      }
      throw error
    }
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
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes(`-${userSuffix}`)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  // Clear all WaniKani cache (for quota issues)
  private clearAllCache(): void {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('wanikani-')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared ${keysToRemove.length} cache entries due to storage quota`)
  }
}
