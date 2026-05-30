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

interface TitleOption {
  titulo: string
  motivo: string
}

interface GeneratedPauta {
  bloco1: string[]
  bloco2: string[]
  bloco3: string[]
  thumbnail_texto: string
  thumbnail_visual: string
}

type GeradorMode = 'registros' | 'tema'
type GeradorStep = 'input' | 'titles' | 'script'
type FieldId = 'registros' | 'aprendizado' | 'tom' | 'tema' | 'angulo' | 'refinamento'

interface SpeechRecResult {
  readonly isFinal: boolean
  readonly [index: number]: { readonly transcript: string }
}
interface SpeechRecEvent {
  readonly resultIndex: number
  readonly results: { readonly length: number; readonly [i: number]: SpeechRecResult }
}
interface SpeechRec {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: SpeechRecEvent) => void) | null
  onerror: (() => void) | null; onend: (() => void) | null
  start(): void; stop(): void
}

const DRAFT_KEY = 'geradorDraft'

interface GeradorDraft {
  mode: GeradorMode
  step: GeradorStep
  registros: string; aprendizado: string; tom: string
  tema: string; angulo: string
  titleOptions: TitleOption[]
  selectedTitle: string | null
  output: GeneratedPauta | null
}

const DEFAULT_DRAFT: GeradorDraft = {
  mode: 'registros', step: 'input',
  registros: '', aprendizado: '', tom: '',
  tema: '', angulo: '',
  titleOptions: [], selectedTitle: null, output: null,
}

