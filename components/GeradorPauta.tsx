'use client'

import { useState, useRef, useCallback } from 'react'
import type { Pauta, Section } from '@/lib/types'
import { getItem } from '@/lib/storage'
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

type FieldId = 'registros' | 'aprendizado' | 'tom'

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

export default function GeradorPauta({ pautas, onSave, onNav }: Props) {
  const { showToast } = useToast()
  const [registros, setRegistros] = useState('')
  const [aprendizado, setAprendizado] = useState('')
  const [tom, setTom] = useState('')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<GeneratedPauta | null>(null)
  const [activeRec, setActiveRec] = useState<FieldId | null>(null)
  const recRef = useRef<SpeechRec | null>(null)

  const setters: Record<FieldId, (v: string) => void> = {
    registros: setRegistros,
    aprendizado: setAprendizado,
    tom: setTom,
  }
  const values: Record<FieldId, string> = { registros, aprendizado, tom }

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
    [activeRec, showToast, registros, aprendizado, tom]
  )

  function buildYtContext(): string {
    const cache = getItem<Record<string, { title: string; views: number }[]>>('ytCache', {})
    if (!Object.keys(cache).length) {
      return 'Padrões conhecidos: POV: títulos, formato narrativo, consistência semanal.'
    }
    let ctx = ''
    for (const [ch, videos] of Object.entries(cache)) {
      ctx += `\n${ch}:\n`
      videos.slice(0, 3).forEach(v => { ctx += `  - "${v.title}" (${v.views} views)\n` })
    }
    return ctx
  }

  async function gerarPauta() {
    if (!registros.trim()) { showToast('Preencha os registros da semana primeiro.'); return }

    setLoading(true)
    setOutput(null)

    const prompt = `Você é especialista em criação de conteúdo para YouTube no estilo "building in public" / vlog de empreendedor, formato narrativo (contar história).

REFERÊNCIAS DO CRIADOR (o que está funcionando para eles):
${buildYtContext()}

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
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

      setOutput(JSON.parse(jsonMatch[0]))
    } catch (err) {
      showToast('Erro ao gerar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
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
