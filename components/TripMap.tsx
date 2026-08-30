"use client"
import { useEffect, useMemo, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { C } from "@/lib/ui"

interface Point {
  id: string
  name: string
  lat: number | null
  lng: number | null
}

type PlacedPoint = Omit<Point, "lat" | "lng"> & { lat: number; lng: number }

/**
 * Leaflet en import dynamique dans un effet : la lib touche `window` au
 * chargement, elle ne peut pas être évaluée pendant le rendu serveur.
 */
export function TripMap({ points, height = 260 }: { points: Point[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  // Mémoïsé : sans ça, un nouveau tableau à chaque rendu relancerait l'effet
  // et recréerait la carte en boucle.
  const placed = useMemo(
    () => points.filter((p): p is PlacedPoint => p.lat != null && p.lng != null),
    [points]
  )

  useEffect(() => {
    if (!ref.current || placed.length === 0) return
    let map: import("leaflet").Map | null = null
    let cancelled = false
    let refit: ReturnType<typeof setTimeout> | undefined

    import("leaflet").then(L => {
      if (cancelled || !ref.current) return
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true })

      // Fond sombre d'Esri : gratuit et sans clé API, contrairement aux tuiles
      // CARTO qui en exigent une depuis 2024.
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "&copy; Esri &mdash; &copy; OpenStreetMap",
          maxZoom: 16,
        }
      ).addTo(map)

      const latlngs = placed.map(p => [p.lat, p.lng] as [number, number])

      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: C.accent, weight: 3, dashArray: "6 6", opacity: 0.8 }).addTo(map)
      }

      placed.forEach((p, i) => {
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:${C.accent};color:${C.bg};width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:2px solid ${C.bg};box-shadow:0 2px 6px rgba(0,0,0,.5)">${i + 1}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        })
          .addTo(map!)
          .bindPopup(p.name)
      })

      // invalidateSize() d'abord : sans ça, fitBounds calcule sur les dimensions
      // que le conteneur avait avant la mise en page, et les points sont coupés.
      const bounds = L.latLngBounds(latlngs).pad(0.15)
      const fit = () => {
        if (cancelled || !map) return
        map.invalidateSize()
        map.fitBounds(bounds, { maxZoom: 11 })
      }
      fit()
      // Second passage différé : certaines polices/images finissent de charger
      // après le premier rendu et décalent la hauteur du conteneur.
      refit = setTimeout(fit, 200)
    })

    return () => {
      cancelled = true
      clearTimeout(refit)
      map?.remove()
      map = null
    }
  }, [placed])

  if (placed.length === 0) return null

  return (
    <div
      ref={ref}
      style={{ height: height + "px", width: "100%", borderRadius: "16px", overflow: "hidden", background: C.card, zIndex: 0 }}
    />
  )
}
