export type Section = 'dashboard' | 'gerador' | 'referencias' | 'calendario' | 'tendencias' | 'config'

export interface Pauta {
  titulo: string
  bloco1: string[]
  bloco2: string[]
  bloco3: string[]
  semana: string
  status: 'planejado' | 'publicado'
  data: string
}

export interface Canal {
  nome: string
  handle: string
  notas: string
}

export interface ChannelIds {
  danieldalen: string
  daniellima: string
  marclou: string
  extra1: string
}

export interface YtVideo {
  id: string
  title: string
  thumb: string
  published: string
  views: number
  likes: number
}

export type YtCache = Record<string, YtVideo[]>

// ─── LinkedIn ────────────────────────────────────────────────────────────────
export type Platform = 'youtube' | 'linkedin'

export type LISection =
  | 'li-dashboard'
  | 'li-gerador'
  | 'li-refs'
  | 'li-calendario'
  | 'li-config'

export type PostTipo =
  | 'noticia'
  | 'produto'
  | 'prova_social'
  | 'dica'
  | 'personal'
  | 'video_demo'

export interface LinkedInPost {
  id: string           // timestamp string, used as unique key
  conteudo: string     // full post text
  tipo: PostTipo
  status: 'rascunho' | 'publicado'
  semana: string       // week label "18/05 – 24/05"
  data: string         // ISO date
}

export interface RefPostLinkedIn {
  id: string
  autor: string
  conteudo: string
  tipo: PostTipo
  engajamento: string  // "1.2k reações", "340 comentários"
  nota: string         // why it worked
  imagem?: string      // base64 compressed JPEG (screenshot)
}

export interface SaasContext {
  produto: string       // product name
  descricao: string     // what it does
  icp: string           // ideal customer profile
  diferenciais: string  // differentiators
  casos: string         // proof / case studies
  extras: string        // anything else
}
