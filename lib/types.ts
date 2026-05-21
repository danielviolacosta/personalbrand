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
