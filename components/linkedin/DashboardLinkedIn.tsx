'use client'

import { useMemo } from 'react'
import { weekLabel } from '@/lib/utils'
import type { LinkedInPost, PostTipo, LISection } from '@/lib/types'

const TIPO_LABEL: Record<PostTipo, string> = {
  noticia:     'Notícia',
  produto:     'Produto',
  prova_social:'Prova Social',
  dica:        'Dica',
  personal:    'Personal',
  video_demo:  'Vídeo',
}

const TIPO_COLOR: Record<PostTipo, string> = {
  noticia:     'li-t-noticia',
  produto:     'li-t-produto',
  prova_social:'li-t-prova',
  dica:        'li-t-dica',
  personal:    'li-t-personal',
  video_demo:  'li-t-video',
}

const META_SEMANAL = 2

export default function DashboardLinkedIn({
  posts,
  onNav,
}: {
  posts: LinkedInPost[]
  onNav: (s: LISection) => void
}) {
  const thisWeek = weekLabel(0)

  const stats = useMemo(() => {
    const thisWeekPosts = posts.filter(p => p.semana === thisWeek)
    const published = posts.filter(p => p.status === 'publicado').length
    const drafts    = posts.filter(p => p.status === 'rascunho').length
    const weekPublished = thisWeekPosts.filter(p => p.status === 'publicado').length
    const weekTotal     = thisWeekPosts.length
    const streak = calcStreak(posts)
    return { published, drafts, total: posts.length, weekPublished, weekTotal, streak }
  }, [posts, thisWeek])

  const recent = useMemo(() => [...posts].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5), [posts])

  const weekGoalPct = Math.min(100, Math.round((stats.weekPublished / META_SEMANAL) * 100))

  return (
    <div>
      <h2>Dashboard LinkedIn</h2>
      <p className="c-subtitle">Visão geral do seu conteúdo — meta: {META_SEMANAL}× por semana</p>

      {/* Metrics */}
      <div className="c-metrics">
        <div className="c-metric">
          <div className="c-metric-value">{stats.total}</div>
          <div className="c-metric-label">Posts criados</div>
        </div>
        <div className="c-metric">
          <div className="c-metric-value" style={{ color: 'var(--c-green)' }}>{stats.published}</div>
          <div className="c-metric-label">Publicados</div>
        </div>
        <div className="c-metric">
          <div className="c-metric-value" style={{ color: 'var(--c-accent3)' }}>{stats.drafts}</div>
          <div className="c-metric-label">Rascunhos</div>
        </div>
        <div className="c-metric">
          <div className="c-metric-value" style={{ color: 'var(--c-accent2)' }}>{stats.streak}</div>
          <div className="c-metric-label">Semanas seguidas</div>
        </div>
      </div>

      {/* Weekly goal */}
      <div className="c-card" style={{ marginBottom: 24 }}>
        <div className="c-li-goal-header">
          <span className="c-li-goal-title">Meta da semana</span>
          <span className="c-li-goal-count">
            <span style={{ color: weekGoalPct >= 100 ? 'var(--c-green)' : 'var(--c-accent)' }}>
              {stats.weekPublished}
            </span>
            <span style={{ color: 'var(--c-muted)' }}>/{META_SEMANAL} publicados</span>
          </span>
        </div>
        <div className="c-li-goal-bar-bg">
          <div
            className="c-li-goal-bar-fill"
            style={{
              width: `${weekGoalPct}%`,
              background: weekGoalPct >= 100 ? 'var(--c-green)' : 'var(--c-accent)',
            }}
          />
        </div>
        <div className="c-li-goal-dots">
          {Array.from({ length: META_SEMANAL }).map((_, i) => (
            <div
              key={i}
              className={`c-li-goal-dot${i < stats.weekPublished ? ' done' : i < stats.weekTotal ? ' draft' : ''}`}
            />
          ))}
          <span className="c-li-goal-week">{thisWeek}</span>
        </div>
        {weekGoalPct >= 100 && (
          <div className="c-li-goal-badge">🏆 Meta da semana batida!</div>
        )}
        {stats.weekTotal > stats.weekPublished && stats.weekTotal > 0 && (
          <div className="c-li-goal-hint">
            {stats.weekTotal - stats.weekPublished} rascunho{stats.weekTotal - stats.weekPublished > 1 ? 's' : ''} aguardando publicação
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="c-grid-2" style={{ marginBottom: 24 }}>
        <button className="c-li-quick-card" onClick={() => onNav('li-gerador')}>
          <div className="c-li-quick-icon">⚡</div>
          <div>
            <div className="c-li-quick-title">Gerar novo post</div>
            <div className="c-li-quick-desc">IA gera um post com base no seu SaaS e ICP</div>
          </div>
        </button>
        <button className="c-li-quick-card" onClick={() => onNav('li-calendario')}>
          <div className="c-li-quick-icon">📅</div>
          <div>
            <div className="c-li-quick-title">Ver calendário</div>
            <div className="c-li-quick-desc">Organize e marque publicações da semana</div>
          </div>
        </button>
      </div>

      {/* Recent posts */}
      {recent.length > 0 && (
        <div>
          <div className="c-li-section-title">Posts recentes</div>
          <div className="c-calendar-list">
            {recent.map(p => (
              <div key={p.id} className={`c-cal-pauta-item${p.status === 'publicado' ? ' publicado' : ''}`}>
                <span className={`c-li-tipo-tag ${TIPO_COLOR[p.tipo]}`} style={{ fontSize: 10 }}>
                  {TIPO_LABEL[p.tipo]}
                </span>
                <div className="c-cal-pauta-dot" />
                <div className="c-cal-pauta-titulo">
                  {p.conteudo.split('\n')[0].slice(0, 90)}{p.conteudo.length > 90 ? '…' : ''}
                </div>
                <div className="c-cal-pauta-actions">
                  <span className={`c-cal-pauta-badge ${p.status === 'publicado' ? 'published' : 'planned'}`}>
                    {p.status === 'publicado' ? 'publicado' : 'rascunho'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <div className="c-card" style={{ textAlign: 'center', padding: 48, color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nenhum post criado ainda</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            Configure o contexto do seu SaaS e gere o primeiro post
          </div>
          <button className="c-btn" onClick={() => onNav('li-gerador')}>
            ⚡ Criar primeiro post
          </button>
        </div>
      )}
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────
function calcStreak(posts: LinkedInPost[]): number {
  const publishedWeeks = new Set(
    posts.filter(p => p.status === 'publicado').map(p => p.semana)
  )
  // Estimate streak by counting recent consecutive weeks that had >= 1 published post
  // weekLabel(0) = this week, weekLabel(-1) = last week, etc.
  let streak = 0
  for (let i = 0; i >= -52; i--) {
    if (publishedWeeks.has(weekLabel(i))) streak++
    else break
  }
  return streak
}
