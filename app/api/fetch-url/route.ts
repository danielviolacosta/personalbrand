import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      // 8s timeout
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // 1) Try og:description (LinkedIn, Twitter/X, most modern pages expose this)
    const ogDesc =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{80,})["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']{80,})["'][^>]+property=["']og:description["']/i)

    if (ogDesc?.[1]) {
      return NextResponse.json({ text: decodeEntities(ogDesc[1]), source: 'meta' })
    }

    // 2) Try <article> element
    const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    if (article?.[1]) {
      const text = cleanHtml(article[1]).slice(0, 3500)
      if (text.length > 120) return NextResponse.json({ text, source: 'article' })
    }

    // 3) Try <main>
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (main?.[1]) {
      const text = cleanHtml(main[1]).slice(0, 3500)
      if (text.length > 120) return NextResponse.json({ text, source: 'main' })
    }

    // 4) Fallback: whole body
    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const text = cleanHtml(body?.[1] ?? html).slice(0, 3500)
    return NextResponse.json({ text, source: 'body' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(decodeEntities(''), '') // run entity decode
    .trim()
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
}
