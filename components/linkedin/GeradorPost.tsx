'use client'

import { useState, useEffect } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useToast } from '@/lib/toast-context'
import { weekLabel } from '@/lib/utils'
import type { PostTipo, LinkedInPost, RefPostLinkedIn, SaasContext } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface GeneratedPost {
  tipo: PostTipo
  conteudo: string
  hashtags: string[]
  imagem_brief: string
}

const DRAFT_KEY = 'liGeradorBatch'

const TIPO_LABEL: Record<PostTipo, string> = {
  noticia:     'Notícia/Tendência',
  produto:     'Produto/Feature',
  prova_social:'Prova Social',
  dica:        'Dica Prática',
  personal:    'Personal Brand',
  video_demo:  'Vídeo/Demo',
}

const TIPO_COLOR: Record<PostTipo, string> = {
  noticia:     'li-t-noticia',
  produto:     'li-t-produto',
  prova_social:'li-t-prova',
  dica:        'li-t-dica',
  personal:    'li-t-personal',
  video_demo:  'li-t-video',
}

const ALL_TIPOS: PostTipo[] = ['dica', 'produto', 'personal', 'noticia', 'prova_social', 'video_demo']

const TIPO_GUIDE: Record<PostTipo, string> = {
  noticia:     'Conecte uma notícia/tendência do mercado ao problema que o produto resolve.',
  produto:     'Mostre como uma feature resolve um problema real do ICP com exemplo concreto.',
  prova_social:'Resultado de cliente com dados específicos — antes e depois.',
  dica:        'Dica prática acionável que o ICP pode aplicar hoje. Valor primeiro.',
  personal:    'Jornada como founder — erro, decisão difícil, aprendizado. Gera identificação.',
  video_demo:  'Post de acompanhamento para vídeo curto 60-90s. Hook + por que vale assistir.',
}

// Pick 3 varied tipos, prioritizing those not used recently
function pickTipos(recentPosts: LinkedInPost[]): [PostTipo, PostTipo, PostTipo] {
  const recent = recentPosts.slice(0, 9).map(p => p.tipo)
  const scored = ALL_TIPOS.map(t => ({ tipo: t, lastIdx: recent.lastIndexOf(t) }))
  scored.sort((a, b) => a.lastIdx - b.lastIdx) // -1 (never used) comes first
  return [scored[0].tipo, scored[1].tipo, scored[2].tipo]
}

