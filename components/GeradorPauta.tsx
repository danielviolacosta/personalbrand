'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Pauta, Section } from '@/lib/types'
import { getItem, setItem } from '@/lib/storage'
import { weekLabel } from '@/lib/utils'
import { useToast } from '@/lib/toast-context'

interface Props {
  pautas: Pauta[]
  onSave: (pautas: Pauta[]) => void
  onNav: (section: Section) => void
}

interface GeneratedPauta {
  titulo: string
  titulos_alt: string[]
  thumbnail_texto: string
  thumbnail_visual: string
  bloco1: string[]
  bloco2: string[]
  bloco3: string[]
}

type FieldId = 'registros' | 'aprendizado' | 'tom' | 'refinamento'

interface SpeechRecResult {
  readonly isFinal: boolean
  readonly [index: number]: { readonly transcript: string }
}
interface SpeechRecEvent {
  readonly resultIndex: number
  readonly results: { readonly length: number; readonly [i: number]: SpeechRecResult }
}
interface SpeechRec {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

const DRAFT_KEY = 'geradorDraft'

interface GeradorDraft {
  registros: string
  aprendizado: string
  tom: string
  output: GeneratedPauta | null
}

export default function GeradorPauta({ pautas, onSave, onNav }: Props) {
  const { showToast } = useToast()

  const draft = getItem<GeradorDraft>(DRAFT_KEY, { registros: '', aprendizado: '', tom: '', output: null })

  const [registros, setRegistros] = useState(draft.registros)
  const [aprendizado, setAprendizado] = useState(draft.aprendizado)
  const [tom, setTom] = useState(draft.tom)
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<GeneratedPauta | null>(draft.output)
  const [refinamento, setRefinamento] = useState('')
  const [activeRec, setActiveRec] = useState<FieldId | null>(null)
  const recRef = useRef<SpeechRec | null>(null)

  useEffect(() => {
    setItem<GeradorDraft>(DRAFT_KEY, { registros, aprendizado, tom, output })
  }, [registros, aprendizado, tom, output])

  const setters: Record<FieldId, (v: string) => void> = {
    registros: setRegistros,
    aprendizado: setAprendizado,
    tom: setTom,
    refinamento: setRefinamento,
  }
  const values: Record<FieldId, string> = { registros, aprendizado, tom, refinamento }

  const toggleMic = useCallback(
    (fieldId: FieldId) => {
      type SpeechRecCtor = new() => SpeechRec
      type SRWindow = Window & {
        SpeechRecognition?: SpeechRecCtor
        webkitSpeechRecognition?: SpeechRecCtor
      }
      const SR: SpeechRecCtor | undefined =
        (window as SRWindow).SpeechRecognition ||
        (window as SRWindow).webkitSpeechRecognition
      if (!SR) { showToast('Use Chrome para gravação de voz'); return }

      if (activeRec === fieldId) {
        recRef.current?.stop()
        setActiveRec(null)
        return
      }

      recRef.current?.stop()
      const rec = new SR()
      rec.lang = 'pt-BR'
      rec.continuous = true
      rec.interimResults = true
      recRef.current = rec
      setActiveRec(fieldId)

      let final = values[fieldId]
      rec.onresult = (e: SpeechRecEvent) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
          else interim = e.results[i][0].transcript
        }
        setters[fieldId](final + interim)
      }
      const stop = () => setActiveRec(null)
      rec.onerror = stop
      rec.onend = stop
      rec.start()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRec, showToast, registros, aprendizado, tom, refinamento]
  )

  function buildYtContext(): string {
    const cache = getItem<Record<string, { title: string; views: number }[]>>('ytCache', {})
    if (!Object.keys(cache).length) {
      return 'Sem dados de canais ainda. Use padrões de alto CTR do nicho empreendedorismo/building in public.'
    }
    let ctx = ''
    for (const [ch, videos] of Object.entries(cache)) {
      const sorted = [...videos].sort((a, b) => b.views - a.views)
      ctx += `\n${ch} (top por views):\n`
      sorted.slice(0, 5).forEach(v => { ctx += `  - "${v.title}" — ${v.views.toLocaleString()} views\n` })
    }
    return ctx
  }

  async function callClaude(prompt: string) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
    const text = (data.content || [])
      .map((i: { text?: string }) => i.text || '')
      .join('')
      .trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')
    return JSON.parse(jsonMatch[0]) as GeneratedPauta
  }

  async function gerarPauta() {
    if (!registros.trim()) { showToast('Preencha os registros da semana primeiro.'); return }

    setLoading(true)
    setOutput(null)

    const prompt = `Você é especialista em criação de conteúdo para YouTube no nicho empreendedorismo / building in public / vlog de fundador.

VÍDEOS DE MAIOR PERFORMANCE DAS REFERÊNCIAS DO CRIADOR (analise os padrões de título que geraram mais views):
${buildYtContext()}

Estude esses títulos: identifique o que têm em comum (tensão, especificidade, resultado, curiosidade) e use esses PADRÕES — não os formatos em si — para criar títulos originais e impactantes.

TÍTULOS — REGRAS OBRIGATÓRIAS:
Gere 1 título principal + 2 alternativos. Cada título deve usar uma fórmula diferente dos outros:
• Resultado específico + obstáculo: "Como [resultado concreto] mesmo com [dificuldade real]"
• Momento de virada: "O dia em que [evento específico] mudou tudo no meu [negócio/projeto]"
• Contraintuitivo: "Por que eu [decisão inesperada] — e faria de novo"
• Antes/depois com dado: "De [estado A] a [estado B]: o que ninguém te conta sobre [tema]"
• Tensão direta: "[Ação tomada]. Aconteceu [resultado inesperado]. Aprendi [lição]"
• Revelação interna: "A coisa que eu estava evitando encarar no meu [negócio/produto]"
• Número + impacto: "[N] erros / decisões / aprendizados que [consequência específica]"

Regras de qualidade para TODOS os títulos:
- Entre 6 e 12 palavras — sem enrolação
- Específico: inclua número, valor, tempo ou resultado concreto sempre que possível
- Tensão emocional que faça o espectador precisar saber o que aconteceu
- "POV:" só se for genuinamente o formato mais impactante para ESSA história — não como padrão
- Sem clickbait: o vídeo deve entregar exatamente o que o título promete

O vídeo deve ter 15-20 minutos com TRÊS BLOCOS narrativos:
- BLOCO 1 (4-5 min): Hook — abre no momento mais tenso/curioso da história
- BLOCO 2 (6-8 min): História + Ensinamento — narrativa completa, lição no final
- BLOCO 3 (5-7 min): Registro de Rotina — bastidores reais da semana, processo, autenticidade

Cada bloco = script em tópicos para contar FALADO como história.

REGISTROS DA SEMANA: ${registros}
APRENDIZADO: ${aprendizado || 'Deduzir dos registros'}
TOM: ${tom || 'Autêntico, direto'}

IMPORTANTE: Responda SOMENTE com JSON puro. Sem texto antes, sem texto depois, sem blocos de código, sem markdown. Apenas o objeto JSON:
{"titulo":"titulo aqui","titulos_alt":["alt1","alt2"],"thumbnail_texto":"texto thumb","thumbnail_visual":"descricao visual","bloco1":["topico1","topico2","topico3","topico4"],"bloco2":["topico1","topico2","topico3","topico4","topico5","licao final"],"bloco3":["topico1","topico2","topico3","topico4"]}`

    try {
      setOutput(await callClaude(prompt))
    } catch (err) {
      showToast('Erro ao gerar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  async function refinarPauta() {
    if (!output) return
    if (!refinamento.trim()) { showToast('Descreva os ajustes que deseja fazer.'); return }

    setLoading(true)

    const prompt = `Você é especialista em criação de conteúdo para YouTube no estilo "building in public" / vlog de empreendedor.

Você gerou a seguinte pauta anteriormente:
${JSON.stringify(output, null, 2)}

O criador quer os seguintes ajustes:
${refinamento}

Mantenha o que está bom e aplique os ajustes solicitados. Preserve o formato narrativo e os tópicos de script falado.

IMPORTANTE: Responda SOMENTE com JSON puro. Sem texto antes, sem texto depois, sem blocos de código, sem markdown. Apenas o objeto JSON:
{"titulo":"titulo aqui","titulos_alt":["alt1","alt2"],"thumbnail_texto":"texto thumb","thumbnail_visual":"descricao visual","bloco1":["topico1","topico2","topico3","topico4"],"bloco2":["topico1","topico2","topico3","topico4","topico5","licao final"],"bloco3":["topico1","topico2","topico3","topico4"]}`

    try {
      setOutput(await callClaude(prompt))
      setRefinamento('')
    } catch (err) {
      showToast('Erro ao refinar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  function salvarPauta() {
    if (!output) return
    const nova: Pauta = {
      titulo: output.titulo,
      bloco1: output.bloco1,
      bloco2: output.bloco2,
      bloco3: output.bloco3,
      semana: weekLabel(0),
      status: 'planejado',
      data: new Date().toISOString(),
    }
    onSave([...pautas, nova])
    showToast('✓ Pauta salva no calendário!')
    onNav('calendario')
  }

  function limpar() {
    setRegistros('')
    setAprendizado('')
    setTom('')
    setOutput(null)
    setRefinamento('')
    setItem<GeradorDraft>(DRAFT_KEY, { registros: '', aprendizado: '', tom: '', output: null })
  }

  const fields: { id: FieldId; label: string; placeholder: string; tall?: boolean }[] = [
    {
      id: 'registros',
      label: 'Seus registros desta semana — fale ou escreva',
      placeholder:
        'Clique no 🎤 e fale naturalmente: o que aconteceu, o que você decidiu, o que filmou, o que foi difícil, o que deu certo...',
      tall: true,
    },
    {
      id: 'aprendizado',
      label: 'Aprendizado ou reflexão principal da semana',
      placeholder: 'Ex: aprendi que não devo tomar decisão de produto sozinho...',
    },
    {
      id: 'tom',
      label: 'Tom desta semana (opcional)',
      placeholder: 'Ex: semana pesada mas com resultado / animado com o lançamento...',
    },
  ]

  return (
    <div>
      <h2>Gerar Pauta + Script</h2>
      <p className="c-subtitle">
        Fale ou escreva seus registros → receba pauta + script em tópicos para contar como história
      </p>

      <div className="c-card">
        {fields.map(({ id, label, placeholder, tall }) => (
          <div key={id}>
            <label className="c-label">{label}</label>
            <div className="c-field-wrap">
              <textarea
                className={`c-textarea ${tall ? 'tall' : 'short'}`}
                value={values[id]}
                onChange={e => setters[id](e.target.value)}
                placeholder={placeholder}
              />
              <button
                className={`c-mic-btn${activeRec === id ? ' recording' : ''}`}
                onClick={() => toggleMic(id)}
                title="Gravar voz"
              >
                🎤
              </button>
            </div>
            {activeRec === id && (
              <div className="c-mic-status active">● Gravando... fale agora</div>
            )}
          </div>
        ))}

        <div className="c-row">
          <button className="c-btn" onClick={gerarPauta} disabled={loading}>
            ⚡ Gerar pauta + script
          </button>
          <button className="c-btn-ghost" onClick={limpar}>
            Limpar
          </button>
        </div>
      </div>

      {loading && (
        <div className="c-loading visible">
          <div className="c-spinner" />
          Gerando pauta e script com IA...
        </div>
      )}

      {output && (
        <div className="c-output-box">
          <div className="c-out-section">
            <h4 className="c-out-label">Título principal</h4>
            <div className="c-out-titulo">{output.titulo}</div>
            <div style={{ marginTop: 8 }}>
              {output.titulos_alt?.map((t, i) => (
                <div key={i} className="c-alt-title">
                  • {t}
                </div>
              ))}
            </div>
          </div>

          <div className="c-out-section">
            <h4 className="c-out-label">Chamada de thumbnail (3–5 palavras)</h4>
            <div className="c-out-text">{output.thumbnail_texto}</div>
          </div>

          <div className="c-out-section">
            <h4 className="c-out-label">Script — Bloco 01: Entretenimento / Hook (4–5 min)</h4>
            <ScriptBloco topicos={output.bloco1} accent="e1" label="01 — Como abrir o vídeo" />
          </div>

          <div className="c-out-section">
            <h4 className="c-out-label">Script — Bloco 02: História + Ensinamento (6–8 min)</h4>
            <ScriptBloco topicos={output.bloco2} accent="e2" label="02 — Narrativa e lição" />
          </div>

          <div className="c-out-section">
            <h4 className="c-out-label">Script — Bloco 03: Registro de Rotina (5–7 min)</h4>
            <ScriptBloco topicos={output.bloco3} accent="e3" label="03 — Bastidores reais" />
          </div>

          <div className="c-out-section">
            <h4 className="c-out-label">Sugestão visual de thumbnail</h4>
            <div className="c-out-text">{output.thumbnail_visual}</div>
          </div>

          <div className="c-refine-box">
            <label className="c-label">Ajustes e melhorias — fale ou escreva o que quer mudar</label>
            <div className="c-field-wrap">
              <textarea
                className="c-textarea short"
                value={refinamento}
                onChange={e => setRefinamento(e.target.value)}
                placeholder="Ex: título mais impactante, mais tensão no bloco 1, tom mais leve..."
              />
              <button
                className={`c-mic-btn${activeRec === 'refinamento' ? ' recording' : ''}`}
                onClick={() => toggleMic('refinamento')}
                title="Gravar voz"
              >
                🎤
              </button>
            </div>
            {activeRec === 'refinamento' && (
              <div className="c-mic-status active">● Gravando... fale agora</div>
            )}
            <button className="c-btn-refine" onClick={refinarPauta} disabled={loading}>
              ✦ Refinar com esses ajustes
            </button>
          </div>

          <div className="c-row">
            <button className="c-btn" onClick={salvarPauta}>
              💾 Salvar no calendário
            </button>
            <button className="c-btn-ghost" onClick={gerarPauta}>
              ↻ Gerar novamente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScriptBloco({
  topicos,
  accent,
  label,
}: {
  topicos: string[]
  accent: string
  label: string
}) {
  return (
    <div className="c-script-bloco">
      <div className={`c-script-bloco-label ${accent}`}>{label}</div>
      {topicos?.map((t, i) => (
        <div key={i} className="c-script-topico">
          <span className="c-script-num">{String(i + 1).padStart(2, '0')}</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  )
}
