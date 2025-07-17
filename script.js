class WaniKaniAnalyzer {
    constructor() {
        this.apiToken = '';
        this.baseUrl = 'https://api.wanikani.com/v2';
        
        this.initEventListeners();
    }

    initEventListeners() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const apiTokenInput = document.getElementById('api-token');

        analyzeBtn.addEventListener('click', () => this.analyze());
        
        // Allow Enter key to trigger analysis
        apiTokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyze();
            }
        });
    }

    async analyze() {
        const apiTokenInput = document.getElementById('api-token');
        this.apiToken = apiTokenInput.value.trim();

        if (!this.apiToken) {
            this.showError('Please enter your WaniKani API token');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            // Fetch user information and review statistics in parallel
            const [userInfo, reviewStatsData] = await Promise.all([
                this.fetchUserInfo(),
                this.fetchReviews()
            ]);

            this.displayResults(userInfo, reviewStatsData);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async fetchUserInfo() {
        const response = await this.makeApiRequest('/user');
        return response.data;
    }

    async fetchReviews() {
        let allReviewStats = [];
        let nextUrl = `${this.baseUrl}/review_statistics`;

        while (nextUrl) {
            const response = await this.makeApiRequest(nextUrl, false);
            allReviewStats = allReviewStats.concat(response.data);
            
            // Check if there are more pages
            nextUrl = response.pages?.next_url || null;
            
            // Add a small delay to be respectful to the API
            if (nextUrl) {
                await this.delay(100);
            }
        }

        return allReviewStats;
    }

    async makeApiRequest(url, useBaseUrl = true) {
        const fullUrl = useBaseUrl ? `${this.baseUrl}${url}` : url;
        
        const response = await fetch(fullUrl, {
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Wanikani-Revision': '20170710'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API token. Please check your token and try again.');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            } else {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
        }

        return await response.json();
    }

    displayResults(userInfo, reviewStatsData) {
        // Filter out hidden review statistics and calculate total reviews
        const visibleStats = reviewStatsData.filter(stat => !stat.data.hidden);
        
        const totalCorrect = visibleStats.reduce((total, stat) => {
            return total + stat.data.meaning_correct + stat.data.reading_correct;
        }, 0);
        
        const totalIncorrect = visibleStats.reduce((total, stat) => {
            return total + stat.data.meaning_incorrect + stat.data.reading_incorrect;
        }, 0);
        
        const totalReviews = totalCorrect + totalIncorrect;
        const overallAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews * 100) : 0;
        
        // Update total reviews
        document.getElementById('total-reviews').textContent = totalReviews.toLocaleString();
        
        // Update overall accuracy
        document.getElementById('overall-accuracy').textContent = `${overallAccuracy.toFixed(2)}%`;
        
        // Update user level
        document.getElementById('user-level').textContent = userInfo.level;
        
        // Update account creation date
        const createdDate = new Date(userInfo.started_at);
        document.getElementById('account-created').textContent = createdDate.toLocaleDateString();

        this.showResults();
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('analyze-btn').disabled = true;
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('analyze-btn').disabled = false;
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }

    showResults() {
        document.getElementById('results').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('results').classList.add('hidden');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the analyzer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WaniKaniAnalyzer();
});
