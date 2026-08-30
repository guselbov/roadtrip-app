/**
 * Traduit les erreurs Postgres/PostgREST en messages exploitables.
 * Le cas important est la violation de policy : elle signifie presque toujours
 * que la page a ete rendue pour un compte et l'ecriture envoyee avec un autre.
 */
export function dbError(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Une erreur est survenue. Réessaie."

  const m = (e.message ?? "").toLowerCase()

  if (m.includes("row-level security") || e.code === "42501") {
    return "Action refusée : ce compte n'a pas les droits sur ce trip. Tu t'es peut-être connecté avec un autre compte dans un autre onglet — recharge la page."
  }
  if (e.code === "23505") return "C'est déjà enregistré."
  if (m.includes("jwt") || m.includes("expired") || e.code === "PGRST301") {
    return "Ta session a expiré. Recharge la page pour te reconnecter."
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Connexion perdue. Vérifie ta connexion et réessaie."
  }
  return e.message ?? "Une erreur est survenue. Réessaie."
}
