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

export default function CalendarioLinkedIn({
  posts,
  onSave,
}: {
  posts: LinkedInPost[]
  onSave: (next: LinkedInPost[]) => void
}) {
  const { showToast } = useToast()
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const weeks = useMemo(
    () => Array.from({ length: WEEKS_SHOWN }, (_, i) => weekLabel(i - 1)),
    []
  )

  function marcarPublicado(id: string) {
    const post = posts.find(p => p.id === id)
    if (!post) return
    const already = post.status === 'publicado'
    onSave(posts.map(p => p.id === id ? { ...p, status: already ? 'rascunho' : 'publicado' } : p))
    showToast(already ? 'Marcado como rascunho' : '✓ Publicado!')
  }

  function deletar(id: string) {
    if (!confirm('Remover este post do calendário?')) return
    onSave(posts.filter(p => p.id !== id))
    showToast('Post removido')
  }

  function onDragStart(id: string) { setDragging(id) }
  function onDragOver(e: React.DragEvent, week: string) {
    e.preventDefault()
    setDragOver(week)
  }
  function onDrop(e: React.DragEvent, week: string) {
    e.preventDefault()
    if (!dragging) return
    onSave(posts.map(p => p.id === dragging ? { ...p, semana: week } : p))
    setDragging(null)
    setDragOver(null)
  }
  function onDragEnd() { setDragging(null); setDragOver(null) }

  const totalPosts    = posts.length
  const totalPublished = posts.filter(p => p.status === 'publicado').length

  return (
    <div>
      <h2>Calendário LinkedIn</h2>
      <p className="c-subtitle">Organize seus posts — meta de {META_SEMANAL}× por semana</p>

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
          const weekPosts = posts.filter(p => p.semana === week)
          const publishedCount = weekPosts.filter(p => p.status === 'publicado').length
          const goalMet = publishedCount >= META_SEMANAL
          const isEmpty = weekPosts.length === 0
          const isOver  = dragOver === week

          return (
            <div
              key={week}
              className={`c-cal-row${isEmpty ? ' empty' : ''}${isOver ? ' drag-over' : ''}`}
              onDragOver={e => onDragOver(e, week)}
              onDrop={e => onDrop(e, week)}
              onDragLeave={() => setDragOver(null)}
            >
              <div className="c-cal-row-header">
                <span className="c-cal-row-label">{week}</span>

                {/* Goal indicator */}
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
              </div>

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
                      <div className="c-cal-pauta-titulo">
                        {p.conteudo.split('\n')[0].slice(0, 80)}{p.conteudo.length > 80 ? '…' : ''}
                      </div>
                      <div className="c-cal-pauta-actions">
                        <button
                          className={`c-cal-pauta-badge ${p.status === 'publicado' ? 'published' : 'planned'}`}
                          onClick={() => marcarPublicado(p.id)}
                          title={p.status === 'publicado' ? 'Marcar como rascunho' : 'Marcar como publicado'}
                        >
                          {p.status === 'publicado' ? '✓ publicado' : 'publicar'}
                        </button>
                        <button
                          className="c-cal-delete-btn"
                          onClick={() => deletar(p.id)}
                          title="Remover"
                        >
                          ×
                        </button>
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
          <div style={{ fontSize: 12, marginTop: 6 }}>Gere um post e clique em "Salvar no calendário"</div>
        </div>
      )}
    </div>
  )
}
