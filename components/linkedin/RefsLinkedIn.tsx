'use client'

import { useState, useEffect } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useToast } from '@/lib/toast-context'
import type { RefPostLinkedIn, PostTipo } from '@/lib/types'

const TIPOS: { id: PostTipo; label: string }[] = [
  { id: 'noticia',      label: 'Notícia/Tendência' },
  { id: 'produto',      label: 'Produto/Feature' },
  { id: 'prova_social', label: 'Prova Social' },
  { id: 'dica',         label: 'Dica Prática' },
  { id: 'personal',     label: 'Personal Brand' },
  { id: 'video_demo',   label: 'Vídeo/Demo' },
]

const TIPO_COLOR: Record<PostTipo, string> = {
  noticia:     'li-t-noticia',
  produto:     'li-t-produto',
  prova_social:'li-t-prova',
  dica:        'li-t-dica',
  personal:    'li-t-personal',
  video_demo:  'li-t-video',
}

const EMPTY_FORM = { autor: '', conteudo: '', tipo: 'dica' as PostTipo, engajamento: '', nota: '' }

export default function RefsLinkedIn() {
  const { showToast } = useToast()
  const [refs, setRefs] = useState<RefPostLinkedIn[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    setRefs(getItem<RefPostLinkedIn[]>('liRefs', []))
  }, [])

  function save(next: RefPostLinkedIn[]) {
    setRefs(next)
    setItem('liRefs', next)
  }

  function adicionar() {
    if (!form.conteudo.trim()) { showToast('Cole o texto do post primeiro.'); return }
    const ref: RefPostLinkedIn = { ...form, id: Date.now().toString() }
    save([ref, ...refs])
    setForm(EMPTY_FORM)
    setUrlInput('')
    setAdding(false)
    showToast('✓ Referência adicionada!')
  }

  function deletar(id: string) {
    if (!confirm('Remover esta referência?')) return
    save(refs.filter(r => r.id !== id))
  }

  // ── URL fetch ─────────────────────────────────────────────────────────────
  async function buscarUrl() {
    const url = urlInput.trim()
    if (!url) return
    setFetchingUrl(true)
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (!data.text || data.text.length < 30) throw new Error('Não foi possível extrair texto desta página')
      setForm(f => ({ ...f, conteudo: data.text }))
      showToast('✓ Texto extraído! Clique em "Analisar com IA" para preencher automaticamente.')
    } catch (err) {
      showToast('Erro: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setFetchingUrl(false)
    }
  }

  // ── AI analysis ───────────────────────────────────────────────────────────
  async function analisarComIA() {
    if (!form.conteudo.trim()) { showToast('Cole o texto do post primeiro.'); return }
    setAnalyzing(true)
    try {
      const prompt = `Você é especialista em LinkedIn B2B. Analise o post abaixo e responda SOMENTE com JSON puro (sem texto antes ou depois):

{"tipo":"dica","autor":"nome do autor se identificável ou string vazia","nota":"1-2 linhas diretas explicando por que este post funciona (hook, estrutura, dado, emoção, CTA etc.)"}

Tipos possíveis: noticia, produto, prova_social, dica, personal, video_demo

Post:
${form.conteudo.slice(0, 2000)}`

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = (data.content ?? []).map((i: { text?: string }) => i.text ?? '').join('').trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida')
      const result = JSON.parse(match[0]) as { tipo?: PostTipo; autor?: string; nota?: string }
      setForm(f => ({
        ...f,
        tipo:  TIPOS.some(t => t.id === result.tipo) ? (result.tipo as PostTipo) : f.tipo,
        autor: result.autor?.trim() ? result.autor.trim() : f.autor,
        nota:  result.nota?.trim()  ? result.nota.trim()  : f.nota,
      }))
      showToast('✓ Análise pronta — revise os campos e salve!')
    } catch (err) {
      showToast('Erro ao analisar: ' + (err instanceof Error ? err.message : 'Erro'))
    } finally {
      setAnalyzing(false)
    }
  }

  const canAnalyze = form.conteudo.trim().length > 40

  return (
    <div>
      <h2>Referências LinkedIn</h2>
      <p className="c-subtitle">
        Posts que funcionaram — usados como base de estilo na geração de conteúdo
      </p>

      <div className="c-row" style={{ marginBottom: 16 }}>
        <button className="c-btn" onClick={() => { setAdding(v => !v); setUrlInput('') }}>
          {adding ? '✕ Cancelar' : '+ Adicionar referência'}
        </button>
      </div>

      {adding && (
        <div className="c-card" style={{ marginBottom: 20 }}>

          {/* ── URL fetch ── */}
          <label className="c-label" style={{ marginTop: 0 }}>Buscar por URL</label>
          <div className="c-li-ref-url-row">
            <input
              className="c-input"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !fetchingUrl && buscarUrl()}
              placeholder="https://linkedin.com/posts/... ou qualquer artigo público"
            />
            <button
              className="c-btn-ghost"
              onClick={buscarUrl}
              disabled={fetchingUrl || !urlInput.trim()}
            >
              {fetchingUrl ? '⏳' : '🔗 Buscar'}
            </button>
          </div>
          <div className="c-li-ref-url-hint">
            Funciona para artigos, blogs e notícias. Posts LinkedIn: cole o texto manualmente se der erro.
          </div>

          <div className="c-li-ref-divider"><span>ou cole o texto diretamente</span></div>

          {/* ── Conteúdo ── */}
          <div>
            <label className="c-label">Texto completo do post</label>
            <textarea
              className="c-textarea tall"
              value={form.conteudo}
              onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
              placeholder="Cole o post aqui…"
            />
          </div>

          {/* ── Analisar com IA ── */}
          {canAnalyze && (
            <div style={{ marginTop: 10 }}>
              <button
                className="c-btn-refine c-btn-analyze"
                onClick={analisarComIA}
                disabled={analyzing}
              >
                {analyzing
                  ? '⏳ Analisando…'
                  : '✦ Analisar com IA — preenche tipo e "por que funcionou" automaticamente'}
              </button>
            </div>
          )}

          {/* ── Autor ── */}
          <div>
            <label className="c-label">Autor / perfil</label>
            <input
              className="c-input"
              value={form.autor}
              onChange={e => setForm(f => ({ ...f, autor: e.target.value }))}
              placeholder="Ex: @pedroserrano, Thiago Nigro…"
            />
          </div>

          {/* ── Tipo ── */}
          <div>
            <label className="c-label">Tipo de post</label>
            <div className="c-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {TIPOS.map(t => (
                <button
                  key={t.id}
                  className={`c-li-tipo-btn${form.tipo === t.id ? ' active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, tipo: t.id }))}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Engajamento ── */}
          <div>
            <label className="c-label">Engajamento (opcional)</label>
            <input
              className="c-input"
              value={form.engajamento}
              onChange={e => setForm(f => ({ ...f, engajamento: e.target.value }))}
              placeholder="Ex: 2.3k reações, 180 comentários"
            />
          </div>

          {/* ── Por que funcionou ── */}
          <div>
            <label className="c-label">Por que funcionou</label>
            <textarea
              className="c-textarea short"
              value={form.nota}
              onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
              placeholder="Ex: hook direto com número, contraintuitivo, prova social com dado específico…"
            />
          </div>

          <div className="c-row" style={{ marginTop: 16 }}>
            <button className="c-btn" onClick={adicionar}>Salvar referência</button>
            <button className="c-btn-ghost" onClick={() => { setForm(EMPTY_FORM); setUrlInput('') }}>
              Limpar
            </button>
          </div>
        </div>
      )}

      {refs.length === 0 && !adding && (
        <div className="c-card" style={{ textAlign: 'center', padding: 40, color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📌</div>
          <div style={{ fontSize: 14 }}>Nenhuma referência ainda</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Adicione posts do LinkedIn que você achou bons</div>
        </div>
      )}

      <div className="c-li-ref-list">
        {refs.map(r => (
          <div key={r.id} className="c-li-ref-card">
            <div className="c-li-ref-header">
              <span className={`c-li-tipo-tag ${TIPO_COLOR[r.tipo]}`}>
                {TIPOS.find(t => t.id === r.tipo)?.label}
              </span>
              {r.autor && <span className="c-li-ref-autor">@{r.autor.replace('@', '')}</span>}
              {r.engajamento && <span className="c-li-ref-eng">{r.engajamento}</span>}
              <button className="c-cal-delete-btn" onClick={() => deletar(r.id)} title="Remover">×</button>
            </div>
            <div className="c-li-ref-conteudo">{r.conteudo}</div>
            {r.nota && <div className="c-li-ref-nota">→ {r.nota}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
