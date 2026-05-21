'use client'

import { useState, useEffect } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useToast } from '@/lib/toast-context'
import type { RefPostLinkedIn, PostTipo } from '@/lib/types'

const TIPOS: { id: PostTipo; label: string }[] = [
  { id: 'noticia',     label: 'Notícia/Tendência' },
  { id: 'produto',     label: 'Produto/Feature' },
  { id: 'prova_social',label: 'Prova Social' },
  { id: 'dica',        label: 'Dica Prática' },
  { id: 'personal',    label: 'Personal Brand' },
  { id: 'video_demo',  label: 'Vídeo/Demo' },
]

const TIPO_COLOR: Record<PostTipo, string> = {
  noticia:     'li-t-noticia',
  produto:     'li-t-produto',
  prova_social:'li-t-prova',
  dica:        'li-t-dica',
  personal:    'li-t-personal',
  video_demo:  'li-t-video',
}

export default function RefsLinkedIn() {
  const { showToast } = useToast()
  const [refs, setRefs] = useState<RefPostLinkedIn[]>([])
  const [form, setForm] = useState({ autor: '', conteudo: '', tipo: 'dica' as PostTipo, engajamento: '', nota: '' })
  const [adding, setAdding] = useState(false)

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
    setForm({ autor: '', conteudo: '', tipo: 'dica', engajamento: '', nota: '' })
    setAdding(false)
    showToast('✓ Referência adicionada!')
  }

  function deletar(id: string) {
    if (!confirm('Remover esta referência?')) return
    save(refs.filter(r => r.id !== id))
  }

  return (
    <div>
      <h2>Referências LinkedIn</h2>
      <p className="c-subtitle">
        Posts de outros criadores que funcionaram — usados como base de estilo na geração
      </p>

      <div className="c-row" style={{ marginBottom: 16 }}>
        <button className="c-btn" onClick={() => setAdding(v => !v)}>
          {adding ? '✕ Cancelar' : '+ Adicionar referência'}
        </button>
      </div>

      {adding && (
        <div className="c-card" style={{ marginBottom: 20 }}>
          <div>
            <label className="c-label">Autor / perfil</label>
            <input
              className="c-input"
              value={form.autor}
              onChange={e => setForm(f => ({ ...f, autor: e.target.value }))}
              placeholder="Ex: @pedroserrano, Thiago Nigro..."
            />
          </div>
          <div>
            <label className="c-label">Texto completo do post</label>
            <textarea
              className="c-textarea tall"
              value={form.conteudo}
              onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
              placeholder="Cole o post aqui..."
            />
          </div>
          <div className="c-row" style={{ gap: 8, flexWrap: 'wrap' }}>
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
          <div>
            <label className="c-label">Engajamento (opcional)</label>
            <input
              className="c-input"
              value={form.engajamento}
              onChange={e => setForm(f => ({ ...f, engajamento: e.target.value }))}
              placeholder="Ex: 2.3k reações, 180 comentários"
            />
          </div>
          <div>
            <label className="c-label">Por que funcionou</label>
            <textarea
              className="c-textarea short"
              value={form.nota}
              onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
              placeholder="Ex: hook direto com número, contraintuitivo, prova social com dado específico..."
            />
          </div>
          <button className="c-btn" onClick={adicionar}>Salvar referência</button>
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
