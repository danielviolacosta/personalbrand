export default function Tendencias() {
  const titleFormulas = [
    { rank: '01', title: 'POV: você está [situação real de founder]', meta: 'Daniel Dalen · imersivo · alta identificação', arrow: '↑' },
    { rank: '02', title: '[X dias] construindo [produto] — o que aprendi', meta: 'Marc Lou · narrativa contínua · cria série', arrow: '↑' },
    { rank: '03', title: 'Errei feio em [área] — e foi o melhor que aconteceu', meta: 'Vulnerabilidade · alta retenção · comentários', arrow: '↑' },
    { rank: '04', title: 'A verdade sobre [tema difícil de empreender]', meta: 'Contra-narrativa · funciona com honestidade real', arrow: '→' },
    { rank: '05', title: 'Semana [N]: [momento específico do negócio]', meta: 'Formato de série · cria hábito de consumo', arrow: '↑' },
  ]

  const thumbTips = [
    'Texto grande branco/amarelo · máximo 5 palavras · legível em miniatura',
    'Close no rosto com expressão genuína — não forçada',
    'Contraste alto entre fundo e texto',
    'Consistência visual entre episódios — identidade de série',
    'Uma cor de destaque única e repetida em todos os vídeos',
  ]

  const formats = [
    'Building in public com números reais (receita, usuários, churn)',
    'Vlog processo "câmera na mão" — baixa produção, alto valor',
    'Retrospectivas semanais com métricas honestas',
    'Decisões difíceis gravadas em tempo real, pouco editadas',
  ]

  const applied = [
    'Série: "POV: construindo um SaaS do zero — semana X" ou "Semana X: [momento real]"',
    'Thumbnail: fundo escuro + texto branco "SEMANA X" + expressão genuína sua',
    'Pin do ep. 1 e uma playlist de série na página do canal',
    'Primeiros 30 seg: comece no meio da ação mais tensa — explique o contexto depois',
  ]

  return (
    <div>
      <h2>Tendências</h2>
      <p className="c-subtitle">
        Padrões de título, formato e thumbnail em alta no nicho de jornada empreendedora
      </p>

      <div className="c-grid-2">
        <div className="c-card">
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>
            📌 Fórmulas de título que performam
          </div>
          {titleFormulas.map(t => (
            <div key={t.rank} className="c-trend-item">
              <div className="c-trend-rank">{t.rank}</div>
              <div>
                <div className="c-trend-title">{t.title}</div>
                <div className="c-trend-meta">{t.meta}</div>
              </div>
              <div className="c-trend-arrow">{t.arrow}</div>
            </div>
          ))}
        </div>

        <div className="c-card">
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>
            🎨 Thumbnail — o que converte
          </div>
          <ul className="c-insight-list">
            {thumbTips.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <div style={{ marginTop: 18, fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
            📈 Formatos em alta (2025)
          </div>
          <ul className="c-insight-list">
            {formats.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      <div className="c-card" style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>💡 Aplicado ao seu canal</div>
        <ul className="c-insight-list">
          {applied.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    </div>
  )
}
