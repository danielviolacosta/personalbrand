'use client'

import { useState, useEffect } from 'react'
import { getItem, setItem } from '@/lib/storage'
import { useToast } from '@/lib/toast-context'
import type { ChannelIds } from '@/lib/types'

const EMPTY_IDS: ChannelIds = { danieldalen: '', daniellima: '', marclou: '', extra1: '' }

export default function Config() {
  const { showToast } = useToast()
  const [apiKey, setApiKey] = useState('')
  const [apiStatus, setApiStatus] = useState('')
  const [apiStatusColor, setApiStatusColor] = useState('var(--c-muted)')
  const [ids, setIds] = useState<ChannelIds>(EMPTY_IDS)

  useEffect(() => {
    setApiKey(getItem('yt_api_key', ''))
    setIds(getItem('channelIds', EMPTY_IDS))
  }, [])

  function salvarApiKey() {
    if (!apiKey.trim()) return
    setItem('yt_api_key', apiKey.trim())
    showToast('✓ Chave salva!')
  }

  async function testarApi() {
    const key = apiKey.trim() || getItem('yt_api_key', '')
    if (!key) { showToast('Cole a chave primeiro.'); return }
    setApiStatus('testando...')
    setApiStatusColor('var(--c-muted)')
    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${key}`
      )
      const d = await r.json()
      if (d.error) throw new Error(d.error.message)
      setApiStatus('✓ Conexão OK')
      setApiStatusColor('var(--c-green)')
      setItem('yt_api_key', key)
    } catch (e) {
      setApiStatus('✗ Erro: ' + (e instanceof Error ? e.message : 'Erro'))
      setApiStatusColor('var(--c-accent2)')
    }
  }

  function salvarIds() {
    setItem('channelIds', ids)
    showToast('✓ IDs salvos!')
  }

  const channelFields = [
    ['danieldalen', 'Daniel Dalen'],
    ['daniellima', 'Daniel Lima'],
    ['marclou', 'Marc Lou'],
    ['extra1', 'Canal extra'],
  ] as const

  return (
    <div>
      <h2>Configurações</h2>
      <p className="c-subtitle">YouTube Data API · preferências do canal</p>

      <div className="c-card">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>🔑 YouTube Data API v3</div>
        <div className="c-api-instructions">
          <strong>Como criar sua chave gratuita:</strong>
          <br />
          1. Acesse <strong style={{ color: 'var(--c-accent)' }}>console.cloud.google.com</strong>
          <br />
          2. Crie um projeto (ou selecione um existente)
          <br />
          3. APIs &amp; Services → Library → pesquise &quot;YouTube Data API v3&quot; → Ativar
          <br />
          4. Credentials → Create Credentials → API Key
          <br />
          5. Cole abaixo ↓
        </div>
        <label className="c-label">Sua chave de API do YouTube</label>
        <input
          type="password"
          className="c-input"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="AIza..."
          autoComplete="off"
        />
        <div className="c-row">
          <button className="c-btn" onClick={salvarApiKey}>Salvar chave</button>
          <button className="c-btn-ghost" onClick={testarApi}>Testar conexão</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: apiStatusColor }}>
            {apiStatus}
          </span>
        </div>
      </div>

      <div className="c-card">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
          📺 IDs dos canais de referência
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--c-muted)',
            marginBottom: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Canal YouTube → Sobre → Compartilhar canal → Copiar ID do canal
        </div>
        <div className="c-grid-2">
          {channelFields.map(([key, label]) => (
            <div key={key}>
              <label className="c-label">{label}</label>
              <input
                className="c-input"
                type="text"
                value={ids[key]}
                onChange={e => setIds(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder="UCxxxxxx..."
              />
            </div>
          ))}
        </div>
        <div className="c-row">
          <button className="c-btn" onClick={salvarIds}>Salvar IDs</button>
        </div>
      </div>
    </div>
  )
}
