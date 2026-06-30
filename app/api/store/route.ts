import { NextRequest, NextResponse } from 'next/server'

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// Keys that are shared across all users/browsers
export const SHARED_KEYS = [
  'pautas',
  'liPosts',
  'liRefs',
  'linkedinConfig',
  'ytCache',
  'channelIds',
  'ytRefs',
]

async function redisCmd(command: unknown[]) {
  const res = await fetch(REDIS_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  return res.json()
}

// GET /api/store → returns all shared key-value pairs
export async function GET() {
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({})

  try {
    const { result } = await redisCmd(['MGET', ...SHARED_KEYS])
    const data: Record<string, unknown> = {}
    SHARED_KEYS.forEach((key, i) => {
      const raw = result?.[i]
      if (raw != null) {
        try { data[key] = JSON.parse(raw as string) } catch { data[key] = raw }
      }
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({})
  }
}

// POST /api/store { key, value } → saves one key
export async function POST(req: NextRequest) {
  if (!REDIS_URL || !REDIS_TOKEN) return NextResponse.json({ ok: false })

  try {
    const { key, value } = await req.json()
    if (!SHARED_KEYS.includes(key)) return NextResponse.json({ ok: false, error: 'key not allowed' })
    await redisCmd(['SET', key, JSON.stringify(value)])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
