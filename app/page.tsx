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
import DashboardLinkedIn from '@/components/linkedin/DashboardLinkedIn'
import GeradorPost from '@/components/linkedin/GeradorPost'
import RefsLinkedIn from '@/components/linkedin/RefsLinkedIn'
import CalendarioLinkedIn from '@/components/linkedin/CalendarioLinkedIn'
import ConfigLinkedIn from '@/components/linkedin/ConfigLinkedIn'
import type { Section, Pauta, Platform, LISection, LinkedInPost } from '@/lib/types'

const YT_NAV: { id: Section; label: string }[] = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'gerador',     label: 'Gerar Pauta' },
  { id: 'referencias', label: 'Referências' },
  { id: 'calendario',  label: 'Calendário' },
  { id: 'tendencias',  label: 'Tendências' },
  { id: 'config',      label: 'Config' },
]

const LI_NAV: { id: LISection; label: string }[] = [
  { id: 'li-dashboard',  label: 'Dashboard' },
  { id: 'li-gerador',    label: 'Gerar Post' },
  { id: 'li-refs',       label: 'Referências' },
  { id: 'li-calendario', label: 'Calendário' },
  { id: 'li-config',     label: 'Config' },
]

export default function Home() {
  const [platform, setPlatform]     = useState<Platform>('youtube')
  const [section,  setSection]      = useState<Section>('dashboard')
  const [liSection, setLiSection]   = useState<LISection>('li-dashboard')
  const [pautas,   setPautas]       = useState<Pauta[]>([])
  const [liPosts,  setLiPosts]      = useState<LinkedInPost[]>([])

  useEffect(() => {
    setPautas(getItem('pautas', []))
    setLiPosts(getItem('liPosts', []))
    // Restore last active platform + section
    const savedPlatform = getItem<Platform>('nav_platform', 'youtube')
    const savedSection  = getItem<Section>('nav_section', 'dashboard')
    const savedLiSection = getItem<LISection>('nav_liSection', 'li-dashboard')
    setPlatform(savedPlatform)
    setSection(savedSection)
    setLiSection(savedLiSection)
  }, [])

  function navigate(p: Platform, s?: Section, ls?: LISection) {
    setPlatform(p);  setItem('nav_platform', p)
    if (s)  { setSection(s);   setItem('nav_section',   s) }
    if (ls) { setLiSection(ls); setItem('nav_liSection', ls) }
  }

  const savePautas = useCallback((next: Pauta[]) => {
    setPautas(next)
    setItem('pautas', next)
  }, [])

  const saveLiPosts = useCallback((next: LinkedInPost[]) => {
    setLiPosts(next)
    setItem('liPosts', next)
  }, [])

  function addLiPost(p: LinkedInPost) {
    saveLiPosts([p, ...liPosts])
  }

  return (
    <ToastProvider>
      <div className="curadoria-root">
        <header className="c-header">
          {/* Left: logo */}
          <div className="c-logo">
            CURADORIA <span>personal brand · v2.0</span>
          </div>

          {/* Center: platform switcher */}
          <div className="c-platform-switch">
            <button
              className={`c-platform-btn${platform === 'youtube' ? ' active yt' : ''}`}
              onClick={() => navigate('youtube')}
            >
              <span className="c-platform-icon">▶</span>
              YouTube
            </button>
            <button
              className={`c-platform-btn${platform === 'linkedin' ? ' active li' : ''}`}
              onClick={() => navigate('linkedin')}
            >
              <span className="c-platform-icon">in</span>
              LinkedIn
            </button>
          </div>

          {/* Right: nav */}
          <nav className="c-nav">
            {platform === 'youtube'
              ? YT_NAV.map(item => (
                  <button
                    key={item.id}
                    className={section === item.id ? 'active' : ''}
                    onClick={() => navigate('youtube', item.id)}
                  >
                    {item.label}
                  </button>
                ))
              : LI_NAV.map(item => (
                  <button
                    key={item.id}
                    className={liSection === item.id ? 'active' : ''}
                    onClick={() => navigate('linkedin', undefined, item.id)}
                  >
                    {item.label}
                  </button>
                ))
            }
          </nav>
        </header>

        <main className="c-main">
          {platform === 'youtube' && (
            <>
              {section === 'dashboard'   && <Dashboard pautas={pautas} onNav={s => navigate('youtube', s)} />}
              {section === 'gerador'     && <GeradorPauta pautas={pautas} onSave={savePautas} onNav={s => navigate('youtube', s)} />}
              {section === 'referencias' && <Referencias onNav={s => navigate('youtube', s)} />}
              {section === 'calendario'  && <Calendario pautas={pautas} onSave={savePautas} onNav={s => navigate('youtube', s)} />}
              {section === 'tendencias'  && <Tendencias />}
              {section === 'config'      && <Config />}
            </>
          )}

          {platform === 'linkedin' && (
            <>
              {liSection === 'li-dashboard'  && <DashboardLinkedIn posts={liPosts} onNav={ls => navigate('linkedin', undefined, ls)} />}
              {liSection === 'li-gerador'    && <GeradorPost onSave={addLiPost} posts={liPosts} />}
              {liSection === 'li-refs'       && <RefsLinkedIn />}
              {liSection === 'li-calendario' && <CalendarioLinkedIn posts={liPosts} onSave={saveLiPosts} />}
              {liSection === 'li-config'     && <ConfigLinkedIn />}
            </>
          )}
        </main>
      </div>
    </ToastProvider>
  )
}
