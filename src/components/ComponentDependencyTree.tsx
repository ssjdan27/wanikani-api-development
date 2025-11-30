'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { ChevronRight, ChevronDown, Search, ExternalLink } from 'lucide-react'
import type { Subject, Assignment } from '@/types/wanikani'
import { useLanguage } from '@/contexts/LanguageContext'
import { useWanaKanaBind, toHiragana, isRomaji } from '@/hooks/useWanaKana'
import type { RawNodeDatum, CustomNodeElementProps, TreeProps } from 'react-d3-tree'

// Dynamically import react-d3-tree to avoid SSR issues
const Tree = dynamic<TreeProps>(
  () => import('react-d3-tree').then(mod => mod.Tree),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-96">Loading tree...</div>
  }
)

interface ComponentDependencyTreeProps {
  subjects: Subject[]
  assignments: Assignment[]
}

type Direction = 'components' | 'usedIn'

interface TreeNodeData extends RawNodeDatum {
  name: string
  attributes?: {
    subjectId: number
    type: string
    srsStage: number
    documentUrl?: string
    hasMoreChildren?: boolean
    depth: number
  }
  children?: TreeNodeData[]
}

interface FlatNode {
  id: number
  label: string
  type: string
  srsStage: number
  documentUrl?: string
  depth: number
  hasChildren: boolean
  isExpanded: boolean
}

// SRS stage colors matching WaniKani
const getSrsColor = (stage: number): string => {
  if (stage === 0) return '#a0a0a0'      // Locked - gray
  if (stage <= 4) return '#dd0093'       // Apprentice - pink
  if (stage <= 6) return '#882d9e'       // Guru - purple
  if (stage === 7) return '#294ddb'      // Master - blue
  if (stage === 8) return '#0093dd'      // Enlightened - cyan
  return '#fbc042'                        // Burned - gold
}

const getSrsLabel = (stage: number, t: (key: string) => string): string => {
  if (stage === 0) return t('dependencyTree.locked')
  if (stage <= 4) return t('dependencyTree.apprentice')
  if (stage <= 6) return t('dependencyTree.guru')
  if (stage === 7) return t('dependencyTree.master')
  if (stage === 8) return t('dependencyTree.enlightened')
  return t('dependencyTree.burned')
}

const getSubjectBgColor = (type: string): string => {
  switch (type) {
    case 'radical': return '#00aaff'
    case 'kanji': return '#ff00aa'
    case 'vocabulary':
    case 'kana_vocabulary': return '#aa00ff'
    default: return '#666666'
  }
}

