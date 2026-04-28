// ── Étapes pipeline ──────────────────────────────────────────────
export const STAGES = [
  { key: 'prospection', label: 'Prospection', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  { key: 'questionnaire', label: 'Questionnaire', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'audit', label: 'Audit', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  { key: 'cloture', label: 'Clôture', color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
];

// ── Formules ─────────────────────────────────────────────────────
export const FORMULAS = [
  { key: 'audit_menu', label: 'Audit Menu', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  { key: 'audit_menu_financier', label: 'Audit Menu & Financier', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  { key: 'suivi_mensuel', label: 'Suivi Mensuel', color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
];

export const formulaOf = key => FORMULAS.find(f => f.key === key) || FORMULAS[0];

// ── Tâches par formule et par étape ──────────────────────────────
export const FORMULA_TASKS = {
  audit_menu: {
    prospection: ['Premier contact', "Présentation formule Audit Menu", 'Envoi devis', 'Signature contrat', 'Acompte reçu'],
    questionnaire: ['Envoi questionnaire restaurant', 'Réception carte / menu actuel', 'Réception photos plats', 'Analyse préliminaire', 'Validation des données'],
    audit: ['Analyse complète de la carte', 'Étude des prix et positionnement', 'Cohérence et saisonnalité', 'Lisibilité et présentation', 'Calcul des marges par plat', 'Rédaction recommandations'],
    cloture: ['Rédaction rapport Audit Menu', 'Envoi rapport au client', 'Présentation de restitution', 'Facturation solde', 'Archivage dossier'],
  },
  audit_menu_financier: {
    prospection: ['Premier contact', 'Présentation formule complète', 'Envoi devis', 'Signature contrat', 'Acompte reçu'],
    questionnaire: ['Envoi questionnaire restaurant', 'Réception menu et tarifs', 'Réception bilans N-1', 'Réception données RH', 'Validation documents comptables'],
    audit: ['Analyse complète de la carte', 'Étude des prix et marges', 'Calcul ratio food cost', 'Analyse masse salariale', 'Charges fixes vs variables', 'Seuil de rentabilité', 'Rédaction recommandations globales'],
    cloture: ['Rédaction rapport menu', 'Rédaction rapport financier', 'Envoi rapport complet', 'Présentation de restitution', 'Facturation solde', 'Archivage dossier'],
  },
  suivi_mensuel: {
    prospection: ['Premier contact', 'Présentation formule suivi', 'Envoi contrat mensuel', 'Signature', 'Mise en place indicateurs'],
    questionnaire: ['Envoi questionnaire du mois', 'Réception CA du mois', 'Réception données coûts', 'Réception données RH', 'Validation indicateurs'],
    audit: ['Point mensuel client', 'Analyse indicateurs vs mois précédent', 'Suivi actions recommandées', 'Identification nouveaux axes', 'Mise à jour tableau de bord', 'Rédaction compte-rendu mensuel'],
    cloture: ['Envoi compte-rendu mensuel', 'Validation client', 'Facturation mensuelle', 'Planification mois suivant'],
  },
};

// Fallback pour les anciens dossiers sans formule
export const DEFAULT_TASKS = {
  prospection: ['Premier contact', 'Analyse du besoin', 'Proposition commerciale', 'Négociation', 'Accord client'],
  questionnaire: ['Envoi questionnaire', 'Relance J+7', 'Réception des réponses', 'Analyse des réponses', 'Validation'],
  audit: ["Réunion d'ouverture", 'Collecte des documents', 'Tests de conformité', 'Rédaction rapport', 'Revue interne'],
  cloture: ['Présentation rapport', 'Réponse aux observations', 'Facturation', 'Archivage dossier'],
};

export const getTasksForFormula = formula => FORMULA_TASKS[formula] || DEFAULT_TASKS;

export const PRIORITY = {
  high: { label: 'Haute', color: '#dc2626', bg: '#fee2e2' },
  medium: { label: 'Moyenne', color: '#d97706', bg: '#fef3c7' },
  low: { label: 'Basse', color: '#6b7280', bg: '#f3f4f6' },
};

// ── Mois ─────────────────────────────────────────────────────────
export const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
