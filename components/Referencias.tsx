'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Canal, ChannelIds, YtCache, YtVideo, Section } from '@/lib/types'
import { getItem, setItem } from '@/lib/storage'
import { useToast } from '@/lib/toast-context'

interface Props {
  onNav: (section: Section) => void
}

const REFS = [
  {
    key: 'danieldalen',
    cacheName: 'Daniel Dalen',
    name: 'Daniel Dalen',
    handle: '@danieldalen · 190K+ inscritos · Internacional',
    tag: { text: '🔥 referência principal', cls: 'yellow' },
    insights: [
      'Formato "POV:" nos títulos — cria série reconhecível, reduz esforço criativo',
      'Thumbnail consistente: texto branco em negrito + ele na frente. Identidade visual forte',
      '1 vídeo/semana todo domingo — criou rotina na audiência, esperam o episódio',
      'Vlogs contando histórias reais de decisões de founder: equipe, produto, liderança',
      'Aspiracional sem ostentação — foco nas lições, não nos carros e viagens',
    ],
  },
  {
    key: 'daniellima',
    cacheName: 'Daniel Lima',
    name: 'Daniel Lima',
    handle: '@daniellimae · AbacatePay · Nacional (BR)',
    tag: { text: 'build in public', cls: 'green' },
    insights: [
      'Posicionamento direto: "Construa em Público e documente sua jornada"',
      'Compartilha pivots, vitórias pequenas, experimentos — não só os sucessos',
      'Update de produto vira episódio — o negócio alimenta o canal continuamente',
      'Comunidade de founders como audiência principal — nicho específico, alta qualidade',
    ],
  },
  {
    key: 'marclou',
    cacheName: 'Marc Lou',
    name: 'Marc Lou',
    handle: '@marclou · Internacional · SaaS indie hacker',
    tag: { text: 'sugerido', cls: 'orange' },
    insights: [
      'Numera os episódios por dias: "Day 512" — cria narrativa de jornada contínua',
      'Produto + canal integrados — o conteúdo é parte da estratégia de distribuição',
      'Produção simples, valor no conteúdo — câmera básica, zero artificialismo',
    ],
  },
]

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export default function Referencias({ onNav }: Props) {
  const { showToast } = useToast()
  const [hasApiKey, setHasApiKey] = useState(false)
  const [canais, setCanais] = useState<Canal[]>([])
  const [ytCache, setYtCache] = useState<YtCache>({})
  const [ncNome, setNcNome] = useState('')
  const [ncHandle, setNcHandle] = useState('')
  const [ncNotas, setNcNotas] = useState('')
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    setHasApiKey(!!getItem('yt_api_key', ''))
    setCanais(getItem('canaisExtra', []))
    setYtCache(getItem('ytCache', {}))
  }, [])

  function addCanal() {
    if (!ncNome.trim()) return
    const next = [...canais, { nome: ncNome.trim(), handle: ncHandle.trim(), notas: ncNotas.trim() }]
    setCanais(next)
    setItem('canaisExtra', next)
    setNcNome(''); setNcHandle(''); setNcNotas('')
    showToast('✓ Canal adicionado')
  }

  function removerCanal(i: number) {
    const next = canais.filter((_, idx) => idx !== i)
    setCanais(next)
    setItem('canaisExtra', next)
  }

  const fetchAllChannels = useCallback(async () => {
    const key = getItem('yt_api_key', '')
    if (!key) { showToast('Configure a YouTube API Key primeiro.'); onNav('config'); return }
    const ids: ChannelIds = getItem('channelIds', { danieldalen: '', daniellima: '', marclou: '', extra1: '' })
    if (!Object.values(ids).some(Boolean)) { showToast('Configure pelo menos um Channel ID.'); onNav('config'); return }

    setFetching(true)
    const channels = [
      { name: 'Daniel Dalen', id: ids.danieldalen },
      { name: 'Daniel Lima',  id: ids.daniellima  },
      { name: 'Marc Lou',     id: ids.marclou      },
      { name: 'Extra 1',      id: ids.extra1       },
    ].filter(c => c.id)

    const cache: YtCache = {}
    for (const ch of channels) {
      try {
        type ChanData = { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] }
        const chanRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${ch.id}&key=${key}`
        )
        const chanData: ChanData = await chanRes.json()
        const uploadPid = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
        if (!uploadPid) continue

        type PlItem = { snippet: { resourceId: { videoId: string }; title: string; thumbnails?: { medium?: { url: string } }; publishedAt: string } }
        const plRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=15&playlistId=${uploadPid}&key=${key}`
        )
        const plData: { items?: PlItem[] } = await plRes.json()
        const vids = plData.items || []
        const vidsIds = vids.map(v => v.snippet.resourceId.videoId).join(',')

        type StatItem = { id: string; statistics: { viewCount: string; likeCount: string } }
        const statsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${vidsIds}&key=${key}`
        )
        const statsData: { items?: StatItem[] } = await statsRes.json()
        const statsMap: Record<string, { viewCount: string; likeCount: string }> = {}
        statsData.items?.forEach(s => { statsMap[s.id] = s.statistics })

        cache[ch.name] = vids
          .map(v => {
            const vid = v.snippet.resourceId.videoId
            const stats = statsMap[vid] || {}
            return {
              id: vid,
              title: v.snippet.title,
              thumb: v.snippet.thumbnails?.medium?.url || '',
              published: v.snippet.publishedAt,
              views: parseInt(stats.viewCount || '0'),
              likes: parseInt(stats.likeCount || '0'),
            } as YtVideo
          })
          .sort((a, b) => b.views - a.views)
      } catch (e) {
        console.error('Erro canal', ch.name, e)
      }
    }
    setYtCache(cache)
    setItem('ytCache', cache)
    showToast('✓ Dados dos canais atualizados!')
    setFetching(false)
  }, [showToast, onNav])

  return (
    <div>
      <h2>Referências</h2>
      <p className="c-subtitle">Canais monitorados · vídeos recentes + mais engajados</p>

      {!hasApiKey && (
        <div className="c-api-banner">
          <div className="c-api-banner-text">
            <strong>YouTube API não configurada.</strong> Configure sua chave em{' '}
            <strong>Config</strong> para carregar os vídeos reais de cada canal.
          </div>
          <button
            className="c-btn-ghost"
            onClick={() => onNav('config')}
            style={{ flexShrink: 0, fontSize: 12, padding: '7px 12px' }}
          >
            Configurar
          </button>
        </div>
      )}

      {hasApiKey && (
        <div className="c-row" style={{ marginBottom: 20 }}>
          <button className="c-btn-ghost" onClick={fetchAllChannels} disabled={fetching}>
            {fetching ? 'Buscando...' : '↻ Buscar vídeos agora'}
          </button>
        </div>
      )}

      {REFS.map(ref => (
        <div key={ref.key} className="c-card">
          <div className="c-card-header">
            <div>
              <div className="c-ref-name">{ref.name}</div>
              <div className="c-ref-handle">{ref.handle}</div>
            </div>
            <span className={`c-tag ${ref.tag.cls}`}>{ref.tag.text}</span>
          </div>
          <ul className="c-insight-list">
            {ref.insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
          <div className="c-yt-grid">
            {ytCache[ref.cacheName]?.length ? (
              ytCache[ref.cacheName].slice(0, 6).map(v => (
                <div
                  key={v.id}
                  className="c-yt-card"
                  onClick={() => window.open(`https://youtube.com/watch?v=${v.id}`, '_blank')}
                >
                  <div className="c-yt-thumb">
                    {v.thumb ? (
                      <img src={v.thumb} alt={v.title} loading="lazy" />
                    ) : (
                      <div className="no-thumb">▶</div>
                    )}
                  </div>
                  <div className="c-yt-info">
                    <div className="c-yt-title">{v.title}</div>
                    <div className="c-yt-views">{fmtNum(v.views)} views</div>
                    <div className="c-yt-meta">
                      {fmtNum(v.likes)} likes · {new Date(v.published).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  gridColumn: '1/-1',
                  color: 'var(--c-muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  padding: '8px 0',
                }}
              >
                Configure a YouTube API para ver os vídeos →{' '}
                <button
                  className="c-btn-ghost"
                  onClick={() => onNav('config')}
                  style={{ fontSize: 11, padding: '5px 10px', marginLeft: 8 }}
                >
                  Configurar
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      <hr className="c-hr" />
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Adicionar canal</h2>
      <label className="c-label">Nome</label>
      <input
        className="c-input"
        type="text"
        value={ncNome}
        onChange={e => setNcNome(e.target.value)}
        placeholder="Ex: Greg Isenberg"
      />
      <label className="c-label">Handle (@) ou link do canal</label>
      <input
        className="c-input"
        type="text"
        value={ncHandle}
        onChange={e => setNcHandle(e.target.value)}
        placeholder="Ex: @gregisenberg"
      />
      <label className="c-label">Por que é referência</label>
      <textarea
        className="c-textarea short"
        value={ncNotas}
        onChange={e => setNcNotas(e.target.value)}
        placeholder="Ex: documenta crescimento com produto digital..."
      />
      <div className="c-row">
        <button className="c-btn" onClick={addCanal}>+ Adicionar</button>
      </div>

      {canais.map((ch, i) => (
        <div key={i} className="c-card" style={{ marginTop: 10 }}>
          <div className="c-card-header">
            <div>
              <div className="c-ref-name">{ch.nome}</div>
              <div className="c-ref-handle">{ch.handle}</div>
            </div>
            <button
              className="c-btn-ghost"
              style={{ fontSize: 11, padding: '5px 10px' }}
              onClick={() => removerCanal(i)}
            >
              remover
            </button>
          </div>
          {ch.notas && <div style={{ fontSize: 13, color: '#aaa' }}>{ch.notas}</div>}
        </div>
      ))}
    </div>
  )
}
