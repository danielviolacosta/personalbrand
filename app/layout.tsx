import type { Metadata } from "next"
import { Bebas_Neue, DM_Sans, DM_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: "Curadoria YouTube — Jornada Empreendedora",
  description: "Sistema de curadoria de conteúdo para canal empreendedor",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn("h-full", bebasNeue.variable, dmSans.variable, dmMono.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
