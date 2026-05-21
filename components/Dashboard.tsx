'use client'

import type { Pauta, Section } from '@/lib/types'
import { weekLabel } from '@/lib/utils'

interface Props {
  pautas: Pauta[]
  onNav: (section: Section) => void
}

export default function Dashboard({ pautas, onNav }: Props) {
  const published = pautas.filter(p => p.status === 'publicado').length
  const next = pautas.find(p => p.status !== 'publicado')

  return (
    <div>
      <h2>Dashboard</h2>
      <p className="c-subtitle">
        Semana atual · <span>{weekLabel(0)}</span>
      </p>

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
