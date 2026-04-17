// ═══════════════════════════════════════════════════════════════
// LA CARTE — Edge Function : Questionnaire Pré-Audit
// Fichier : supabase/functions/tally-preaudit/index.ts
//
// DÉPLOIEMENT :
//   supabase functions deploy tally-preaudit --no-verify-jwt --project-ref eqkpugvccpolkgtnmpxs
//
// URL :
//   https://eqkpugvccpolkgtnmpxs.supabase.co/functions/v1/tally-preaudit
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = 'https://eqkpugvccpolkgtnmpxs.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ── Helpers de conversion ────────────────────────────────────────

function caToNumber(ca: string): number {
  if (!ca || ca.includes('sais')) return 0
  if (ca.includes('70 000') || ca.includes('Plus de 70')) return 85000
  if (ca.includes('40') && ca.includes('70'))             return 55000
  if (ca.includes('20') && ca.includes('40'))             return 30000
  if (ca.includes('10') && ca.includes('20'))             return 15000
  if (ca.includes('Moins de 10'))                         return 7000
  return 0
}

function foodCostPct(fc: string): number {
  if (!fc || fc.includes('sais')) return 0
  if (fc.includes('35') && fc.includes('Plus')) return 38
  if (fc.includes('30') && fc.includes('35'))   return 32
  if (fc.includes('25') && fc.includes('30'))   return 27
  if (fc.includes('Moins de 25'))               return 22
  return 0
}

function masseSalPct(ms: string): number {
  if (!ms || ms.includes('sais')) return 0
  if (ms.includes('40') && ms.includes('Plus')) return 44
  if (ms.includes('35') && ms.includes('40'))   return 37
  if (ms.includes('30') && ms.includes('35'))   return 32
  if (ms.includes('Moins de 30'))               return 26
  return 0
}

function loyerPct(loyer: string): number {
  if (!loyer || loyer.includes('sais')) return 0
  if (loyer.includes('12') && loyer.includes('Plus')) return 14
  if (loyer.includes('8')  && loyer.includes('12'))   return 10
  if (loyer.includes('5')  && loyer.includes('8'))    return 6
  if (loyer.includes('Moins de 5'))                   return 3
  return 0
}

function joursToNumber(jours: string): number {
  if (!jours) return 0
  const match = jours.match(/(\d+)/)
  return match ? parseInt(match[1]) : 0
}

function couvToNumber(couv: string): number {
  if (!couv) return 0
  const n = parseInt(couv)
  return isNaN(n) ? 0 : n
}

