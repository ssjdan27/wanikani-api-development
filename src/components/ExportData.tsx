'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, Loader2 } from 'lucide-react'
import JSZip from 'jszip'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Assignment, ReviewStatistic, LevelProgression, Subject, SpacedRepetitionSystem } from '@/types/wanikani'
import {
  arrayToCSV,
  downloadCSV,
  transformAssignments,
  transformReviewStats,
  transformLevelProgressions,
  transformSubjects,
  assignmentColumns,
  reviewStatColumns,
  levelProgressionColumns,
  subjectColumns,
  getTimestamp
} from '@/utils/csvExport'

interface ExportDataProps {
  assignments: Assignment[]
  reviewStats: ReviewStatistic[]
  levelProgressions: LevelProgression[]
  subjects: Subject[]
  srsSystems: SpacedRepetitionSystem[]
}

type ExportType = 'assignments' | 'reviewStats' | 'levelProgressions' | 'subjects' | 'all'

export default function ExportData({
  assignments,
  reviewStats,
  levelProgressions,
  subjects,
  srsSystems
}: ExportDataProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const exportAssignments = () => {
    const data = transformAssignments(assignments)
    const csv = arrayToCSV(data, assignmentColumns)
    downloadCSV(csv, `wanikani-assignments-${getTimestamp()}.csv`)
  }

  const exportReviewStats = () => {
    const data = transformReviewStats(reviewStats)
    const csv = arrayToCSV(data, reviewStatColumns)
    downloadCSV(csv, `wanikani-review-stats-${getTimestamp()}.csv`)
  }

  const exportLevelProgressions = () => {
    const data = transformLevelProgressions(levelProgressions)
    const csv = arrayToCSV(data, levelProgressionColumns)
    downloadCSV(csv, `wanikani-level-progressions-${getTimestamp()}.csv`)
  }

  const exportSubjects = () => {
    const data = transformSubjects(subjects)
    const csv = arrayToCSV(data, subjectColumns)
    downloadCSV(csv, `wanikani-subjects-${getTimestamp()}.csv`)
  }

  const exportAllAsZip = async () => {
    const timestamp = getTimestamp()
    const zip = new JSZip()

    setExportProgress(t('export.exportingAssignments'))
    const assignmentsData = transformAssignments(assignments)
    const assignmentsCsv = arrayToCSV(assignmentsData, assignmentColumns)
    zip.file(`wanikani-assignments-${timestamp}.csv`, assignmentsCsv)

    setExportProgress(t('export.exportingReviewStats'))
    const reviewStatsData = transformReviewStats(reviewStats)
    const reviewStatsCsv = arrayToCSV(reviewStatsData, reviewStatColumns)
    zip.file(`wanikani-review-stats-${timestamp}.csv`, reviewStatsCsv)

    setExportProgress(t('export.exportingLevelProgress'))
    const levelProgressionsData = transformLevelProgressions(levelProgressions)
    const levelProgressionsCsv = arrayToCSV(levelProgressionsData, levelProgressionColumns)
    zip.file(`wanikani-level-progressions-${timestamp}.csv`, levelProgressionsCsv)

    setExportProgress(t('export.exportingSubjects'))
    const subjectsData = transformSubjects(subjects)
    const subjectsCsv = arrayToCSV(subjectsData, subjectColumns)
    zip.file(`wanikani-subjects-${timestamp}.csv`, subjectsCsv)

    setExportProgress(t('export.creatingZip'))
    const blob = await zip.generateAsync({ type: 'blob' })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wanikani-export-${timestamp}.zip`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = async (type: ExportType) => {
    setIsExporting(true)
    setIsOpen(false)

    try {
      if (type === 'all') {
        await exportAllAsZip()
      } else {
        switch (type) {
          case 'assignments':
            exportAssignments()
            break
          case 'reviewStats':
            exportReviewStats()
            break
          case 'levelProgressions':
            exportLevelProgressions()
            break
          case 'subjects':
            exportSubjects()
            break
        }
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
      setExportProgress('')
    }
  }

  const menuItems: { type: ExportType; label: string; count?: number }[] = [
    { type: 'assignments', label: t('export.assignments'), count: assignments.length },
    { type: 'reviewStats', label: t('export.reviewStats'), count: reviewStats.length },
    { type: 'levelProgressions', label: t('export.levelProgress'), count: levelProgressions.length },
    { type: 'subjects', label: t('export.subjects'), count: subjects.length },
    { type: 'all', label: t('export.allData') }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 border border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-50 dark:hover:bg-gray-700 text-wanikani-text dark:text-wanikani-text-dark rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('export.button')}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {isExporting ? (exportProgress || t('export.exporting')) : t('export.button')}
        </span>
        {!isExporting && <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-wanikani-card-dark border border-wanikani-border dark:border-wanikani-border-dark rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {menuItems.map((item) => (
              <button
                key={item.type}
                onClick={() => handleExport(item.type)}
                className="w-full px-4 py-2 text-left text-sm text-wanikani-text dark:text-wanikani-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark text-xs">
                    ({item.count.toLocaleString()})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