// Build messages array with optional vision context from ref images
function buildMessages(tipos: [PostTipo, PostTipo, PostTipo]) {
  const saas = getItem<SaasContext>('linkedinConfig', { produto: '', descricao: '', icp: '', diferenciais: '', casos: '', extras: '' })
  const refs = getItem<RefPostLinkedIn[]>('liRefs', [])

  const saasBlock = [
    saas.produto     && `PRODUTO: ${saas.produto}`,
    saas.descricao   && `O QUE FAZ: ${saas.descricao}`,
    saas.icp         && `ICP: ${saas.icp}`,
    saas.diferenciais && `DIFERENCIAIS: ${saas.diferenciais}`,
    saas.casos       && `PROVAS SOCIAIS: ${saas.casos}`,
    saas.extras      && `CONTEXTO EXTRA: ${saas.extras}`,
  ].filter(Boolean).join('\n') || 'SaaS de relacionamento com clientes via email e WhatsApp para equipes comerciais.'

  const refBlock = refs.length > 0
    ? '\n\nPOSTS DE REFERÊNCIA — aprenda o estilo e abordagem (não copie):\n' +
      refs.slice(0, 5).map(r =>
        `[${TIPO_LABEL[r.tipo]}] ${r.conteudo.slice(0, 400)}${r.nota ? `\n→ ${r.nota}` : ''}`
      ).join('\n---\n')
    : ''

  const prompt = `Você é estrategista de conteúdo LinkedIn B2B. Gere exatamente 3 posts completos para publicar nesta semana.

CONTEXTO DO PRODUTO:
${saasBlock}${refBlock}

POSTS A GERAR (nesta ordem exata):
1. Tipo: ${tipos[0]} — ${TIPO_GUIDE[tipos[0]]}
2. Tipo: ${tipos[1]} — ${TIPO_GUIDE[tipos[1]]}
3. Tipo: ${tipos[2]} — ${TIPO_GUIDE[tipos[2]]}

REGRAS PARA CADA POST:
• Hook nas primeiras 2 linhas (sem ponto final, força "ver mais")
• Linha em branco entre cada parágrafo
• Linguagem direta, humana, sem corporativês
• NUNCA usar travessão (—) em nenhuma parte do texto
• NUNCA sugerir que "não precisa de ferramenta" ou que resultado vem só de esforço/atitude — quando o tema envolver processo, escala ou consistência, reforce sutilmente que a tecnologia certa é um diferencial real (sem forçar, só não ir contra)
• Máximo 1200 caracteres no post (sem hashtags)

CTA OBRIGATÓRIO (últimas 2 linhas, antes das hashtags):
• Linha 1: pergunta genuína ligada ao conteúdo do post (gera comentários orgânicos)
• Linha 2: oferta de demo suave e natural — exemplos de tom:
  "Comenta 'DEMO' aqui que te mando um link pra conhecer o BeeMessage em 15 minutos."
  "Quer ver isso funcionando na prática? Comenta aqui que te mostro o BeeMessage."
  "Se quiser ver como o BeeMessage resolve isso, é só comentar que entro em contato."
  Varie o texto a cada post. NUNCA dizer "nosso time vai te ligar" ou tom de cold call.

IMAGEM BRIEF: Para cada post crie uma instrução de imagem para Canva/designer.
Formato OBRIGATÓRIO: 1080×1350 px (proporção 4:5 portrait — padrão Instagram feed).
Inclua: fundo, cor/estilo, texto principal em destaque, elementos visuais, mood.
Exemplo: "1080×1350 px. Fundo grafite escuro #1c1c1e. Texto central bold: '90% mais barato que um SDR'. Ícone WhatsApp verde à esquerda. Linha horizontal separadora em amarelo. Dark minimalista."

Responda SOMENTE com JSON puro (array com exatamente 3 objetos), sem texto antes ou depois:
[
  {"tipo":"${tipos[0]}","conteudo":"post com \\n para quebras","hashtags":["#tag1","#tag2","#tag3"],"imagem_brief":"instrução detalhada"},
  {"tipo":"${tipos[1]}","conteudo":"...","hashtags":[...],"imagem_brief":"..."},
  {"tipo":"${tipos[2]}","conteudo":"...","hashtags":[...],"imagem_brief":"..."}
]`

  // Include ref images for visual style context (up to 3)
  const imgRefs = refs.filter(r => r.imagem).slice(0, 3)

  if (imgRefs.length > 0) {
    return [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analise ${imgRefs.length === 1 ? 'esta imagem de referência' : `estas ${imgRefs.length} imagens de referência`} para entender o estilo visual preferido (cores, tipografia, layout). Use como inspiração nos image_brief:\n`
        },
        ...imgRefs.map(r => ({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: r.imagem!.replace(/^data:image\/[^;]+;base64,/, ''),
          }
        })),
        { type: 'text', text: prompt }
      ]
    }]
  }

  return [{ role: 'user', content: prompt }]
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GeradorPost({ onSave }: { onSave: (p: LinkedInPost) => void }) {
  const { showToast } = useToast()
  const [batch, setBatch] = useState<GeneratedPost[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenIdx, setRegenIdx] = useState<number | null>(null)
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set())
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [adjustTexts, setAdjustTexts] = useState(['', '', ''])

  useEffect(() => {
    const saved = getItem<GeneratedPost[] | null>(DRAFT_KEY, null)
    if (saved?.length) setBatch(saved)
  }, [])

  useEffect(() => {
    if (batch) setItem(DRAFT_KEY, batch)
  }, [batch])

  async function gerarBatch() {
    setLoading(true)
    setSavedSet(new Set())
    setAdjustTexts(['', '', ''])
    try {
      const recentPosts = getItem<LinkedInPost[]>('liPosts', [])
      const tipos = pickTipos(recentPosts)
      const messages = buildMessages(tipos)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, messages }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = (data.content ?? []).map((i: { text?: string }) => i.text ?? '').join('').trim()
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Resposta inválida da IA')
      const posts = JSON.parse(match[0]) as GeneratedPost[]
      if (!Array.isArray(posts) || posts.length === 0) throw new Error('Nenhum post gerado')
      setBatch(posts.slice(0, 3))
    } catch (err) {
      showToast('Erro ao gerar: ' + (err instanceof Error ? err.message : 'Erro'))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegen(idx: number, instructions?: string) {
    if (!batch) return
    setRegenIdx(idx)
    try {
      const post = batch[idx]
      const saas = getItem<SaasContext>('linkedinConfig', { produto: '', descricao: '', icp: '', diferenciais: '', casos: '', extras: '' })
      const refs = getItem<RefPostLinkedIn[]>('liRefs', [])
      const refSnippet = refs.slice(0, 2).map(r => r.conteudo.slice(0, 300)).join('\n---\n')

      const regras = 'Regras: NUNCA usar travessão (—). Hook nas 2 primeiras linhas. Linguagem direta. Máx 1200 chars. NUNCA sugerir que não precisa de ferramenta ou que resultado vem só de esforço — quando pertinente, reforce sutilmente que a tecnologia certa faz diferença. CTA final: pergunta genuína + oferta de demo suave do BeeMessage (ex: "Comenta DEMO que te mando um link pra conhecer o BeeMessage em 15 minutos"). Nunca usar tom de cold call.'

    const prompt = instructions?.trim()
        ? `Refine este post LinkedIn aplicando os ajustes solicitados.

POST ATUAL:
${post.conteudo}
Hashtags: ${post.hashtags.join(' ')}

AJUSTES: ${instructions}

Produto: ${saas.produto || 'SaaS de CRM'} | ICP: ${saas.icp || 'gestores comerciais'}
Mantenha o tipo "${post.tipo}". ${regras}`
        : `Gere uma nova versão do post LinkedIn tipo "${post.tipo}".
${TIPO_GUIDE[post.tipo]}
Produto: ${saas.produto || 'SaaS de CRM'} | ICP: ${saas.icp || 'gestores comerciais'}
${refSnippet ? `Referência de estilo:\n${refSnippet}` : ''}
${regras}`

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt + `\n\nResponda SOMENTE com JSON: {"tipo":"${post.tipo}","conteudo":"...","hashtags":[...],"imagem_brief":"..."}` }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = (data.content ?? []).map((i: { text?: string }) => i.text ?? '').join('').trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida')
      const next = [...batch]
      next[idx] = JSON.parse(match[0]) as GeneratedPost
      setBatch(next)
      setSavedSet(prev => { const n = new Set(prev); n.delete(idx); return n })
      if (instructions) setAdjustTexts(prev => { const n = [...prev]; n[idx] = ''; return n })
    } catch (err) {
      showToast('Erro: ' + (err instanceof Error ? err.message : 'Erro'))
    } finally {
      setRegenIdx(null)
    }
  }

  function salvar(idx: number) {
    if (!batch?.[idx]) return
    const post = batch[idx]
    onSave({
      id: Date.now().toString(),
      conteudo: post.conteudo + '\n\n' + post.hashtags.join(' '),
      tipo: post.tipo,
      status: 'rascunho',
      semana: weekLabel(0),
      data: new Date().toISOString(),
      imagem_brief: post.imagem_brief || undefined,
    })
    setSavedSet(prev => new Set([...prev, idx]))
    showToast('✓ Post salvo no calendário!')
  }

  function copiar(idx: number) {
    if (!batch?.[idx]) return
    const post = batch[idx]
    navigator.clipboard.writeText(post.conteudo + '\n\n' + post.hashtags.join(' '))
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const refCount   = getItem<RefPostLinkedIn[]>('liRefs', []).length
  const hasContext = !!(getItem<SaasContext>('linkedinConfig', { produto: '', descricao: '', icp: '', diferenciais: '', casos: '', extras: '' }).produto)

  return (
    <div>
      <h2>Gerar Posts LinkedIn</h2>
      <p className="c-subtitle">
        3 posts por semana — a IA escolhe os tipos, usa suas referências e o contexto do SaaS
      </p>

      {/* Context hints */}
      {(!hasContext || refCount === 0) && (
        <div className="c-li-gen-hints">
          {!hasContext && (
            <div className="c-li-gen-hint warn">
              ⚠ Configure o contexto do SaaS na aba <strong>Config</strong> para posts mais precisos
            </div>
          )}
          {refCount === 0 && (
            <div className="c-li-gen-hint info">
              💡 Adicione referências na aba <strong>Referências</strong> para melhorar o estilo dos posts
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      <div className="c-row" style={{ marginBottom: 24, alignItems: 'center' }}>
        <button className="c-btn" onClick={gerarBatch} disabled={loading || regenIdx !== null}>
          {loading
            ? '⏳ Gerando…'
            : batch
              ? '↻ Gerar nova semana'
              : '⚡ Gerar 3 posts desta semana'}
        </button>
        {batch && !loading && (
          <span style={{ fontSize: 11, color: 'var(--c-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
            {savedSet.size}/3 salvos · {refCount} ref{refCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && (
        <div className="c-loading visible" style={{ marginBottom: 24 }}>
          <div className="c-spinner" />
          Criando 3 posts — analisando referências, contexto do produto e estilo visual…
        </div>
      )}

      {/* Post cards */}
      {batch && !loading && (
        <div className="c-li-batch-list">
          {batch.map((post, idx) => (
            <PostCard
              key={`${idx}-${post.conteudo.slice(0, 20)}`}
              idx={idx}
              post={post}
              saved={savedSet.has(idx)}
              copied={copiedIdx === idx}
              regenLoading={regenIdx === idx}
              adjustText={adjustTexts[idx]}
              onAdjustChange={v => setAdjustTexts(prev => { const n = [...prev]; n[idx] = v; return n })}
              onSave={() => salvar(idx)}
              onCopy={() => copiar(idx)}
              onRegen={(inst) => handleRegen(idx, inst)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!batch && !loading && (
        <div className="c-card" style={{ textAlign: 'center', padding: 52, color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text)', marginBottom: 8 }}>
            Pronto para gerar sua semana de conteúdo
          </div>
          <div style={{ fontSize: 13, maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
            A IA cria 3 posts variados com base no seu SaaS, ICP e referências salvas.
            Nenhum input necessário — só clicar.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({
  idx, post, saved, copied, regenLoading, adjustText, onAdjustChange, onSave, onCopy, onRegen,
}: {
  idx: number
  post: GeneratedPost
  saved: boolean
  copied: boolean
  regenLoading: boolean
  adjustText: string
  onAdjustChange: (v: string) => void
  onSave: () => void
  onCopy: () => void
  onRegen: (instructions?: string) => void
}) {
  const [showAdjust, setShowAdjust] = useState(false)

  return (
    <div className={`c-li-batch-card${saved ? ' saved' : ''}${regenLoading ? ' loading' : ''}`}>
      {/* Header row */}
      <div className="c-li-batch-header">
        <div className="c-li-batch-meta">
          <span className="c-li-batch-num">{String(idx + 1).padStart(2, '0')}</span>
          <span className={`c-li-tipo-tag ${TIPO_COLOR[post.tipo]}`}>{TIPO_LABEL[post.tipo]}</span>
          {saved && <span className="c-li-batch-saved-tag">✓ salvo</span>}
        </div>
        <div className="c-li-batch-actions">
          <button
            className="c-li-batch-icon-btn"
            onClick={() => onRegen()}
            disabled={regenLoading}
            title="Regenerar este post"
          >
            {regenLoading ? '⏳' : '↻'}
          </button>
          <button
            className="c-btn-ghost"
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={onCopy}
          >
            {copied ? '✓ Copiado!' : '📋 Copiar'}
          </button>
          <button
            className="c-btn"
            style={{ fontSize: 12, padding: '6px 16px' }}
            onClick={onSave}
            disabled={saved}
          >
            {saved ? '✓ Salvo' : '📅 Salvar'}
          </button>
        </div>
      </div>

      {/* Post preview */}
      <div className="c-li-post-preview" style={{ margin: '14px 0 6px' }}>
        {post.conteudo.split('\n').map((line, i) =>
          line ? <p key={i}>{line}</p> : <br key={i} />
        )}
        <div className="c-li-post-hashtags">
          {post.hashtags.map(h => <span key={h}>{h}</span>)}
        </div>
      </div>
      <div className="c-li-chars">
        {(post.conteudo + '\n\n' + post.hashtags.join(' ')).length} caracteres
      </div>

      {/* Visual brief */}
      {post.imagem_brief && (
        <div className="c-li-visual-brief">
          <span className="c-li-visual-label">🎨 Visual</span>
          <span className="c-li-visual-text">{post.imagem_brief}</span>
        </div>
      )}

      {/* Adjust section */}
      <div className="c-li-batch-footer">
        {!showAdjust ? (
          <button className="c-li-batch-adjust-btn" onClick={() => setShowAdjust(true)}>
            ✦ Ajustar este post
          </button>
        ) : (
          <div className="c-li-batch-adjust-area">
            <textarea
              className="c-textarea short"
              value={adjustText}
              onChange={e => onAdjustChange(e.target.value)}
              placeholder="Ex: hook mais direto, adicionar dado numérico, tom mais casual, mencionar o WhatsApp…"
              autoFocus
            />
            <div className="c-row" style={{ marginTop: 8 }}>
              <button
                className="c-btn-refine"
                onClick={() => { onRegen(adjustText); setShowAdjust(false) }}
                disabled={regenLoading || !adjustText.trim()}
              >
                {regenLoading ? '⏳' : '✦ Aplicar ajustes'}
              </button>
              <button className="c-li-batch-adjust-btn" onClick={() => setShowAdjust(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
