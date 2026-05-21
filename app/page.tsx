'use client'

import { useState, useEffect, useCallback } from 'react'
import { ToastProvider } from '@/lib/toast-context'
import { getItem, setItem } from '@/lib/storage'
import Dashboard from '@/components/Dashboard'
import GeradorPauta from '@/components/GeradorPauta'
import Referencias from '@/components/Referencias'
import Calendario from '@/components/Calendario'
import Tendencias from '@/components/Tendencias'
import Config from '@/components/Config'
import type { Section, Pauta } from '@/lib/types'

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'gerador',     label: 'Gerar Pauta' },
  { id: 'referencias', label: 'Referências' },
  { id: 'calendario',  label: 'Calendário' },
  { id: 'tendencias',  label: 'Tendências' },
  { id: 'config',      label: 'Config' },
]

export default function Home() {
  const [section, setSection] = useState<Section>('dashboard')
  const [pautas, setPautas] = useState<Pauta[]>([])

  useEffect(() => {
    setPautas(getItem('pautas', []))
  }, [])

  const savePautas = useCallback((next: Pauta[]) => {
    setPautas(next)
    setItem('pautas', next)
  }, [])

  return (
    <ToastProvider>
      <div className="curadoria-root">
        <header className="c-header">
          <div className="c-logo">
            CURADORIA <span>canal empreendedor · v2.0</span>
          </div>
          <nav className="c-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={section === item.id ? 'active' : ''}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="c-main">
          {section === 'dashboard'   && <Dashboard pautas={pautas} onNav={setSection} />}
          {section === 'gerador'     && <GeradorPauta pautas={pautas} onSave={savePautas} onNav={setSection} />}
          {section === 'referencias' && <Referencias onNav={setSection} />}
          {section === 'calendario'  && <Calendario pautas={pautas} onSave={savePautas} onNav={setSection} />}
          {section === 'tendencias'  && <Tendencias />}
          {section === 'config'      && <Config />}
        </main>
      </div>
    </ToastProvider>
  )
}