// ── Handler principal ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    const body     = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ── Champs reçus depuis Make ─────────────────────────────────
    const {
      // Section 1 — Infos générales
      nom_prenom,
      nom_etablissement,
      email,
      telephone,
      type_etablissement,
      capacite,
      anciennete,
      nb_employes,
      statut_juridique,
      services,            // tableau
      jours_semaine,

      // Section 2 — Finances
      ca_mensuel,
      food_cost,
      masse_salariale,
      loyer_pct,
      vision_marge,
      expert_comptable,
      preoccupation_financiere,

      // Section 3 — Opérations
      logiciel_caisse,
      backoffice,
      fiches_techniques,
      bons_commande,
      nb_fournisseurs,
      frequence_commandes, // tableau
      gaspillage,
      brigade,
      difficulte_cuisine,

      // Section 4 — Digital
      google_my_business,
      note_google,
      nb_avis_google,
      reseaux_sociaux,     // tableau
      frequence_posts,
      plateformes_livraison, // tableau
      reservations,
      site_web,
      experience_client,

      // Section 5 — Objectifs
      problemes_principaux,
      solutions_essayees,
      objectif_6mois,
      raison_consultant,
      deja_accompagne,
      budget_mensuel,
      message_libre,

      // Rapport Notion (généré par Make)
      rapport_notion,
    } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ── Calculs financiers ────────────────────────────────────────
    const caNum   = caToNumber(ca_mensuel)
    const fcPct   = foodCostPct(food_cost)
    const msPct   = masseSalPct(masse_salariale)
    const loyPct  = loyerPct(loyer_pct)
    const jours   = joursToNumber(jours_semaine)
    const couv    = couvToNumber(capacite)

    const achatsFoodEstime    = caNum > 0 && fcPct > 0  ? Math.round(caNum * fcPct / 100)  : 0
    const masseSalEstimee     = caNum > 0 && msPct > 0  ? Math.round(caNum * msPct / 100)  : 0
    const loyerEstime         = caNum > 0 && loyPct > 0 ? Math.round(caNum * loyPct / 100) : 0

    // ── Données structurées à stocker ────────────────────────────
    const tallyData = {
      // Profil
      nom_prenom, nom_etablissement, telephone,
      type_etablissement, capacite, anciennete,
      nb_employes, statut_juridique,
      services: Array.isArray(services) ? services : [services].filter(Boolean),
      jours_semaine,
      // Finances
      ca_mensuel, food_cost, masse_salariale, loyer_pct,
      vision_marge, expert_comptable, preoccupation_financiere,
      // Opérations
      logiciel_caisse, backoffice, fiches_techniques,
      bons_commande, nb_fournisseurs,
      frequence_commandes: Array.isArray(frequence_commandes) ? frequence_commandes : [frequence_commandes].filter(Boolean),
      gaspillage, brigade, difficulte_cuisine,
      // Digital
      google_my_business, note_google, nb_avis_google,
      reseaux_sociaux: Array.isArray(reseaux_sociaux) ? reseaux_sociaux : [reseaux_sociaux].filter(Boolean),
      frequence_posts,
      plateformes_livraison: Array.isArray(plateformes_livraison) ? plateformes_livraison : [plateformes_livraison].filter(Boolean),
      reservations, site_web, experience_client,
      // Objectifs
      problemes_principaux, solutions_essayees,
      objectif_6mois, raison_consultant, deja_accompagne,
      budget_mensuel, message_libre,
      // Calculs
      ca_num: caNum, fc_pct: fcPct, ms_pct: msPct, loy_pct: loyPct,
      achats_food_estime: achatsFoodEstime,
      masse_sal_estimee: masseSalEstimee,
      loyer_estime: loyerEstime,
      // Meta
      received_at: new Date().toISOString(),
    }

    // ── Chercher le client par email ──────────────────────────────
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, name, stage, tasks')
      .ilike('email', email.trim())
      .single()

    if (existingClient) {
      // Client trouvé → mettre à jour
      await supabase.from('clients').update({
        phone:             telephone || existingClient.phone,
        stage:             'questionnaire',
        tally_preaudit:    tallyData,
        rapport_preaudit:  rapport_notion || '',
        next_action:       'Analyser questionnaire pré-audit',
      }).eq('id', existingClient.id)

      // Historique
      await supabase.from('history').insert({
        client_id: existingClient.id,
        action:    'Questionnaire pré-audit reçu',
        details:   `Via Tally · CA estimé: ${ca_mensuel || '—'} · Food cost: ${food_cost || '—'} · Objectif: ${objectif_6mois?.substring(0, 80) || '—'}`,
      })

      // Pré-créer une analyse financière si CA connu
      if (caNum > 0) {
        const now = new Date()
        await supabase.from('financial_analyses').insert({
          client_id:           existingClient.id,
          periode:             `${['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][now.getMonth()]} ${now.getFullYear()} (pré-rempli Tally)`,
          annee:               now.getFullYear(),
          mois:                now.getMonth() + 1,
          ca_total:            caNum,
          ca_food:             Math.round(caNum * 0.75),
          ca_boissons:         Math.round(caNum * 0.25),
          nb_jours:            jours * 4 || 26,
          nb_couverts:         couv * jours * 4 || 0,
          achats_food:         achatsFoodEstime,
          achats_boissons:     Math.round(caNum * 0.25 * 0.22),
          masse_salariale:     masseSalEstimee,
          loyer:               loyerEstime,
          charges_fixes_autres:0,
          charges_variables_pct:0,
          notes:               `Pré-rempli automatiquement depuis questionnaire Tally (${new Date().toLocaleDateString('fr-FR')}). À affiner avec les tickets Z réels.`,
        })
      }

      return new Response(JSON.stringify({
        ok: true, action: 'client_updated', client_id: existingClient.id
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    // ── Client non trouvé → chercher dans le pipeline ─────────────
    const { data: pipelineItem } = await supabase
      .from('cabinet_pipeline')
      .select('id')
      .ilike('email', email.trim())
      .single()

    if (pipelineItem) {
      // Mettre à jour le prospect dans le pipeline
      await supabase.from('cabinet_pipeline').update({
        tally_preaudit:   tallyData,
        rapport_notion:   rapport_notion || '',
        statut:           'contact',
        next_action:      'Questionnaire pré-audit reçu — planifier appel',
        budget_estime:    caNum > 0 ? Math.round(caNum * 0.05) : 0,
      }).eq('id', pipelineItem.id)

      return new Response(JSON.stringify({
        ok: true, action: 'pipeline_updated', pipeline_id: pipelineItem.id,
        message: 'Client non trouvé dans La Carte — prospect pipeline mis à jour. Créez le dossier client manuellement.'
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    // ── Ni client ni prospect → créer dans le pipeline ───────────
    const { data: newProspect } = await supabase.from('cabinet_pipeline').insert({
      nom:            nom_prenom   || nom_etablissement || email,
      entreprise:     nom_etablissement || '',
      email:          email,
      source:         'Questionnaire Pré-Audit Tally',
      formule:        'audit_menu_financier',
      statut:         'contact',
      eligibilite:    'a_evaluer',
      budget_estime:  caNum > 0 ? Math.round(caNum * 0.05) : 0,
      next_action:    'Questionnaire pré-audit reçu — créer dossier client',
      rapport_notion: rapport_notion || '',
      tally_preaudit: tallyData,
      notes:          `Questionnaire pré-audit reçu le ${new Date().toLocaleDateString('fr-FR')}. Aucun dossier client existant avec cet email.`,
    }).select().single()

    return new Response(JSON.stringify({
      ok: true, action: 'prospect_created', pipeline_id: newProspect?.id,
      message: 'Nouveau prospect créé dans le pipeline (aucun dossier client existant).'
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
