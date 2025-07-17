import type { UserData, ReviewStatistic, Subject, Assignment, ApiResponse } from '@/types/wanikani'

export class WaniKaniService {
  private apiToken: string
  private baseUrl = 'https://api.wanikani.com/v2'

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Wanikani-Revision': '20170710',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API token. Please check your token and try again.')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.')
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
    }

    return response.json()
  }

  private async getAllPages<T>(endpoint: string): Promise<T[]> {
    let allData: T[] = []
    let nextUrl: string | undefined = endpoint

    while (nextUrl) {
      const response: ApiResponse<T[]> = await this.makeRequest(nextUrl.replace(this.baseUrl, ''))
      allData = allData.concat(response.data)
      nextUrl = response.pages?.next_url

      // Add delay to be respectful to the API
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return allData
  }

  async getUser(): Promise<UserData> {
    const response: ApiResponse<UserData> = await this.makeRequest('/user')
    return response.data
  }

  async getReviewStatistics(): Promise<ReviewStatistic[]> {
    return this.getAllPages<ReviewStatistic>('/review_statistics')
  }

  async getSubjects(levels?: number[]): Promise<Subject[]> {
    let endpoint = '/subjects'
    if (levels && levels.length > 0) {
      const levelParams = levels.map(l => `levels=${l}`).join('&')
      endpoint += `?${levelParams}`
    }
    return this.getAllPages<Subject>(endpoint)
  }

  async getAssignments(): Promise<Assignment[]> {
    return this.getAllPages<Assignment>('/assignments')
  }

  async getSubject(id: number): Promise<Subject> {
    const response: ApiResponse<Subject> = await this.makeRequest(`/subjects/${id}`)
    return response.data
  }
}
