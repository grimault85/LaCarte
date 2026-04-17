// ═══════════════════════════════════════════════════════════════
// LA CARTE — Supabase Edge Function
// Fichier : supabase/functions/tally-webhook/index.ts
//
// DÉPLOIEMENT :
//   supabase functions deploy tally-webhook --no-verify-jwt
//
// URL générée :
//   https://eqkpugvccpolkgtnmpxs.supabase.co/functions/v1/tally-webhook
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://eqkpugvccpolkgtnmpxs.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ── Logique d'éligibilité ─────────────────────────────────────────
function calculerEligibilite(data: any): { eligibilite: string; score: number } {
  let score = 0

  // Budget
  const budget = data.budget ?? ''
  if (budget.includes('500') && budget.includes('1')) score += 1      // 500-1000€
  else if (budget.includes('1 000') || budget.includes('>'))  score += 2  // > 1000€
  else if (budget.includes('300'))  score += 0                            // 300-500€
  else if (budget.includes('300') && budget.includes('moins')) score -= 2 // < 300€
  else if (budget.includes('ne sais')) score += 0

  // Données de ventes
  const donnees = data.donnees_ventes ?? ''
  if (donnees.includes('complet'))  score += 2
  else if (donnees.includes('partiel')) score += 1
  else if (donnees.includes('Non'))     score -= 1
  else if (donnees.includes('sais'))    score -= 1

  // Distanciel
  const distanciel = data.distanciel ?? ''
  if (distanciel === 'Oui')              score += 2
  else if (distanciel.includes('vraiment')) score += 0
  else if (distanciel === 'Non')           score -= 1

  // Ancienneté (bonus si établissement stable)
  const anciennete = data.anciennete ?? ''
  if (anciennete.includes('3 ans'))       score += 1
  else if (anciennete.includes('1 à 3'))  score += 0
  else if (anciennete.includes('3 à 12')) score -= 0
  else if (anciennete.includes('3 mois')) score -= 1
  else if (anciennete.includes('Projet')) score -= 2

  const eligibilite = score >= 3 ? 'eligible' : score >= 0 ? 'a_evaluer' : 'non_eligible'
  return { eligibilite, score }
}

// ── Budget → chiffre estimé ───────────────────────────────────────
function budgetEstime(budget: string): number {
  if (!budget) return 0
  if (budget.includes('1 000') || budget.includes('Plus')) return 1200
  if (budget.includes('500') && budget.includes('1 000')) return 750
  if (budget.includes('300') && budget.includes('500'))   return 400
  if (budget.includes('300'))                              return 200
  return 0
}

// ── Handler principal ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ── Parser les données envoyées par Make ─────────────────────
    // Make envoie un JSON structuré à partir des réponses Tally
    const {
      etablissement,       // Nom de l'établissement
      contact,             // "Prénom NOM email@..." (champ libre)
      type_etablissement,
      anciennete,
      carte_menu,
      decideur,
      donnees_ventes,
      budget,
      distanciel,
      rapport_notion,      // Texte brut du rapport généré par Make/Notion
    } = body

    // Extraire prénom/nom/email depuis le champ texte libre
    const emailMatch = contact?.match(/[\w.-]+@[\w.-]+\.\w+/)
    const email      = emailMatch?.[0] ?? ''
    const nomContact = contact?.replace(email, '').trim().replace(/\s+/g, ' ') ?? contact ?? ''

    // Calculer éligibilité
    const { eligibilite, score } = calculerEligibilite({ budget, donnees_ventes, distanciel, anciennete })

    // Statut pipeline selon éligibilité
    const statut = eligibilite === 'eligible'     ? 'contact'
                 : eligibilite === 'a_evaluer'    ? 'a_evaluer'
                 : 'non_eligible'

    // Formule recommandée selon budget
    let formule = 'audit_menu'
    if (budget?.includes('1 000') || budget?.includes('Plus')) formule = 'audit_menu_financier'
    else if (budget?.includes('300') && budget?.includes('500')) formule = 'audit_menu'
    // Retainer uniquement si le client est déjà suivi — pas à l'éligibilité

    // ── Vérifier si le prospect existe déjà (par email) ──────────
    let existingId = null
    if (email) {
      const { data: existing } = await supabase
        .from('cabinet_pipeline')
        .select('id')
        .eq('email', email)
        .single()
      existingId = existing?.id ?? null
    }

    const row = {
      nom:            nomContact || etablissement || 'Prospect Tally',
      entreprise:     etablissement ?? '',
      email:          email,
      source:         'Questionnaire Tally',
      formule,
      statut,
      eligibilite,
      budget_estime:  budgetEstime(budget),
      rapport_notion: rapport_notion ?? '',
      tally_data:     JSON.stringify({
        type_etablissement, anciennete, carte_menu,
        decideur, donnees_ventes, budget, distanciel
      }),
      next_action: eligibilite === 'eligible'
        ? 'Envoyer devis'
        : eligibilite === 'a_evaluer'
        ? 'Appel découverte 15 min'
        : 'Archiver ou orienter',
    }

    if (existingId) {
      await supabase.from('cabinet_pipeline').update(row).eq('id', existingId)
    } else {
      await supabase.from('cabinet_pipeline').insert(row)
    }

    return new Response(JSON.stringify({ ok: true, eligibilite, score }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
