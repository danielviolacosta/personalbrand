'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useToast } from '@/lib/toast-context'
import { weekLabel } from '@/lib/utils'
import type { PostTipo, LinkedInPost, RefPostLinkedIn, SaasContext } from '@/lib/types'

interface GeneratedPost {
  conteudo: string
  hashtags: string[]
  dica_visual: string
}

interface SpeechRecResult { readonly isFinal: boolean; readonly [i: number]: { readonly transcript: string } }
interface SpeechRecEvent { readonly resultIndex: number; readonly results: { readonly length: number; readonly [i: number]: SpeechRecResult } }
interface SpeechRec {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: SpeechRecEvent) => void) | null
  onerror: (() => void) | null; onend: (() => void) | null
  start(): void; stop(): void
}
type SpeechRecCtor = new () => SpeechRec

const TIPOS: { id: PostTipo; label: string; emoji: string; desc: string }[] = [
  { id: 'noticia',      label: 'Notícia/Tendência', emoji: '📰', desc: 'Notícia do setor ligada ao seu negócio' },
  { id: 'produto',      label: 'Produto/Feature',  emoji: '⚡', desc: 'Feature, atualização ou caso de uso do SaaS' },
  { id: 'prova_social', label: 'Prova Social',      emoji: '🏆', desc: 'Resultado de cliente, case, depoimento' },
  { id: 'dica',         label: 'Dica Prática',      emoji: '💡', desc: 'Dica acionável para o ICP' },
  { id: 'personal',     label: 'Personal Brand',    emoji: '🧭', desc: 'Sua jornada, erros, aprendizados como founder' },
  { id: 'video_demo',   label: 'Vídeo/Demo',        emoji: '🎬', desc: 'Script ou legenda para vídeo demonstrativo' },
]

const TIPO_COLOR: Record<PostTipo, string> = {
  noticia:     'li-t-noticia',
  produto:     'li-t-produto',
  prova_social:'li-t-prova',
  dica:        'li-t-dica',
  personal:    'li-t-personal',
  video_demo:  'li-t-video',
}

const DRAFT_KEY = 'liGeradorDraft'
interface Draft { tipo: PostTipo; contexto: string; output: GeneratedPost | null }

