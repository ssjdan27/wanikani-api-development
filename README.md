# WaniKani Dashboard

A comprehensive Next.js dashboard for analyzing and visualizing your WaniKani Japanese learning progress.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4)

## Features

### 📊 Statistics & Analytics
- **Stats Overview** - Total reviews, lessons, accuracy rates, and study time
- **Level Progress** - Current level progression with radicals, kanji, and vocabulary breakdown
- **SRS Stage Histogram** - Visual distribution of items across all SRS stages
- **Accuracy Chart** - Meaning vs reading accuracy over time with Chart.js visualizations
- **Study Heatmap** - GitHub-style activity heatmap showing your study patterns

### 🎯 Learning Tools
- **Leech Detector** - Identify problem items that keep failing reviews
- **Critical Items** - Track items that have dropped SRS stages and need attention
- **Streak Analysis** - View your longest answer streaks and hot streak items
- **Level Pacing Coach** - Get personalized advice on your learning pace
- **Lesson Batching Helper** - Optimize your lesson batch sizes

### 📈 Projections
- **Level Projection Chart** - Estimate when you'll reach future levels
- **Burn Projection Chart** - Predict when items will reach "Burned" status
- **Burn Radar** - Radar chart visualization of items approaching burn status

### 🎨 Customization
- **6 Beautiful Themes**:
  - ☀️ Light - Clean and bright
  - 🌙 Dark - Easy on the eyes
  - 🌸 Sakura - Soft pink cherry blossom
  - 🦀 Crabigator - WaniKani cyan/teal
  - 🌌 Midnight - Deep purple/indigo
  - 🌊 Ocean - Calming deep blue
- **Language Toggle** - Switch between English and Japanese UI
- **Subject Grid** - Browse all your unlocked items with filtering

### 📱 Additional Features
- **Subscription Info** - View your WaniKani subscription status
- **Responsive Design** - Works on desktop and mobile
- **Secure API Token Storage** - Token stored locally in your browser

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- WaniKani account with API access

### Installation

```bash
# Clone the repository
git clone https://github.com/ssjdan27/wanikani-api-development.git
cd wanikani-api-development

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Getting Your API Token

1. Go to [WaniKani Personal Access Tokens](https://www.wanikani.com/settings/personal_access_tokens)
2. Click "Generate a new token"
3. Give it a name (e.g., "Dashboard")
4. Ensure it has read permissions for all data types
5. Copy the generated token
6. Paste it into the dashboard

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Lucide React
- **Fonts**: Noto Sans JP (for Japanese text support)

## Project Structure

```
src/
├── app/
│   ├── globals.css    # Global styles and theme definitions
│   ├── layout.tsx     # Root layout with providers
│   └── page.tsx       # Main page component
├── components/
│   ├── Dashboard.tsx  # Main dashboard container
│   ├── StatsOverview.tsx
│   ├── LevelProgress.tsx
│   ├── AccuracyChart.tsx
│   ├── StudyHeatmap.tsx
│   ├── LeechDetector.tsx
│   ├── CriticalItems.tsx
│   ├── StreakAnalysis.tsx
│   └── ...more
├── contexts/
│   ├── ThemeContext.tsx    # Theme management
│   └── LanguageContext.tsx # i18n support
├── services/
│   └── wanikani.ts    # WaniKani API service
└── types/
    └── wanikani.ts    # TypeScript type definitions
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT

## Acknowledgments

- [WaniKani](https://www.wanikani.com/) for the amazing Japanese learning platform
- [WaniKani API](https://docs.api.wanikani.com/) for making this possible