'use client'

import { useState } from 'react'
import type { Pauta, Section } from '@/lib/types'
import { weekLabel } from '@/lib/utils'

interface Props {
  pautas: Pauta[]
  onSave: (pautas: Pauta[]) => void
  onNav: (section: Section) => void
}

const META_MENSAL = 2

const BLOCOS = [
  { key: 'bloco1' as const, label: 'Bloco 01 — Entretenimento / Hook', color: 'e1' },
  { key: 'bloco2' as const, label: 'Bloco 02 — História + Ensinamento', color: 'e2' },
  { key: 'bloco3' as const, label: 'Bloco 03 — Registro de Rotina',    color: 'e3' },
]

function semanaMonth(semana: string): number {
  const m = semana.match(/\d{2}\/(\d{2})/)
  return m ? parseInt(m[1]) : 0
}

export default function Calendario({ pautas, onSave, onNav }: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [selected, setSelected] = useState<Pauta | null>(null)

  // ── Monthly goal ────────────────────────────────────────────────────────────
  const thisMonth   = new Date().getMonth() + 1
  const nextMonthN  = thisMonth === 12 ? 1 : thisMonth + 1
  const thisMonthPautas = pautas.filter(p => semanaMonth(p.semana) === thisMonth)
  const nextMonthPautas = pautas.filter(p => semanaMonth(p.semana) === nextMonthN)
  const thisPublished   = thisMonthPautas.filter(p => p.status === 'publicado').length
  const thisTotal       = thisMonthPautas.length
  const nextTotal       = nextMonthPautas.length
  const thisMonthLabel  = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const nextMonthLabel  = new Date(new Date().setMonth(new Date().getMonth() + 1))
                            .toLocaleDateString('pt-BR', { month: 'long' })
  const goalPct = Math.min(100, Math.round((thisPublished / META_MENSAL) * 100))

  // ── Calendar ─────────────────────────────────────────────────────────────────
  function marcarPublicado(data: string, fromModal = false) {
    if (!fromModal && !confirm('Marcar este vídeo como publicado?')) return
    const next = pautas.map(p => p.data === data ? { ...p, status: 'publicado' as const } : p)
    onSave(next)
    if (selected?.data === data) setSelected({ ...selected, status: 'publicado' })
  }

  function deletarPauta(data: string) {
    if (!confirm('Excluir esta pauta do calendário?')) return
    onSave(pautas.filter(p => p.data !== data))
    if (selected?.data === data) setSelected(null)
  }

  function onDragStart(e: React.DragEvent, data: string) {
    e.dataTransfer.setData('text/plain', data)
    e.dataTransfer.effectAllowed = 'move'
    setDragging(data)
  }

  function onDrop(e: React.DragEvent, targetLabel: string) {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    if (data) onSave(pautas.map(p => p.data === data ? { ...p, semana: targetLabel } : p))
    setDragging(null)
    setDragOver(null)
  }

  const weeks = Array.from({ length: 8 }, (_, i) => i - 2).map(offset => ({
    offset,
    label: weekLabel(offset),
    pautas: pautas.filter(p => p.semana === weekLabel(offset)),
  }))

  const totalPautas = pautas.length
  const publicados  = pautas.filter(p => p.status === 'publicado').length

  return (
    <div>
      <h2>Calendário Editorial</h2>

      {/* Monthly goal card */}
      <div className="c-card" style={{ marginBottom: 24 }}>
        <div className="c-li-goal-header">
          <span className="c-li-goal-title">Meta mensal · YouTube</span>
          <span className="c-li-goal-count">
            <span style={{ color: goalPct >= 100 ? 'var(--c-green)' : 'var(--c-accent)' }}>
              {thisPublished}
            </span>
            <span style={{ color: 'var(--c-muted)' }}>/{META_MENSAL} publicados</span>
          </span>
        </div>
        <div className="c-li-goal-bar-bg">
          <div
            className="c-li-goal-bar-fill"
            style={{
              width: `${goalPct}%`,
              background: goalPct >= 100 ? 'var(--c-green)' : 'var(--c-accent)',
            }}
          />
        </div>
        <div className="c-li-goal-dots">
          {Array.from({ length: META_MENSAL }).map((_, i) => (
            <div
              key={i}
              className={`c-li-goal-dot${i < thisPublished ? ' done' : i < thisTotal ? ' draft' : ''}`}
            />
          ))}
          <span className="c-li-goal-week" style={{ textTransform: 'capitalize' }}>
            {thisMonthLabel}
          </span>
          {goalPct >= 100 && <span className="c-li-goal-badge" style={{ marginLeft: 8, marginTop: 0 }}>🏆 Meta batida!</span>}
        </div>
        {nextTotal > 0 && (
          <div className="c-li-goal-hint" style={{ marginTop: 10 }}>
            {nextMonthLabel}: {nextTotal} pauta{nextTotal > 1 ? 's' : ''} planejada{nextTotal > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="c-cal-summary">
        <span>{totalPautas} vídeo{totalPautas !== 1 ? 's' : ''} planejado{totalPautas !== 1 ? 's' : ''}</span>
        <span className="c-cal-summary-sep">·</span>
        <span className="c-cal-summary-pub">{publicados} publicado{publicados !== 1 ? 's' : ''}</span>
        {dragging && <span className="c-cal-drag-hint"> · arraste para outra semana</span>}
      </div>

      <div className="c-calendar-list">
        {weeks.map(({ offset, label, pautas: semPautas }) => (
          <div
            key={offset}
            className={`c-cal-row${semPautas.length === 0 ? ' empty' : ''}${dragOver === label ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(label) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
            onDrop={e => onDrop(e, label)}
          >
            <div className="c-cal-row-header">
              <span className="c-cal-row-label">{label}</span>
              {semPautas.length > 1 && (
                <span className="c-cal-row-count">{semPautas.length} vídeos</span>
              )}
              {dragOver === label && dragging && (
                <span className="c-cal-drop-hint">soltar aqui</span>
              )}
              {semPautas.length === 0 && dragOver !== label && (
                <button className="c-cal-add-btn" onClick={() => onNav('gerador')}>+ gerar</button>
              )}
            </div>

            {semPautas.length > 0 && (
              <div className="c-cal-pauta-list">
                {semPautas.map(p => (
                  <div
                    key={p.data}
                    className={`c-cal-pauta-item ${p.status}${dragging === p.data ? ' dragging' : ''}`}
                    draggable
                    onDragStart={e => onDragStart(e, p.data)}
                    onDragEnd={() => { setDragging(null); setDragOver(null) }}
                  >
                    <div className="c-cal-drag-handle" title="Arrastar para mover">⠿</div>
                    <div className="c-cal-pauta-dot" />
                    <button
                      className="c-cal-pauta-titulo c-cal-pauta-titulo-btn"
                      onClick={() => setSelected(p)}
                      title="Ver pauta completa"
                    >
                      {p.titulo}
                    </button>
                    <div className="c-cal-pauta-actions">
                      {p.status === 'publicado' ? (
                        <span className="c-cal-pauta-badge published">✓ publicado</span>
                      ) : (
                        <button
                          className="c-cal-pauta-badge planned"
                          onClick={() => marcarPublicado(p.data)}
                        >
                          marcar publicado
                        </button>
                      )}
                      <button
                        className="c-cal-delete-btn"
                        onClick={() => deletarPauta(p.data)}
                        title="Excluir pauta"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="c-row" style={{ marginTop: 20 }}>
        <button className="c-btn-ghost" onClick={() => onNav('gerador')}>
          + Gerar pauta para nova semana
        </button>
      </div>

      {/* ── Modal ── */}
      {selected && (
        <div className="c-modal-overlay" onClick={() => setSelected(null)}>
          <div className="c-modal-box" onClick={e => e.stopPropagation()}>
            <button className="c-modal-close" onClick={() => setSelected(null)}>×</button>

            <div className="c-modal-header">
              <div className="c-modal-tags">
                <span className="c-tag">{selected.semana}</span>
                <span className={`c-tag ${selected.status === 'publicado' ? 'green' : 'yellow'}`}>
                  {selected.status === 'publicado' ? '✓ publicado' : 'planejado'}
                </span>
              </div>
              <h3 className="c-modal-titulo">{selected.titulo}</h3>
            </div>

            {BLOCOS.map(({ key, label, color }) => (
              selected[key] && selected[key].length > 0 && (
                <div key={key} className="c-script-bloco">
                  <div className={`c-script-bloco-label ${color}`}>{label}</div>
                  {selected[key].map((item, i) => (
                    <div key={i} className="c-script-topico">
                      <span className="c-script-num">{String(i + 1).padStart(2, '0')}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )
            ))}

            <div className="c-row" style={{ marginTop: 20 }}>
              {selected.status !== 'publicado' && (
                <button
                  className="c-btn"
                  onClick={() => marcarPublicado(selected.data, true)}
                >
                  ✓ Marcar como publicado
                </button>
              )}
              <button className="c-btn-ghost" onClick={() => setSelected(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
