'use client'

import type { Pauta, Section } from '@/lib/types'
import { weekLabel } from '@/lib/utils'

interface Props {
  pautas: Pauta[]
  onSave: (pautas: Pauta[]) => void
  onNav: (section: Section) => void
}

export default function Calendario({ pautas, onSave, onNav }: Props) {
  function marcarPublicado(data: string) {
    if (!confirm('Marcar este vídeo como publicado?')) return
    onSave(pautas.map(p => p.data === data ? { ...p, status: 'publicado' as const } : p))
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
      </div>

      <div className="c-calendar-list">
        {weeks.map(({ offset, label, pautas: semPautas }) => (
          <div key={offset} className={`c-cal-row${semPautas.length === 0 ? ' empty' : ''}`}>
            <div className="c-cal-row-header">
              <span className="c-cal-row-label">{label}</span>
              {semPautas.length > 1 && (
                <span className="c-cal-row-count">{semPautas.length} vídeos</span>
              )}
              {semPautas.length === 0 && (
                <button className="c-cal-add-btn" onClick={() => onNav('gerador')}>+ gerar</button>
              )}
            </div>

            {semPautas.length === 0 ? (
              <div className="c-cal-empty-text">Sem pauta para esta semana</div>
            ) : (
              <div className="c-cal-pauta-list">
                {semPautas.map(p => (
                  <div key={p.data} className={`c-cal-pauta-item ${p.status}`}>
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
