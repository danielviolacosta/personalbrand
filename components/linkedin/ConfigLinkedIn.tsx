'use client'

import { useState, useEffect } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useToast } from '@/lib/toast-context'
import type { SaasContext } from '@/lib/types'

const EMPTY: SaasContext = {
  produto: '', descricao: '', icp: '', diferenciais: '', casos: '', extras: '',
}

const FIELDS: { key: keyof SaasContext; label: string; placeholder: string; tall?: boolean }[] = [
  { key: 'produto',      label: 'Nome do produto',            placeholder: 'Ex: Connecta CRM' },
  { key: 'descricao',    label: 'O que faz (2–3 linhas)',     placeholder: 'Ex: SaaS de relacionamento com cliente via email e WhatsApp — pré-venda, venda e pós-venda automatizados.', tall: true },
  { key: 'icp',          label: 'ICP — perfil do cliente ideal', placeholder: 'Ex: Empresários e gestores de equipes comerciais em empresas B2B que precisam melhorar o relacionamento e retenção de clientes.', tall: true },
  { key: 'diferenciais', label: 'Diferenciais do produto',   placeholder: 'Ex: agendamento de mensagens no WhatsApp, automação de follow-up, pipeline visual...', tall: true },
  { key: 'casos',        label: 'Provas sociais / resultados', placeholder: 'Ex: Cliente X aumentou retenção em 40%; Cliente Y reduziu tempo de follow-up de 3h para 20min por semana.', tall: true },
  { key: 'extras',       label: 'Contexto extra (opcional)',  placeholder: 'Funcionalidades novas, integrações, lançamentos, notícias do produto...', tall: true },
]

export default function ConfigLinkedIn() {
  const { showToast } = useToast()
  const [ctx, setCtx] = useState<SaasContext>(EMPTY)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setCtx(getItem<SaasContext>('linkedinConfig', EMPTY))
  }, [])

  function update(key: keyof SaasContext, val: string) {
    setCtx(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  function salvar() {
    setItem('linkedinConfig', ctx)
    setSaved(true)
    showToast('✓ Contexto do SaaS salvo!')
  }

  return (
    <div>
      <h2>Config LinkedIn</h2>
      <p className="c-subtitle">
        Contexto do seu SaaS — usado em todas as gerações de post para manter coerência de produto e ICP
      </p>

      <div className="c-card">
        {FIELDS.map(({ key, label, placeholder, tall }) => (
          <div key={key}>
            <label className="c-label">{label}</label>
            <textarea
              className={`c-textarea ${tall ? 'tall' : 'short'}`}
              value={ctx[key]}
              onChange={e => update(key, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}

        <div className="c-row">
          <button className="c-btn" onClick={salvar}>
            {saved ? '✓ Salvo' : '💾 Salvar contexto'}
          </button>
        </div>
      </div>
    </div>
  )
}
