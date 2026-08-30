import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ResetForm } from "./ResetForm"
import { container, page } from "@/lib/ui"

export default async function ResetPasswordPage() {
  // On n'arrive ici qu'avec la session ouverte par /auth/callback.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth?error=lien_expire")

  return (
    <main style={{ ...page, display: "flex", alignItems: "center" }}>
      <div style={{ ...container, width: "100%" }}>
        <div style={{ fontSize: "40px", marginBottom: "20px" }}>🔑</div>
        <ResetForm />
      </div>
    </main>
  )
}
