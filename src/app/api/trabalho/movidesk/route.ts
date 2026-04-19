import { NextRequest, NextResponse } from 'next/server'

const MOVIDESK_BASE = 'https://api.movidesk.com/public/v1'

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-movidesk-token') ?? req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token não configurado' }, { status: 400 })

  try {
    const qs = new URLSearchParams({
      token,
      '$top': '200',
      '$orderby': 'lastUpdate desc',
    })

    const res = await fetch(`${MOVIDESK_BASE}/tickets?${qs}`, { cache: 'no-store' })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Movidesk: ${res.status} — ${text.slice(0, 200)}` }, { status: res.status })
    }

    const raw = await res.json()
    const all: any[] = Array.isArray(raw) ? raw : (raw.items ?? [])

    // Filter out Solved (5) and Closed (6)
    const open = all.filter(t => ![5, 6].includes(t.status?.id))

    const tickets = open.map(t => {
      // Find last non-system action
      const actions: any[] = (t.actions ?? [])
        .filter((a: any) => a.type === 1 || a.type === 2)
        .sort((a: any, b: any) => +new Date(b.createdDate) - +new Date(a.createdDate))

      const last = actions[0] ?? null
      const lastResponder: 'agent' | 'client' | 'none' =
        !last ? 'none' : last.type === 2 ? 'client' : 'agent'

      const daysOpen = Math.floor(
        (Date.now() - new Date(t.createdDate).getTime()) / 86400000
      )

      const clientName =
        t.clients?.[0]?.person?.businessName ||
        t.clients?.[0]?.person?.fullName ||
        t.clients?.[0]?.organization?.businessName ||
        '—'

      const lastActionPreview = last?.description
        ? last.description.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().slice(0, 160)
        : null

      return {
        id: t.id,
        subject: t.subject ?? '(sem título)',
        createdDate: t.createdDate,
        lastUpdate: t.lastUpdate,
        statusId: t.status?.id ?? 0,
        statusName: t.status?.name ?? '—',
        urgencyId: t.urgency?.id ?? 0,
        urgencyName: t.urgency?.name ?? '—',
        clientName,
        lastResponder,
        lastActionDate: last?.createdDate ?? null,
        lastActionPreview,
        daysOpen,
        url: `https://app.movidesk.com/Ticket/Edit/${t.id}`,
      }
    })

    return NextResponse.json({ tickets })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
