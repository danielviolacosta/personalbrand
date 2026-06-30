import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'redis'

// Keys shared across all browsers/users
export const SHARED_KEYS = [
  'pautas',
  'liPosts',
  'liRefs',
  'linkedinConfig',
  'ytCache',
  'channelIds',
  'ytRefs',
]

let client: ReturnType<typeof createClient> | null = null

async function getClient() {
  if (!client || !client.isOpen) {
    client = createClient({ url: process.env.REDIS_URL })
    client.on('error', () => { client = null })
    await client.connect()
  }
  return client
}

// GET /api/store → returns all shared key-value pairs
export async function GET() {
  try {
    const redis = await getClient()
    const values = await redis.mGet(SHARED_KEYS)
    const data: Record<string, unknown> = {}
    SHARED_KEYS.forEach((key, i) => {
      const raw = values[i]
      if (raw != null) {
        try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
      }
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({})
  }
}

// POST /api/store { key, value } → saves one key
export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json()
    if (!SHARED_KEYS.includes(key)) return NextResponse.json({ ok: false, error: 'key not allowed' })
    const redis = await getClient()
    await redis.set(key, JSON.stringify(value))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
