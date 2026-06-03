'use client'

import { useState, useMemo } from 'react'
import { weekLabel } from '@/lib/utils'
import { useToast } from '@/lib/toast-context'
import type { LinkedInPost, PostTipo } from '@/lib/types'

const WEEKS_SHOWN = 6
const META_SEMANAL = 3

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

const ALL_TIPOS = Object.keys(TIPO_LABEL) as PostTipo[]

export default function CalendarioLinkedIn({
  posts,
  onSave,
}: {
  posts: LinkedInPost[]
  onSave: (next: LinkedInPost[]) => void
}) {
  const { showToast } = useToast()
  const [dragging,    setDragging]    = useState<string | null>(null)
  const [dragOver,    setDragOver]    = useState<string | null>(null)
  const [selected,    setSelected]    = useState<LinkedInPost | null>(null)

  // ── Manual add state ──────────────────────────────────────────────────────
  const [addingWeek,  setAddingWeek]  = useState<string | null>(null)
  const [manualTitulo,setManualTitulo]= useState('')
  const [manualTipo,  setManualTipo]  = useState<PostTipo>('personal')
  const [manualStatus,setManualStatus]= useState<'publicado' | 'rascunho'>('publicado')

  const weeks = useMemo(
    () => Array.from({ length: WEEKS_SHOWN }, (_, i) => weekLabel(i - 1)),
    []
  )

  function openAddForm(week: string) {
    setAddingWeek(week)
    setManualTitulo('')
    setManualTipo('personal')
    setManualStatus('publicado')
  }

  function cancelAdd() { setAddingWeek(null) }

  function confirmarAdd() {
    if (!addingWeek || !manualTitulo.trim()) {
      showToast('Informe o título do post'); return
    }
    const novo: LinkedInPost = {
      id:      Date.now().toString(),
      conteudo: manualTitulo.trim(),
      tipo:    manualTipo,
      status:  manualStatus,
      semana:  addingWeek,
      data:    new Date().toISOString(),
    }
    onSave([...posts, novo])
    showToast(manualStatus === 'publicado' ? '✓ Post registrado como publicado!' : '✓ Post adicionado ao calendário!')
    setAddingWeek(null)
  }

  function marcarPublicado(id: string, fromModal = false) {
    const post = posts.find(p => p.id === id)
    if (!post) return
    const already = post.status === 'publicado'
    const next = posts.map(p => p.id === id ? { ...p, status: already ? 'rascunho' as const : 'publicado' as const } : p)
    onSave(next)
    showToast(already ? 'Marcado como rascunho' : '✓ Publicado!')
    if (fromModal && selected?.id === id) {
      setSelected({ ...selected, status: already ? 'rascunho' : 'publicado' })
    }
  }

  function deletar(id: string) {
    if (!confirm('Remover este post do calendário?')) return
    onSave(posts.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
    showToast('Post removido')
  }

  function onDragStart(id: string) { setDragging(id) }
  function onDragOver(e: React.DragEvent, week: string) { e.preventDefault(); setDragOver(week) }
  function onDrop(e: React.DragEvent, week: string) {
    e.preventDefault()
    if (!dragging) return
    onSave(posts.map(p => p.id === dragging ? { ...p, semana: week } : p))
    setDragging(null); setDragOver(null)
  }
  function onDragEnd() { setDragging(null); setDragOver(null) }

  const totalPosts     = posts.length
  const totalPublished = posts.filter(p => p.status === 'publicado').length

  const thisWeek          = useMemo(() => weekLabel(0), [])
  const thisWeekPosts     = posts.filter(p => p.semana === thisWeek)
  const thisWeekPublished = thisWeekPosts.filter(p => p.status === 'publicado').length
  const thisWeekTotal     = thisWeekPosts.length
  const weekGoalPct       = Math.min(100, Math.round((thisWeekPublished / META_SEMANAL) * 100))

  const nextWeek      = useMemo(() => weekLabel(1), [])
  const nextWeekTotal = posts.filter(p => p.semana === nextWeek).length

  function parseContent(conteudo: string) {
    const lines = conteudo.split('\n')
    const lastLine = lines[lines.length - 1] ?? ''
    const hasHashtags = lastLine.trim().startsWith('#')
    if (hasHashtags) {
      const body = lines.slice(0, -1).join('\n').replace(/\n+$/, '')
      const tags = lastLine.trim().split(/\s+/).filter(t => t.startsWith('#'))
      return { body, tags }
    }
    return { body: conteudo, tags: [] }
  }

  return (
    <div>
      <h2>Calendário LinkedIn</h2>
      <p className="c-subtitle">Organize seus posts — meta de {META_SEMANAL}× por semana</p>

      {/* Weekly goal card */}
      <div className="c-card" style={{ marginBottom: 24 }}>
        <div className="c-li-goal-header">
          <span className="c-li-goal-title">Meta da semana · LinkedIn</span>
          <span className="c-li-goal-count">
            <span style={{ color: weekGoalPct >= 100 ? 'var(--c-green)' : 'var(--c-accent)' }}>
              {thisWeekPublished}
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
              className={`c-li-goal-dot${i < thisWeekPublished ? ' done' : i < thisWeekTotal ? ' draft' : ''}`}
            />
          ))}
          <span className="c-li-goal-week">{thisWeek}</span>
          {weekGoalPct >= 100 && (
            <span className="c-li-goal-badge" style={{ marginLeft: 8, marginTop: 0 }}>
              🏆 Meta batida!
            </span>
          )}
        </div>
        {thisWeekTotal === 0 && (
          <div className="c-li-goal-hint">Nenhum post planejado para esta semana ainda</div>
        )}
        {thisWeekTotal > 0 && thisWeekTotal > thisWeekPublished && (
          <div className="c-li-goal-hint">
            {thisWeekTotal - thisWeekPublished} rascunho{thisWeekTotal - thisWeekPublished > 1 ? 's' : ''} aguardando publicação
          </div>
        )}
        {nextWeekTotal > 0 && (
          <div className="c-li-goal-hint" style={{ marginTop: 4 }}>
            Próxima semana: {nextWeekTotal} post{nextWeekTotal > 1 ? 's' : ''} planejado{nextWeekTotal > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="c-cal-summary">
        <span>{totalPosts} post{totalPosts !== 1 ? 's' : ''} no total</span>
        <span className="c-cal-summary-sep">·</span>
        <span className="c-cal-summary-pub">{totalPublished} publicado{totalPublished !== 1 ? 's' : ''}</span>
        {dragging && (
          <>
            <span className="c-cal-summary-sep">·</span>
            <span className="c-cal-drag-hint">arraste para outra semana</span>
          </>
        )}
      </div>

      <div className="c-calendar-list">
        {weeks.map(week => {
          const weekPosts      = posts.filter(p => p.semana === week)
          const publishedCount = weekPosts.filter(p => p.status === 'publicado').length
          const goalMet        = publishedCount >= META_SEMANAL
          const isEmpty        = weekPosts.length === 0
          const isOver         = dragOver === week
          const isAdding       = addingWeek === week

          return (
            <div
              key={week}
              className={`c-cal-row${isEmpty && !isAdding ? ' empty' : ''}${isOver ? ' drag-over' : ''}`}
              onDragOver={e => onDragOver(e, week)}
              onDrop={e => onDrop(e, week)}
              onDragLeave={() => setDragOver(null)}
            >
              <div className="c-cal-row-header">
                <span className="c-cal-row-label">{week}</span>
                <div className="c-li-cal-goal">
                  {Array.from({ length: META_SEMANAL }).map((_, i) => (
                    <div
                      key={i}
                      className={`c-li-cal-dot${i < publishedCount ? ' done' : i < weekPosts.length ? ' draft' : ''}`}
                    />
                  ))}
                  {goalMet && <span className="c-li-cal-check">✓</span>}
                </div>
                {weekPosts.length > 1 && (
                  <span className="c-cal-row-count">{weekPosts.length}</span>
                )}
                {isOver && dragging && (
                  <span className="c-cal-drop-hint">soltar aqui →</span>
                )}
                {/* Add manual post button */}
                {!isAdding && (
                  <button
                    className="c-cal-add-btn"
                    onClick={() => openAddForm(week)}
                    title="Registrar post manual nesta semana"
                  >
                    ＋
                  </button>
                )}
              </div>

              {/* ── Manual add form ── */}
              {isAdding && (
                <div className="c-cal-manual-form">
                  <input
                    className="c-cal-manual-input"
                    autoFocus
                    placeholder="Título ou descrição do post..."
                    value={manualTitulo}
                    onChange={e => setManualTitulo(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmarAdd(); if (e.key === 'Escape') cancelAdd() }}
                  />
                  <div className="c-cal-manual-row">
                    <select
                      className="c-cal-manual-select"
                      value={manualTipo}
                      onChange={e => setManualTipo(e.target.value as PostTipo)}
                    >
                      {ALL_TIPOS.map(t => (
                        <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                      ))}
                    </select>
                    <div className="c-cal-manual-status">
                      <button
                        className={`c-cal-manual-status-btn${manualStatus === 'publicado' ? ' active-pub' : ''}`}
                        onClick={() => setManualStatus('publicado')}
                      >
                        ✓ Publicado
                      </button>
                      <button
                        className={`c-cal-manual-status-btn${manualStatus === 'rascunho' ? ' active-draft' : ''}`}
                        onClick={() => setManualStatus('rascunho')}
                      >
                        Rascunho
                      </button>
                    </div>
                    <div className="c-cal-manual-actions">
                      <button className="c-btn" style={{ padding: '6px 14px', fontSize: 12 }} onClick={confirmarAdd}>
                        Salvar
                      </button>
                      <button className="c-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={cancelAdd}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isEmpty && (
                <div className="c-cal-pauta-list">
                  {weekPosts.map(p => (
                    <div
                      key={p.id}
                      className={`c-cal-pauta-item${p.status === 'publicado' ? ' publicado' : ''}${dragging === p.id ? ' dragging' : ''}`}
                      draggable
                      onDragStart={() => onDragStart(p.id)}
                      onDragEnd={onDragEnd}
                    >
                      <span className="c-cal-drag-handle" title="Arrastar">⠿</span>
                      <span className={`c-li-tipo-tag ${TIPO_COLOR[p.tipo]}`} style={{ fontSize: 10 }}>
                        {TIPO_LABEL[p.tipo]}
                      </span>
                      <div className="c-cal-pauta-dot" />
                      <button
                        className="c-cal-pauta-titulo c-cal-pauta-titulo-btn"
                        onClick={() => setSelected(p)}
                        title="Ver post completo"
                      >
                        {p.conteudo.split('\n')[0].slice(0, 80)}{p.conteudo.length > 80 ? '…' : ''}
                      </button>
                      <div className="c-cal-pauta-actions">
                        <button
                          className={`c-cal-pauta-badge ${p.status === 'publicado' ? 'published' : 'planned'}`}
                          onClick={() => marcarPublicado(p.id)}
                          title={p.status === 'publicado' ? 'Marcar como rascunho' : 'Marcar como publicado'}
                        >
                          {p.status === 'publicado' ? '✓ publicado' : 'publicar'}
                        </button>
                        <button className="c-cal-delete-btn" onClick={() => deletar(p.id)} title="Remover">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalPosts === 0 && (
        <div className="c-card" style={{ textAlign: 'center', padding: 40, marginTop: 12, color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
          <div style={{ fontSize: 14 }}>Nenhum post no calendário</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Gere um post ou clique em ＋ para registrar manualmente</div>
        </div>
      )}

      {/* ── Modal ── */}
      {selected && (() => {
        const { body, tags } = parseContent(selected.conteudo)
        return (
          <div className="c-modal-overlay" onClick={() => setSelected(null)}>
            <div className="c-modal-box" onClick={e => e.stopPropagation()}>
              <button className="c-modal-close" onClick={() => setSelected(null)}>×</button>

              <div className="c-modal-header">
                <div className="c-modal-tags">
                  <span className={`c-li-tipo-tag ${TIPO_COLOR[selected.tipo]}`}>
                    {TIPO_LABEL[selected.tipo]}
                  </span>
                  <span className="c-tag">{selected.semana}</span>
                  <span className={`c-tag ${selected.status === 'publicado' ? 'green' : 'yellow'}`}>
                    {selected.status === 'publicado' ? '✓ publicado' : 'rascunho'}
                  </span>
                </div>
              </div>

              <div className="c-li-post-preview" style={{ marginTop: 16 }}>
                {body.split('\n').map((line, i) =>
                  line ? <p key={i}>{line}</p> : <br key={i} />
                )}
                {tags.length > 0 && (
                  <div className="c-li-post-hashtags">
                    {tags.map(t => <span key={t}>{t}</span>)}
                  </div>
                )}
              </div>

              <div className="c-li-chars">
                {selected.conteudo.length} caracteres
              </div>

              {selected.imagem_brief && (
                <div className="c-li-visual-brief" style={{ marginTop: 14 }}>
                  <span className="c-li-visual-label">🎨 Visual</span>
                  <span className="c-li-visual-text">{selected.imagem_brief}</span>
                </div>
              )}

              <div className="c-row" style={{ marginTop: 16 }}>
                <button className="c-btn" onClick={() => marcarPublicado(selected.id, true)}>
                  {selected.status === 'publicado' ? '↩ Voltar para rascunho' : '✓ Marcar como publicado'}
                </button>
                <button className="c-btn-ghost" onClick={() => {
                  navigator.clipboard.writeText(selected.conteudo)
                  showToast('✓ Post copiado!')
                }}>
                  📋 Copiar
                </button>
                <button className="c-btn-ghost" onClick={() => setSelected(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
