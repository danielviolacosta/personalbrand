'use client'

import { useState } from 'react'
import type { Pauta, Section } from '@/lib/types'
import { weekLabel } from '@/lib/utils'

interface Props {
  pautas: Pauta[]
  onSave: (pautas: Pauta[]) => void
  onNav: (section: Section) => void
}

export default function Calendario({ pautas, onSave, onNav }: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  function marcarPublicado(data: string) {
    if (!confirm('Marcar este vídeo como publicado?')) return
    onSave(pautas.map(p => p.data === data ? { ...p, status: 'publicado' as const } : p))
  }

  function deletarPauta(data: string) {
    if (!confirm('Excluir esta pauta do calendário?')) return
    onSave(pautas.filter(p => p.data !== data))
  }

  function onDragStart(e: React.DragEvent, data: string) {
    e.dataTransfer.setData('text/plain', data)
    e.dataTransfer.effectAllowed = 'move'
    setDragging(data)
  }

  function onDrop(e: React.DragEvent, targetLabel: string) {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    if (data) {
      onSave(pautas.map(p => p.data === data ? { ...p, semana: targetLabel } : p))
    }
    setDragging(null)
    setDragOver(null)
  }

  const weeks = Array.from({ length: 8 }, (_, i) => i - 2).map(offset => ({
    offset,
    label: weekLabel(offset),
    pautas: pautas.filter(p => p.semana === weekLabel(offset)),
  }))

  const totalPautas = pautas.length
  const publicados = pautas.filter(p => p.status === 'publicado').length

  return (
    <div>
      <h2>Calendário Editorial</h2>
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

            {semPautas.length === 0 && dragOver !== label ? (
              <div className="c-cal-empty-text">Sem pauta para esta semana</div>
            ) : (
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
                    <div className="c-cal-pauta-titulo">{p.titulo}</div>
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
    </div>
  )
}
