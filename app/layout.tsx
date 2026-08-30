import type { Metadata, Viewport } from "next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RoadTrip — organise ton road trip entre potes",
  description:
    "Crée ton trip, envoie le code à tes potes, et laisse l'app calculer où et quand vous vous croisez.",
}

export const viewport: Viewport = {
  themeColor: "#0e1409",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
