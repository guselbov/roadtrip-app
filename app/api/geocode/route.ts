import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Proxy Nominatim. Passer par le serveur permet d'envoyer le User-Agent exigé
 * par leur politique d'usage (le navigateur interdit de le définir) et évite
 * d'exposer l'app à un abus depuis le client.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const q = new URL(request.url).searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=" +
    encodeURIComponent(q)

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RoadTripApp/1.0 (https://roadtrip-app-vercel.vercel.app)",
        "Accept-Language": "fr",
      },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return NextResponse.json({ results: [] })

    const raw = (await res.json()) as Array<{
      display_name: string
      name?: string
      lat: string
      lon: string
    }>

    return NextResponse.json({
      results: raw.map(r => ({
        name: r.name || r.display_name.split(",")[0],
        label: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })),
    })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