export default function GeradorPauta({ pautas, onSave, onNav }: Props) {
  const { showToast } = useToast()

  const draft = getItem<GeradorDraft>(DRAFT_KEY, DEFAULT_DRAFT)

  const [mode,          setMode]          = useState<GeradorMode>(draft.mode          ?? 'registros')
  const [step,          setStep]          = useState<GeradorStep>(draft.step          ?? 'input')
  const [registros,     setRegistros]     = useState(draft.registros     ?? '')
  const [aprendizado,   setAprendizado]   = useState(draft.aprendizado   ?? '')
  const [tom,           setTom]           = useState(draft.tom            ?? '')
  const [tema,          setTema]          = useState(draft.tema           ?? '')
  const [angulo,        setAngulo]        = useState(draft.angulo         ?? '')
  const [titleOptions,  setTitleOptions]  = useState<TitleOption[]>(draft.titleOptions  ?? [])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(draft.selectedTitle ?? null)
  const [output,        setOutput]        = useState<GeneratedPauta | null>(draft.output ?? null)
  const [refinamento,   setRefinamento]   = useState('')
  const [loading,       setLoading]       = useState(false)
  const [activeRec,     setActiveRec]     = useState<FieldId | null>(null)
  const recRef = useRef<SpeechRec | null>(null)

  useEffect(() => {
    setItem<GeradorDraft>(DRAFT_KEY, {
      mode, step, registros, aprendizado, tom,
      tema, angulo, titleOptions, selectedTitle, output,
    })
  }, [mode, step, registros, aprendizado, tom, tema, angulo, titleOptions, selectedTitle, output])

  const setterMap: Record<FieldId, (v: string) => void> = {
    registros:   setRegistros,
    aprendizado: setAprendizado,
    tom:         setTom,
    tema:        setTema,
    angulo:      setAngulo,
    refinamento: setRefinamento,
  }
  const values: Record<FieldId, string> = { registros, aprendizado, tom, tema, angulo, refinamento }

  const toggleMic = useCallback(
    (fieldId: FieldId) => {
      type SpeechRecCtor = new() => SpeechRec
      type SRWindow = Window & {
        SpeechRecognition?: SpeechRecCtor
        webkitSpeechRecognition?: SpeechRecCtor
      }
      const SR = (window as SRWindow).SpeechRecognition || (window as SRWindow).webkitSpeechRecognition
      if (!SR) { showToast('Use Chrome para gravação de voz'); return }

      if (activeRec === fieldId) { recRef.current?.stop(); setActiveRec(null); return }

      recRef.current?.stop()
      const rec = new SR()
      rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true
      recRef.current = rec
      setActiveRec(fieldId)

      let final = values[fieldId]
      rec.onresult = (e: SpeechRecEvent) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
          else interim = e.results[i][0].transcript
        }
        setterMap[fieldId](final + interim)
      }
      const stop = () => setActiveRec(null)
      rec.onerror = stop; rec.onend = stop
      rec.start()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRec, showToast, registros, aprendizado, tom, tema, angulo, refinamento]
  )

  // ── YouTube reference context ─────────────────────────────────────────────
  function buildYtContext(): string {
    const cache = getItem<Record<string, { title: string; views: number }[]>>('ytCache', {})
    if (!Object.keys(cache).length) return ''
    let ctx = ''
    for (const [ch, videos] of Object.entries(cache)) {
      const sorted = [...videos].sort((a, b) => b.views - a.views)
      ctx += `\nCanal ${ch} — top vídeos por views:\n`
      sorted.slice(0, 8).forEach(v => { ctx += `  · "${v.title}" — ${v.views.toLocaleString()} views\n` })
    }
    return ctx
  }

  // ── API helper ───────────────────────────────────────────────────────────
  async function callClaude(messages: { role: string; content: string }[], maxTokens = 1200) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
    return (data.content || []).map((i: { text?: string }) => i.text || '').join('').trim()
  }

  // ── STEP 1 → STEP 2: Generate title options ───────────────────────────────
  async function gerarTitulos() {
    if (mode === 'registros' && !registros.trim()) {
      showToast('Preencha os registros da semana primeiro.'); return
    }
    if (mode === 'tema' && !tema.trim()) {
      showToast('Informe o tema do vídeo primeiro.'); return
    }

    setLoading(true)

    const ytCtx = buildYtContext()
    const videoContext = mode === 'registros'
      ? `REGISTROS DA SEMANA:\n${registros}\n\nAPRENDIZADO: ${aprendizado || 'a deduzir'}\nTOM: ${tom || 'autêntico, direto'}`
      : `TEMA DO VÍDEO: ${tema}\nÂNGULO: ${angulo || 'o mais impactante e autêntico para um empreendedor'}`

    const prompt = `Você é um especialista em títulos de YouTube com profundo conhecimento de psicologia de cliques, CTR e algoritmos de descoberta. Seu único trabalho agora é criar os melhores 3 títulos possíveis para este vídeo. O script será criado depois — foque 100% nos títulos.

${ytCtx ? `REFERÊNCIAS DO CRIADOR — analise os padrões de títulos que geraram mais views e extraia o que fazem de diferente:\n${ytCtx}\n` : ''}
PRINCÍPIOS DE CTR DE ALTO IMPACTO que você deve aplicar:
- Especificidade numérica: não "algumas dicas", mas "3 decisões que custaram R$50k"
- Tensão emocional: o espectador PRECISA saber o que aconteceu
- Benefício ou risco claro: o que ganho ou perco assistindo?
- Curiosity gap honesto: prometa algo que o vídeo entregue de verdade
- Primeira pessoa cria conexão real ("Fiz X e aconteceu Y", "Errei em Z")
- Contraintuitivo chama atenção ("Por que parei de fazer X quando mais funcionava")
- Resultado específico + contexto inesperado ou obstáculo surpreendente

FÓRMULAS — gere uma opção com cada fórmula, todas diferentes entre si:
A) Resultado específico + obstáculo: "Como [resultado concreto] mesmo com [dificuldade real]"
B) Tensão direta: "[Ação tomada]. [Resultado inesperado]. [Lição]."
C) Contraintuitivo / revelação: "Por que eu [decisão inesperada] — e faria de novo" ou "A coisa que eu estava evitando encarar no meu [negócio]"
D) Momento de virada: "O dia em que [evento específico] mudou tudo no meu [negócio/projeto]"
E) Número + impacto: "[N] [erros/decisões/aprendizados] que [consequência específica]"

Regras obrigatórias para todos os títulos:
- 6 a 12 palavras — sem enrolação
- Específico: número, valor em R$, tempo ou resultado concreto sempre que possível
- Sem ponto-e-vírgula, sem reticências em excesso
- "POV:" apenas se for genuinamente o formato mais impactante — não como padrão
- O vídeo precisa entregar exatamente o que o título promete

${videoContext}

Retorne SOMENTE um array JSON com exatamente 3 objetos, sem texto antes ou depois:
[{"titulo":"...","motivo":"explique em 1 frase curta por que este título vai gerar cliques — padrão usado e gatilho psicológico"},{"titulo":"...","motivo":"..."},{"titulo":"...","motivo":"..."}]`

    try {
      const raw = await callClaude([{ role: 'user', content: prompt }], 800)
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Resposta inválida da IA')
      const options = JSON.parse(match[0]) as TitleOption[]
      setTitleOptions(options)
      setSelectedTitle(null)
      setStep('titles')
    } catch (err) {
      showToast('Erro ao gerar títulos: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 2 → STEP 3: Generate script from chosen title ───────────────────
  async function gerarScript() {
    if (!selectedTitle) { showToast('Escolha um título primeiro.'); return }

    setLoading(true)
    setOutput(null)

    const videoContext = mode === 'registros'
      ? `REGISTROS DA SEMANA: ${registros}\nAPRENDIZADO: ${aprendizado || 'deduzir dos registros'}\nTOM: ${tom || 'autêntico, direto'}`
      : `TEMA DO VÍDEO: ${tema}\nÂNGULO: ${angulo || 'o mais impactante e autêntico'}`

    const blocosDesc = mode === 'registros'
      ? `- BLOCO 1 (4-5 min): Hook — abre no momento mais tenso/curioso da história
- BLOCO 2 (6-8 min): Narrativa completa + ensinamento principal no final
- BLOCO 3 (5-7 min): Registro de Rotina — bastidores reais da semana, processo, autenticidade`
      : `- BLOCO 1 (3-4 min): Hook — abre no ponto mais curioso, provocativo ou contraintuitivo do tema
- BLOCO 2 (5-7 min): Desenvolvimento — argumentos, exemplos reais, perspectiva única do empreendedor
- BLOCO 3 (3-4 min): Conclusão prática — o que fazer com isso, reflexão e CTA suave`

    const prompt = `Você é especialista em criação de conteúdo para YouTube no nicho empreendedorismo / building in public / vlog de fundador.

O título do vídeo já foi definido e aprovado pelo criador:
"${selectedTitle}"

Construa o script inteiramente em torno deste título — cada bloco deve cumprir a promessa que ele faz.

${videoContext}

ESTRUTURA (${mode === 'registros' ? '15-20' : '10-15'} minutos):
${blocosDesc}

Cada bloco = tópicos de script para contar FALADO como história. Seja específico, narrativo, com tópicos que orientem o criador a falar naturalmente.

IMPORTANTE: Responda SOMENTE com JSON puro. Sem texto antes, sem texto depois, sem blocos de código:
{"bloco1":["topico1","topico2","topico3","topico4"],"bloco2":["topico1","topico2","topico3","topico4","topico5","licao final"],"bloco3":["topico1","topico2","topico3","topico4"],"thumbnail_texto":"3-5 palavras impactantes","thumbnail_visual":"descrição do visual ideal para thumbnail"}`

    try {
      const raw = await callClaude([{ role: 'user', content: prompt }], 2000)
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setOutput(JSON.parse(match[0]) as GeneratedPauta)
      setStep('script')
    } catch (err) {
      showToast('Erro ao gerar script: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  // ── Refine script ─────────────────────────────────────────────────────────
  async function refinarPauta() {
    if (!output || !selectedTitle) return
    if (!refinamento.trim()) { showToast('Descreva os ajustes que deseja fazer.'); return }

    setLoading(true)
    const prompt = `Você é especialista em criação de conteúdo para YouTube.

Título do vídeo: "${selectedTitle}"

Pauta gerada:
${JSON.stringify(output, null, 2)}

Ajustes solicitados pelo criador:
${refinamento}

Mantenha o que está bom, aplique os ajustes e garanta que tudo ainda serve o título aprovado.

IMPORTANTE: Responda SOMENTE com JSON puro:
{"bloco1":["topico1","topico2","topico3","topico4"],"bloco2":["topico1","topico2","topico3","topico4","topico5","licao final"],"bloco3":["topico1","topico2","topico3","topico4"],"thumbnail_texto":"3-5 palavras","thumbnail_visual":"descrição visual"}`

    try {
      const raw = await callClaude([{ role: 'user', content: prompt }], 2000)
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setOutput(JSON.parse(match[0]) as GeneratedPauta)
      setRefinamento('')
    } catch (err) {
      showToast('Erro ao refinar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  // ── Save to calendar ──────────────────────────────────────────────────────
  function salvarPauta() {
    if (!output || !selectedTitle) return
    const nova: Pauta = {
      titulo: selectedTitle,
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

  // ── Reset ─────────────────────────────────────────────────────────────────
  function limpar() {
    setStep('input'); setTitleOptions([]); setSelectedTitle(null); setOutput(null)
    setRegistros(''); setAprendizado(''); setTom('')
    setTema(''); setAngulo(''); setRefinamento('')
    setItem<GeradorDraft>(DRAFT_KEY, { ...DEFAULT_DRAFT, mode })
  }

  // ── Field configs ─────────────────────────────────────────────────────────
  const fieldsRegistros = [
    { id: 'registros' as FieldId,   label: 'Seus registros desta semana — fale ou escreva', tall: true,
      placeholder: 'Clique no 🎤 e fale naturalmente: o que aconteceu, o que decidiu, o que filmou, o que foi difícil, o que deu certo...' },
    { id: 'aprendizado' as FieldId, label: 'Aprendizado ou reflexão principal da semana',
      placeholder: 'Ex: aprendi que não devo tomar decisão de produto sozinho...' },
    { id: 'tom' as FieldId,         label: 'Tom desta semana (opcional)',
      placeholder: 'Ex: semana pesada mas com resultado / animado com o lançamento...' },
  ]

  const fieldsTema = [
    { id: 'tema' as FieldId,   label: 'Tema ou ideia do vídeo — fale ou escreva', tall: true,
      placeholder: 'Ex: "Por que a maioria dos empreendedores desiste antes de ver resultado", "Como estruturei meu processo de vendas do zero"...' },
    { id: 'angulo' as FieldId, label: 'Ângulo ou perspectiva que quer explorar (opcional)',
      placeholder: 'Ex: falar sobre o erro que cometi, dar uma opinião polêmica, focar no lado prático...' },
  ]

  const activeFields = mode === 'registros' ? fieldsRegistros : fieldsTema

  return (
    <div>
      <h2>Gerar Pauta + Script</h2>

      {/* breadcrumb */}
      <div className="c-gen-steps">
        <span className={`c-gen-step${step === 'input' ? ' active' : ' done'}`}>1 · Contexto</span>
        <span className="c-gen-step-sep">›</span>
        <span className={`c-gen-step${step === 'titles' ? ' active' : step === 'script' ? ' done' : ''}`}>2 · Título</span>
        <span className="c-gen-step-sep">›</span>
        <span className={`c-gen-step${step === 'script' ? ' active' : ''}`}>3 · Script</span>
      </div>

      <p className="c-subtitle" style={{ marginTop: 4 }}>
        {step === 'input'  && (mode === 'registros' ? 'Descreva seus registros da semana → sugerimos os melhores títulos' : 'Informe o tema → sugerimos os melhores títulos')}
        {step === 'titles' && 'Escolha o título que mais combina com o que você quer contar'}
        {step === 'script' && `Script gerado para: "${selectedTitle}"`}
      </p>

      {/* ── STEP 1: Input ── */}
      {step === 'input' && (
        <>
          {/* mode toggle */}
          <div className="c-mode-switch" style={{ marginBottom: 20 }}>
            <button className={`c-mode-btn${mode === 'registros' ? ' active' : ''}`}
              onClick={() => { setMode('registros'); setOutput(null) }}>
              📋 Baseado em registros
            </button>
            <button className={`c-mode-btn${mode === 'tema' ? ' active' : ''}`}
              onClick={() => { setMode('tema'); setOutput(null) }}>
              💡 Tema rápido
            </button>
          </div>

          <div className="c-card">
            {activeFields.map(({ id, label, placeholder, tall }) => (
              <div key={id}>
                <label className="c-label">{label}</label>
                <div className="c-field-wrap">
                  <textarea
                    className={`c-textarea ${tall ? 'tall' : 'short'}`}
                    value={values[id]}
                    onChange={e => setterMap[id](e.target.value)}
                    placeholder={placeholder}
                  />
                  <button className={`c-mic-btn${activeRec === id ? ' recording' : ''}`}
                    onClick={() => toggleMic(id)} title="Gravar voz">🎤</button>
                </div>
                {activeRec === id && <div className="c-mic-status active">● Gravando... fale agora</div>}
              </div>
            ))}

            <div className="c-row">
              <button className="c-btn" onClick={gerarTitulos} disabled={loading}>
                ✨ Sugerir títulos
              </button>
              <button className="c-btn-ghost" onClick={limpar}>Limpar</button>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2: Title selection ── */}
      {step === 'titles' && (
        <>
          <div className="c-title-options">
            {titleOptions.map((opt, i) => (
              <button
                key={i}
                className={`c-title-card${selectedTitle === opt.titulo ? ' selected' : ''}`}
                onClick={() => setSelectedTitle(opt.titulo)}
              >
                <div className="c-title-card-num">{i + 1}</div>
                <div className="c-title-card-body">
                  <div className="c-title-card-titulo">{opt.titulo}</div>
                  <div className="c-title-card-motivo">{opt.motivo}</div>
                </div>
                {selectedTitle === opt.titulo && <div className="c-title-card-check">✓</div>}
              </button>
            ))}
          </div>

          <div className="c-row" style={{ marginTop: 20 }}>
            <button className="c-btn" onClick={gerarScript} disabled={loading || !selectedTitle}>
              ⚡ Gerar script com este título
            </button>
            <button className="c-btn-ghost" onClick={gerarTitulos} disabled={loading}>
              ↻ Outros títulos
            </button>
            <button className="c-btn-ghost" onClick={() => setStep('input')}>
              ← Voltar
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: Script output ── */}
      {step === 'script' && output && (
        <>
          {/* chosen title banner */}
          <div className="c-chosen-title">
            <span className="c-chosen-title-label">Título</span>
            <span className="c-chosen-title-text">{selectedTitle}</span>
            <button className="c-chosen-title-change" onClick={() => setStep('titles')}>
              trocar ›
            </button>
          </div>

          <div className="c-output-box">
            <div className="c-out-section">
              <h4 className="c-out-label">Chamada de thumbnail (3–5 palavras)</h4>
              <div className="c-out-text">{output.thumbnail_texto}</div>
            </div>

            <div className="c-out-section">
              <h4 className="c-out-label">
                {mode === 'registros' ? 'Script — Bloco 01: Hook (4–5 min)' : 'Script — Bloco 01: Hook (3–4 min)'}
              </h4>
              <ScriptBloco topicos={output.bloco1} accent="e1" label="01 — Como abrir o vídeo" />
            </div>

            <div className="c-out-section">
              <h4 className="c-out-label">
                {mode === 'registros' ? 'Script — Bloco 02: História + Ensinamento (6–8 min)' : 'Script — Bloco 02: Desenvolvimento (5–7 min)'}
              </h4>
              <ScriptBloco topicos={output.bloco2} accent="e2" label="02 — Narrativa e lição" />
            </div>

            <div className="c-out-section">
              <h4 className="c-out-label">
                {mode === 'registros' ? 'Script — Bloco 03: Registro de Rotina (5–7 min)' : 'Script — Bloco 03: Conclusão prática (3–4 min)'}
              </h4>
              <ScriptBloco topicos={output.bloco3} accent="e3"
                label={mode === 'registros' ? '03 — Bastidores reais' : '03 — Conclusão e CTA'} />
            </div>

            <div className="c-out-section">
              <h4 className="c-out-label">Sugestão visual de thumbnail</h4>
              <div className="c-out-text">{output.thumbnail_visual}</div>
            </div>

            <div className="c-refine-box">
              <label className="c-label">Ajustes — fale ou escreva o que quer mudar</label>
              <div className="c-field-wrap">
                <textarea className="c-textarea short" value={refinamento}
                  onChange={e => setRefinamento(e.target.value)}
                  placeholder="Ex: mais tensão no bloco 1, tom mais leve, CTA diferente..." />
                <button className={`c-mic-btn${activeRec === 'refinamento' ? ' recording' : ''}`}
                  onClick={() => toggleMic('refinamento')} title="Gravar voz">🎤</button>
              </div>
              {activeRec === 'refinamento' && <div className="c-mic-status active">● Gravando... fale agora</div>}
              <button className="c-btn-refine" onClick={refinarPauta} disabled={loading}>
                ✦ Refinar com esses ajustes
              </button>
            </div>

            <div className="c-row">
              <button className="c-btn" onClick={salvarPauta}>💾 Salvar no calendário</button>
              <button className="c-btn-ghost" onClick={gerarScript} disabled={loading}>↻ Gerar novamente</button>
              <button className="c-btn-ghost" onClick={limpar}>Recomeçar</button>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="c-loading visible">
          <div className="c-spinner" />
          {step === 'input' ? 'Gerando opções de título...' : 'Gerando script...'}
        </div>
      )}

    </div>
  )
}

function ScriptBloco({ topicos, accent, label }: { topicos: string[]; accent: string; label: string }) {
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