export default function GeradorPost({ onSave }: { onSave: (p: LinkedInPost) => void }) {
  const { showToast } = useToast()
  const draft = getItem<Draft>(DRAFT_KEY, { tipo: 'dica', contexto: '', output: null })

  const [tipo, setTipo] = useState<PostTipo>(draft.tipo)
  const [contexto, setContexto] = useState(draft.contexto)
  const [output, setOutput] = useState<GeneratedPost | null>(draft.output)
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [copied, setCopied] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)

  useEffect(() => {
    setItem<Draft>(DRAFT_KEY, { tipo, contexto, output })
  }, [tipo, contexto, output])

  const toggleMic = useCallback(() => {
    type SRWindow = Window & { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }
    const SR = (window as SRWindow).SpeechRecognition || (window as SRWindow).webkitSpeechRecognition
    if (!SR) { showToast('Use Chrome para gravação de voz'); return }
    if (recording) { recRef.current?.stop(); setRecording(false); return }
    const rec = new SR()
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true
    recRef.current = rec; setRecording(true)
    let final = contexto
    rec.onresult = (e: SpeechRecEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setContexto(final + interim)
    }
    const stop = () => setRecording(false)
    rec.onerror = stop; rec.onend = stop; rec.start()
  }, [recording, contexto, showToast])

  function buildPrompt(): string {
    const saas = getItem<SaasContext>('linkedinConfig', { produto: '', descricao: '', icp: '', diferenciais: '', casos: '', extras: '' })
    const refs = getItem<RefPostLinkedIn[]>('liRefs', [])
    const tipoRefs = refs.filter(r => r.tipo === tipo).slice(0, 2)
    const anyRefs = tipoRefs.length < 2 ? [...tipoRefs, ...refs.filter(r => r.tipo !== tipo).slice(0, 2 - tipoRefs.length)] : tipoRefs

    const saasBlock = [
      saas.produto && `PRODUTO: ${saas.produto}`,
      saas.descricao && `O QUE FAZ: ${saas.descricao}`,
      saas.icp && `ICP: ${saas.icp}`,
      saas.diferenciais && `DIFERENCIAIS: ${saas.diferenciais}`,
      saas.casos && `PROVAS SOCIAIS: ${saas.casos}`,
      saas.extras && `CONTEXTO EXTRA: ${saas.extras}`,
    ].filter(Boolean).join('\n')

    const refBlock = anyRefs.length
      ? '\n\nEXEMPLOS DE POSTS QUE FUNCIONARAM BEM (use como referência de estilo, não copie):\n' +
        anyRefs.map(r => `---\n${r.conteudo}${r.nota ? `\n[por que funcionou: ${r.nota}]` : ''}`).join('\n')
      : ''

    const tipoInfo = TIPOS.find(t => t.id === tipo)!
    const tipoGuide: Record<PostTipo, string> = {
      noticia:     'Conecte uma notícia/tendência do mercado ao problema que seu produto resolve. Não seja corporativo — seja humano e direto.',
      produto:     'Mostre como uma feature ou caso de uso específico resolve um problema real do ICP. Concreto, com exemplo prático.',
      prova_social:'Conte o resultado de um cliente real (ou hipotético realista). Dados específicos geram mais credibilidade.',
      dica:        'Dica prática e acionável que o ICP pode aplicar hoje. Pode ou não mencionar o produto — o valor vem primeiro.',
      personal:    'História pessoal como founder/empreendedor. Vulnerabilidade, erro, virada. Conecta e gera identificação.',
      video_demo:  'Post de acompanhamento para um vídeo demonstrativo curto (60-90s). Hook que explica o que o vídeo mostra e por que vale assistir.',
    }

    return `Você é especialista em LinkedIn B2B para o nicho de CRM / relacionamento com cliente / equipes comerciais.

${saasBlock || 'Produto: SaaS de relacionamento com clientes via email e WhatsApp para equipes comerciais.'}${refBlock}

TIPO DE POST: ${tipoInfo.emoji} ${tipoInfo.label}
DIRETRIZ: ${tipoGuide[tipo]}
TÓPICO/CONTEXTO: ${contexto || 'Escolha o ângulo mais relevante baseado no tipo e no produto.'}

Crie um post LinkedIn de alto engajamento. Regras obrigatórias:
• Primeiras 2 linhas = HOOK que para o scroll (sem ponto final para forçar "ver mais")
• Linha em branco entre cada parágrafo
• Linguagem direta, sem corporativês, pode usar emojis com moderação
• CTA específico na última linha (pergunta, convite ou ação)
• 3 a 5 hashtags ao final
• Máximo 1200 caracteres no total

Responda SOMENTE com JSON puro. Sem texto antes, sem texto depois:
{"conteudo":"post completo com \\n para quebras de linha","hashtags":["#tag1","#tag2","#tag3"],"dica_visual":"sugestão de imagem ou vídeo para acompanhar o post"}`
  }

  async function gerar() {
    if (!contexto.trim() && tipo !== 'produto' && tipo !== 'dica') {
      showToast('Descreva o tópico ou contexto do post.')
      return
    }
    setLoading(true)
    setOutput(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, messages: [{ role: 'user', content: buildPrompt() }] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = (data.content || []).map((i: { text?: string }) => i.text || '').join('').trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setOutput(JSON.parse(match[0]))
    } catch (err) {
      showToast('Erro ao gerar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  function salvarCalendario() {
    if (!output) return
    const post: LinkedInPost = {
      id: Date.now().toString(),
      conteudo: output.conteudo + '\n\n' + output.hashtags.join(' '),
      tipo,
      status: 'rascunho',
      semana: weekLabel(0),
      data: new Date().toISOString(),
    }
    onSave(post)
    showToast('✓ Post salvo no calendário!')
  }

  function copiar() {
    if (!output) return
    const text = output.conteudo + '\n\n' + output.hashtags.join(' ')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function limpar() {
    setContexto('')
    setOutput(null)
    setTipo('dica')
    setItem<Draft>(DRAFT_KEY, { tipo: 'dica', contexto: '', output: null })
  }

  const tipoObj = TIPOS.find(t => t.id === tipo)!

  return (
    <div>
      <h2>Gerar Post LinkedIn</h2>
      <p className="c-subtitle">Escolha o tipo, descreva o tópico e receba um post pronto para publicar</p>

      <div className="c-card">
        <div>
          <label className="c-label">Tipo de post</label>
          <div className="c-li-tipo-grid">
            {TIPOS.map(t => (
              <button
                key={t.id}
                className={`c-li-tipo-card${tipo === t.id ? ' active' : ''}`}
                onClick={() => setTipo(t.id)}
              >
                <span className="c-li-tipo-emoji">{t.emoji}</span>
                <span className="c-li-tipo-name">{t.label}</span>
                <span className="c-li-tipo-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="c-label">Tópico / contexto — fale ou escreva</label>
          <div className="c-field-wrap">
            <textarea
              className="c-textarea tall"
              value={contexto}
              onChange={e => setContexto(e.target.value)}
              placeholder={
                tipo === 'noticia'      ? 'Qual notícia ou tendência você quer comentar? Ex: nova política de privacidade do WhatsApp...' :
                tipo === 'produto'      ? 'Qual feature ou caso de uso mostrar? Ex: agendamento de follow-up de 30 dias em 2 cliques...' :
                tipo === 'prova_social' ? 'Qual resultado de cliente ou dado real tem? Ex: cliente reduziu no-show em 60% com lembrete automático...' :
                tipo === 'dica'         ? 'Qual dica prática para o ICP? Ex: 3 mensagens de WhatsApp pós-venda que aumentam recompra...' :
                tipo === 'personal'     ? 'O que aconteceu na sua jornada essa semana? Erro, decisão, aprendizado...' :
                'O que o vídeo vai mostrar? Ex: como configurar uma sequência de e-mail de pós-venda em 5 minutos...'
              }
            />
            <button
              className={`c-mic-btn${recording ? ' recording' : ''}`}
              onClick={toggleMic}
              title="Gravar voz"
            >
              🎤
            </button>
          </div>
          {recording && <div className="c-mic-status active">● Gravando... fale agora</div>}
        </div>

        <div className="c-row">
          <button className="c-btn" onClick={gerar} disabled={loading}>
            ⚡ Gerar post
          </button>
          <button className="c-btn-ghost" onClick={limpar}>Limpar</button>
        </div>
      </div>

      {loading && (
        <div className="c-loading visible">
          <div className="c-spinner" />
          Criando post com IA...
        </div>
      )}

      {output && (
        <div className="c-output-box">
          <div className="c-out-section">
            <h4 className="c-out-label">
              {tipoObj.emoji} {tipoObj.label} — preview do post
            </h4>
            <div className="c-li-post-preview">
              {output.conteudo.split('\n').map((line, i) => (
                line ? <p key={i}>{line}</p> : <br key={i} />
              ))}
              <div className="c-li-post-hashtags">
                {output.hashtags.map(h => <span key={h}>{h}</span>)}
              </div>
            </div>
            <div className="c-li-chars">
              {(output.conteudo + '\n\n' + output.hashtags.join(' ')).length} caracteres
            </div>
          </div>

          {output.dica_visual && (
            <div className="c-out-section">
              <h4 className="c-out-label">Sugestão visual</h4>
              <div className="c-out-text">{output.dica_visual}</div>
            </div>
          )}

          <div className="c-row">
            <button className="c-btn" onClick={salvarCalendario}>
              📅 Salvar no calendário
            </button>
            <button className="c-btn-ghost" onClick={copiar}>
              {copied ? '✓ Copiado!' : '📋 Copiar post'}
            </button>
            <button className="c-btn-ghost" onClick={gerar}>
              ↻ Gerar novamente
            </button>
          </div>

          <div className="c-refine-box" style={{ marginTop: 12 }}>
            <label className="c-label" style={{ color: 'var(--c-accent3)' }}>
              Ajustes — fale ou escreva o que quer mudar
            </label>
            <AjustePost output={output} contexto={contexto} tipo={tipo} onResult={setOutput} />
          </div>
        </div>
      )}
    </div>
  )
}

function AjustePost({
  output, contexto, tipo, onResult,
}: {
  output: GeneratedPost
  contexto: string
  tipo: PostTipo
  onResult: (g: GeneratedPost) => void
}) {
  const { showToast } = useToast()
  const [ajuste, setAjuste] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)

  const toggleMic = useCallback(() => {
    type SRWindow = Window & { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }
    const SR = (window as SRWindow).SpeechRecognition || (window as SRWindow).webkitSpeechRecognition
    if (!SR) { showToast('Use Chrome para gravação de voz'); return }
    if (recording) { recRef.current?.stop(); setRecording(false); return }
    const rec = new SR()
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true
    recRef.current = rec; setRecording(true)
    let final = ajuste
    rec.onresult = (e: SpeechRecEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setAjuste(final + interim)
    }
    const stop = () => setRecording(false)
    rec.onerror = stop; rec.onend = stop; rec.start()
  }, [recording, ajuste, showToast])

  async function refinar() {
    if (!ajuste.trim()) { showToast('Descreva os ajustes desejados.'); return }
    setLoading(true)
    try {
      const saas = getItem<SaasContext>('linkedinConfig', { produto: '', descricao: '', icp: '', diferenciais: '', casos: '', extras: '' })
      const prompt = `Você criou o seguinte post LinkedIn:

${JSON.stringify(output, null, 2)}

O criador quer os seguintes ajustes:
${ajuste}

Produto de referência: ${saas.produto || 'SaaS de CRM / relacionamento com cliente'}
ICP: ${saas.icp || 'empresários e gestores comerciais'}

Mantenha o que está bom, aplique os ajustes. Máximo 1200 caracteres.
Responda SOMENTE com JSON puro:
{"conteudo":"post completo com \\n para quebras","hashtags":["#tag1","#tag2","#tag3"],"dica_visual":"sugestão visual"}`
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = (data.content || []).map((i: { text?: string }) => i.text || '').join('').trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      onResult(JSON.parse(match[0]))
      setAjuste('')
    } catch (err) {
      showToast('Erro ao refinar: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="c-field-wrap">
        <textarea
          className="c-textarea short"
          value={ajuste}
          onChange={e => setAjuste(e.target.value)}
          placeholder="Ex: hook mais direto, adicionar dado numérico, tom mais leve..."
        />
        <button className={`c-mic-btn${recording ? ' recording' : ''}`} onClick={toggleMic} title="Gravar voz">🎤</button>
      </div>
      {recording && <div className="c-mic-status active">● Gravando...</div>}
      <button className="c-btn-refine" onClick={refinar} disabled={loading} style={{ marginTop: 12 }}>
        ✦ Refinar com esses ajustes
      </button>
    </div>
  )
}
