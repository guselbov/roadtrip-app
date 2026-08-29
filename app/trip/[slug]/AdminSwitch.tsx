"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const ADMIN_PWD = "sudouest2026"

export function AdminSwitch({ slug }: { slug: string }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [pwd, setPwd] = useState("")
  const [error, setError] = useState(false)

  function check() {
    if (pwd === ADMIN_PWD) {
      setShowModal(false)
      router.push("/dashboard/" + slug)
    } else {
      setError(true)
    }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={{background: "#141a0e", border: "1px solid #2d4a1e", color: "#7a8a6a", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontWeight: "600", cursor: "pointer", letterSpacing: "0.5px"}}>
        ADMIN
      </button>

      {showModal && (
        <div style={{position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000}} onClick={() => setShowModal(false)}>
          <div style={{background: "#141a0e", borderRadius: "20px", padding: "28px 24px", width: "90%", maxWidth: "360px", border: "1px solid #2d4a1e"}} onClick={e => e.stopPropagation()}>
            <h3 style={{fontSize: "18px", fontWeight: "700", marginBottom: "6px"}}>Accès admin</h3>
            <p style={{color: "#7a8a6a", fontSize: "13px", marginBottom: "20px"}}>Entre le mot de passe pour gérer le trip.</p>
            <input
              type="password"
              placeholder="Mot de passe"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError(false) }}
              onKeyDown={e => e.key === "Enter" && check()}
              style={{marginBottom: "8px", background: "#0e1409", border: error ? "1px solid #c07040" : "1px solid #2d4a1e"}}
            />
            {error && <p style={{color: "#c07040", fontSize: "12px", marginBottom: "8px"}}>Mot de passe incorrect.</p>}
            <div style={{display: "flex", gap: "8px", marginTop: "12px"}}>
              <button onClick={() => setShowModal(false)} style={{flex: 1, background: "#0e1409", border: "1px solid #2d4a1e", color: "#7a8a6a", borderRadius: "12px", padding: "12px", cursor: "pointer", fontSize: "14px"}}>
                Annuler
              </button>
              <button onClick={check} style={{flex: 1, background: "#8fb840", color: "#0e1409", border: "none", borderRadius: "12px", padding: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "700"}}>
                Connexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}