export default function ComponentDependencyTree({ subjects, assignments }: ComponentDependencyTreeProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [direction, setDirection] = useState<Direction>('components')
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Bind WanaKana for romaji to kana conversion (Shift for katakana)
  useWanaKanaBind(searchInputRef)

  // Check for mobile breakpoint (768px)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Create lookup maps
  const subjectById = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects])
  const assignmentBySubjectId = useMemo(() => {
    const map = new Map<number, Assignment>()
    assignments.forEach(a => map.set(a.data.subject_id, a))
    return map
  }, [assignments])

  // Get SRS stage for a subject
  const getSrsStage = useCallback((subjectId: number): number => {
    const assignment = assignmentBySubjectId.get(subjectId)
    return assignment?.data.srs_stage ?? 0
  }, [assignmentBySubjectId])

  // Search subjects with WanaKana support for romaji input
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    // Convert romaji to hiragana for matching readings
    const hiraganaQuery = isRomaji(query) ? toHiragana(query) : query
    
    return subjects
      .filter(s => {
        const chars = s.data.characters?.toLowerCase() || ''
        const slug = s.data.slug?.toLowerCase() || ''
        const meanings = s.data.meanings?.map(m => m.meaning.toLowerCase()).join(' ') || ''
        // Match readings using hiragana-converted query
        const readings = s.data.readings?.map(r => r.reading.toLowerCase()) || []
        const matchesReading = readings.some(r => r.includes(hiraganaQuery))
        
        return chars.includes(query) || slug.includes(query) || meanings.includes(query) || matchesReading
      })
      .slice(0, 20)
  }, [subjects, searchQuery])

  // Build tree data structure
  const buildTreeNode = useCallback((
    subjectId: number,
    dir: Direction,
    depth: number,
    maxDepth: number,
    visited: Set<number>
  ): TreeNodeData | null => {
    if (visited.has(subjectId) || depth > maxDepth) return null
    
    const subject = subjectById.get(subjectId)
    if (!subject) return null

    visited.add(subjectId)
    const label = subject.data.characters || subject.data.slug || '?'
    const srsStage = getSrsStage(subjectId)

    const relatedIds = dir === 'components' 
      ? subject.data.component_subject_ids || []
      : subject.data.amalgamation_subject_ids || []

    const children: TreeNodeData[] = []
    if (depth < maxDepth) {
      for (const childId of relatedIds.slice(0, 10)) { // Limit children
        const childNode = buildTreeNode(childId, dir, depth + 1, maxDepth, new Set(visited))
        if (childNode) children.push(childNode)
      }
    }

    return {
      name: label,
      attributes: {
        subjectId,
        type: subject.object,
        srsStage,
        documentUrl: subject.data.document_url,
        hasMoreChildren: relatedIds.length > children.length || depth >= maxDepth,
        depth
      },
      children: children.length > 0 ? children : undefined
    }
  }, [subjectById, getSrsStage])

  // Tree data for selected subject
  const treeData = useMemo((): TreeNodeData | null => {
    if (!selectedSubject) return null
    return buildTreeNode(selectedSubject.id, direction, 0, 3, new Set())
  }, [selectedSubject, direction, buildTreeNode])

  // Flatten tree for mobile list view
  const flattenTree = useCallback((
    subjectId: number,
    dir: Direction,
    depth: number,
    maxDepth: number,
    visited: Set<number>
  ): FlatNode[] => {
    if (visited.has(subjectId) || depth > maxDepth) return []
    
    const subject = subjectById.get(subjectId)
    if (!subject) return []

    visited.add(subjectId)
    const label = subject.data.characters || subject.data.slug || '?'
    const srsStage = getSrsStage(subjectId)

    const relatedIds = dir === 'components'
      ? subject.data.component_subject_ids || []
      : subject.data.amalgamation_subject_ids || []

    const isExpanded = expandedNodes.has(subjectId)
    const nodes: FlatNode[] = [{
      id: subjectId,
      label,
      type: subject.object,
      srsStage,
      documentUrl: subject.data.document_url,
      depth,
      hasChildren: relatedIds.length > 0,
      isExpanded
    }]

    if (isExpanded && depth < maxDepth) {
      for (const childId of relatedIds.slice(0, 15)) {
        nodes.push(...flattenTree(childId, dir, depth + 1, maxDepth, new Set(visited)))
      }
    }

    return nodes
  }, [subjectById, getSrsStage, expandedNodes])

  const flatNodes = useMemo((): FlatNode[] => {
    if (!selectedSubject) return []
    return flattenTree(selectedSubject.id, direction, 0, 3, new Set())
  }, [selectedSubject, direction, flattenTree])

  const toggleNode = useCallback((nodeId: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  const handleSelectSubject = useCallback((subject: Subject) => {
    setSelectedSubject(subject)
    setSearchQuery(subject.data.characters || subject.data.slug || '')
    setShowSearchResults(false)
    setExpandedNodes(new Set([subject.id]))
  }, [])

  // Custom node renderer for react-d3-tree
  const renderCustomNode = useCallback(({ nodeDatum }: CustomNodeElementProps) => {
    const data = nodeDatum as TreeNodeData
    const attrs = data.attributes
    if (!attrs) return <g />

    const bgColor = getSubjectBgColor(attrs.type)
    const ringColor = getSrsColor(attrs.srsStage)
    const size = 40

    return (
      <g>
        {/* SRS ring */}
        <circle
          r={size / 2 + 4}
          fill="none"
          stroke={ringColor}
          strokeWidth={4}
        />
        {/* Subject background */}
        <circle
          r={size / 2}
          fill={bgColor}
          onClick={() => {
            if (attrs.documentUrl) {
              window.open(attrs.documentUrl, '_blank')
            }
          }}
          style={{ cursor: attrs.documentUrl ? 'pointer' : 'default' }}
        />
        {/* Label */}
        <text
          fill="white"
          fontSize={14}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ pointerEvents: 'none' }}
        >
          {data.name}
        </text>
        {/* Expand indicator */}
        {attrs.hasMoreChildren && (
          <text
            fill="#666"
            fontSize={10}
            x={0}
            y={size / 2 + 16}
            textAnchor="middle"
            style={{ cursor: 'default' }}
          >
            +more
          </text>
        )}
      </g>
    )
  }, [])

  // Mobile list item component
  const MobileListRow = useCallback(({ node }: { node: FlatNode }) => {
    const bgColor = getSubjectBgColor(node.type)
    const ringColor = getSrsColor(node.srsStage)

    return (
      <div 
        className="flex items-center gap-2 px-4 py-2 border-b border-wanikani-border dark:border-wanikani-border-dark hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {/* Indentation */}
        <div style={{ width: node.depth * 24 }} />
        
        {/* Expand/collapse toggle */}
        {node.hasChildren ? (
          <button
            onClick={() => toggleNode(node.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            {node.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Subject badge with SRS ring */}
        <div 
          className="relative flex-shrink-0"
          style={{ 
            width: 32, 
            height: 32,
          }}
        >
          <div 
            className="absolute inset-0 rounded-full"
            style={{ 
              border: `3px solid ${ringColor}`,
            }}
          />
          <div 
            className="absolute inset-1 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: bgColor }}
          >
            {node.label}
          </div>
        </div>

        {/* SRS label */}
        <span 
          className="text-xs px-2 py-0.5 rounded"
          style={{ 
            backgroundColor: `${ringColor}20`,
            color: ringColor
          }}
        >
          {getSrsLabel(node.srsStage, t)}
        </span>

        {/* Link to WaniKani */}
        {node.documentUrl && (
          <a
            href={node.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto p-1 text-wanikani-text-light hover:text-wanikani-pink transition-colors"
            title={t('dependencyTree.clickToOpen')}
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    )
  }, [toggleNode, t])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-wanikani-text dark:text-wanikani-text-dark">
            {t('dependencyTree.title')} 🌳
          </h3>
          <p className="text-sm text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('dependencyTree.subtitle')}
          </p>
        </div>

        {/* Direction toggle */}
        {selectedSubject && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setDirection('components')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                direction === 'components'
                  ? 'bg-white dark:bg-gray-700 text-wanikani-text dark:text-wanikani-text-dark shadow-sm'
                  : 'text-wanikani-text-light dark:text-wanikani-text-light-dark hover:text-wanikani-text dark:hover:text-wanikani-text-dark'
              }`}
            >
              {t('dependencyTree.components')}
            </button>
            <button
              onClick={() => setDirection('usedIn')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                direction === 'usedIn'
                  ? 'bg-white dark:bg-gray-700 text-wanikani-text dark:text-wanikani-text-dark shadow-sm'
                  : 'text-wanikani-text-light dark:text-wanikani-text-light-dark hover:text-wanikani-text dark:hover:text-wanikani-text-dark'
              }`}
            >
              {t('dependencyTree.usedIn')}
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wanikani-text-light" size={18} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchResults(true)
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder={t('dependencyTree.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-wanikani-border dark:border-wanikani-border-dark rounded-lg bg-white dark:bg-wanikani-card-dark text-wanikani-text dark:text-wanikani-text-dark focus:outline-none focus:ring-2 focus:ring-wanikani-pink"
          />
        </div>

        {/* Search results dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-wanikani-card-dark border border-wanikani-border dark:border-wanikani-border-dark rounded-lg shadow-lg max-h-64 overflow-auto">
            {searchResults.map(subject => {
              const srsStage = getSrsStage(subject.id)
              const bgColor = getSubjectBgColor(subject.object)
              const ringColor = getSrsColor(srsStage)
              
              return (
                <button
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                >
                  <div 
                    className="relative flex-shrink-0"
                    style={{ width: 28, height: 28 }}
                  >
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{ border: `2px solid ${ringColor}` }}
                    />
                    <div 
                      className="absolute inset-0.5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: bgColor }}
                    >
                      {subject.data.characters || subject.data.slug?.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-wanikani-text dark:text-wanikani-text-dark truncate">
                      {subject.data.characters || subject.data.slug}
                    </div>
                    <div className="text-xs text-wanikani-text-light dark:text-wanikani-text-light-dark truncate">
                      {subject.data.meanings?.slice(0, 2).map(m => m.meaning).join(', ')}
                    </div>
                  </div>
                  <span 
                    className="text-xs px-2 py-0.5 rounded capitalize"
                    style={{ backgroundColor: `${bgColor}20`, color: bgColor }}
                  >
                    {subject.object.replace('_', ' ')}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {showSearchResults && searchQuery && searchResults.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-wanikani-card-dark border border-wanikani-border dark:border-wanikani-border-dark rounded-lg shadow-lg p-4 text-center text-wanikani-text-light dark:text-wanikani-text-light-dark">
            {t('dependencyTree.noResults')}
          </div>
        )}
      </div>

      {/* Click outside to close search results */}
      {showSearchResults && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowSearchResults(false)}
        />
      )}

      {/* Tree visualization or empty state */}
      <div ref={containerRef} className="flex-1 min-h-[400px] relative">
        {!selectedSubject ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-8">
            <div className="text-wanikani-text-light dark:text-wanikani-text-light-dark">
              <p className="text-lg mb-2">{t('dependencyTree.emptyPrompt')}</p>
            </div>
          </div>
        ) : isMobile ? (
          // Mobile: Scrollable list view
          <div className="h-[400px] border border-wanikani-border dark:border-wanikani-border-dark rounded-lg overflow-auto">
            {flatNodes.length > 0 ? (
              <div>
                {flatNodes.slice(0, 100).map((node, index) => (
                  <MobileListRow key={node.id} node={node} />
                ))}
                {flatNodes.length > 100 && (
                  <div className="p-4 text-center text-wanikani-text-light">
                    {t('dependencyTree.loadMore')} ({flatNodes.length - 100} more)
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-wanikani-text-light">
                {t('dependencyTree.noResults')}
              </div>
            )}
          </div>
        ) : (
          // Desktop: Tree view
          <div className="h-full border border-wanikani-border dark:border-wanikani-border-dark rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
            {treeData && (
              <Tree
                data={treeData}
                orientation="vertical"
                pathFunc="step"
                translate={{ x: 300, y: 50 }}
                nodeSize={{ x: 100, y: 100 }}
                separation={{ siblings: 1.5, nonSiblings: 2 }}
                renderCustomNodeElement={renderCustomNode}
                zoom={0.8}
                enableLegacyTransitions
                transitionDuration={300}
              />
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {selectedSubject && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a0a0a0' }} />
            <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('dependencyTree.locked')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dd0093' }} />
            <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('dependencyTree.apprentice')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#882d9e' }} />
            <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('dependencyTree.guru')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#294ddb' }} />
            <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('dependencyTree.master')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0093dd' }} />
            <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('dependencyTree.enlightened')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbc042' }} />
            <span className="text-wanikani-text-light dark:text-wanikani-text-light-dark">{t('dependencyTree.burned')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
