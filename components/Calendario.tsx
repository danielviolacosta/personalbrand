'use client'

import type { Pauta, Section } from '@/lib/types'
import { weekLabel } from '@/lib/utils'

interface Props {
  pautas: Pauta[]
  onSave: (pautas: Pauta[]) => void
  onNav: (section: Section) => void
}

export default function Calendario({ pautas, onSave, onNav }: Props) {
  function marcarPublicado(semana: string) {
    if (!confirm('Marcar como publicado?')) return
    onSave(pautas.map(p => p.semana === semana ? { ...p, status: 'publicado' as const } : p))
  }

  return (
    <div>
      <h2>Calendário Editorial</h2>
      <p className="c-subtitle">1 vídeo por semana</p>

      <div className="c-calendar-grid">
        {Array.from({ length: 8 }, (_, i) => i - 2).map(offset => {
          const label = weekLabel(offset)
          const pauta = pautas.find(p => p.semana === label)

          if (pauta) {
            const cls = pauta.status === 'publicado' ? 'published' : 'planned'
            return (
              <div
                key={offset}
                className={`c-cal-week ${cls}`}
                onClick={pauta.status === 'planejado' ? () => marcarPublicado(label) : undefined}
                style={{ cursor: pauta.status === 'planejado' ? 'pointer' : 'default' }}
              >
                <div className="c-cal-week-label">{label}</div>
                <div className="c-cal-week-title">{pauta.titulo}</div>
                <div className="c-cal-week-status">
                  {pauta.status === 'publicado' ? '✓ publicado' : '○ planejado'}
                </div>
              </div>
            )
          }

          return (
            <div key={offset} className="c-cal-week empty" onClick={() => onNav('gerador')}>
              <div className="c-cal-week-label">{label}</div>
              <div className="c-cal-week-title" style={{ color: 'var(--c-muted2)' }}>
                Sem pauta
              </div>
              <div className="c-cal-week-status">+ gerar</div>
            </div>
          )
        })}
      </div>

      <div className="c-row" style={{ marginTop: 20 }}>
        <button className="c-btn-ghost" onClick={() => onNav('gerador')}>
          + Gerar pauta para nova semana
        </button>
      </div>
    </div>
  )
}
