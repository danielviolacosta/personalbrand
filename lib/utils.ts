import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function weekLabel(offset = 0): string {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const s = new Date(now)
  s.setDate(now.getDate() - now.getDay() + 1)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${f(s)} – ${f(e)}`
}
