'use client'

import type { Pauta, Section } from '@/lib/types'
import { weekLabel } from '@/lib/utils'

interface Props {
  pautas: Pauta[]
  onNav: (section: Section) => void
}

const META_MENSAL = 2

function semanaMonth(semana: string): number {
  const m = semana.match(/\d{2}\/(\d{2})/)
  return m ? parseInt(m[1]) : 0
}

export default function Dashboard({ pautas, onNav }: Props) {
  const published = pautas.filter(p => p.status === 'publicado').length
  const next      = pautas.find(p => p.status !== 'publicado')

  const thisMonth        = new Date().getMonth() + 1
  const thisMonthLabel   = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const nextMonthLabel   = new Date(new Date().setMonth(new Date().getMonth() + 1))
                             .toLocaleDateString('pt-BR', { month: 'long' })
  const nextMonthN       = thisMonth === 12 ? 1 : thisMonth + 1

  const thisMonthPautas  = pautas.filter(p => semanaMonth(p.semana) === thisMonth)
  const thisPublished    = thisMonthPautas.filter(p => p.status === 'publicado').length
  const thisTotal        = thisMonthPautas.length
  const nextTotal        = pautas.filter(p => semanaMonth(p.semana) === nextMonthN).length
  const goalPct          = Math.min(100, Math.round((thisPublished / META_MENSAL) * 100))

  return (
    <div>
      <h2>Dashboard</h2>
      <p className="c-subtitle">
        Semana atual · <span>{weekLabel(0)}</span>
      </p>

      {/* Metrics */}
      <div className="c-metrics">
        <div className="c-metric">
          <div className="c-metric-value">{published}</div>
          <div className="c-metric-label">publicados</div>
        </div>
        <div className="c-metric">
          <div className="c-metric-value">{pautas.length}</div>
          <div className="c-metric-label">pautas geradas</div>
        </div>
        <div className="c-metric">
          <div className="c-metric-value">3</div>
          <div className="c-metric-label">refs monitoradas</div>
        </div>
        <div className="c-metric">
          <div className="c-metric-value">15–20</div>
          <div className="c-metric-label">min meta/vídeo</div>
        </div>
      </div>

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
          {goalPct >= 100 && (
            <span className="c-li-goal-badge" style={{ marginLeft: 8, marginTop: 0 }}>
              🏆 Meta batida!
            </span>
          )}
        </div>
        {thisTotal === 0 && (
          <div className="c-li-goal-hint">Nenhuma pauta planejada para {thisMonthLabel} ainda</div>
        )}
        {thisTotal > 0 && thisTotal > thisPublished && (
          <div className="c-li-goal-hint">
            {thisTotal - thisPublished} pauta{thisTotal - thisPublished > 1 ? 's' : ''} aguardando publicação
          </div>
        )}
        {nextTotal > 0 && (
          <div className="c-li-goal-hint" style={{ marginTop: 4 }}>
            {nextMonthLabel}: {nextTotal} pauta{nextTotal > 1 ? 's' : ''} planejada{nextTotal > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Script structure */}
      <div className="c-blocos">
        <div className="c-bloco">
          <div className="c-bloco-num e1">01</div>
          <div className="c-bloco-title">Entretenimento / Hook</div>
          <div className="c-bloco-desc">
            Abre com o momento mais tenso ou curioso da história. O espectador decide ficar nos
            primeiros 30 seg.
          </div>
          <div className="c-bloco-time">~4–5 min</div>
        </div>
        <div className="c-bloco">
          <div className="c-bloco-num e2">02</div>
          <div className="c-bloco-title">História + Ensinamento</div>
          <div className="c-bloco-desc">
            Conta a experiência em narrativa. No fim do bloco, extrai a lição concreta de
            empreendedorismo.
          </div>
          <div className="c-bloco-time">~6–8 min</div>
        </div>
        <div className="c-bloco">
          <div className="c-bloco-num e3">03</div>
          <div className="c-bloco-title">Registro de Rotina</div>
          <div className="c-bloco-desc">
            Bastidores reais da semana. Mostra o processo, não só o resultado. Autenticidade gera
            conexão.
          </div>
          <div className="c-bloco-time">~5–7 min</div>
        </div>
      </div>

      {/* Next video */}
      <div className="c-card">
        <div className="c-card-header">
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Próximo vídeo</div>
            <div style={{ color: 'var(--c-muted)', fontSize: 13 }}>
              {next ? next.titulo : 'Nenhuma pauta gerada ainda'}
            </div>
          </div>
          <span className={`c-tag${next ? ' yellow' : ''}`}>
            {next ? next.status : 'pendente'}
          </span>
        </div>
        <button className="c-btn" onClick={() => onNav('gerador')}>
          + Gerar pauta desta semana
        </button>
      </div>
    </div>
  )
}
