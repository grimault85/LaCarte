import { STAGES, FORMULAS, PRIORITY } from './constants';

export const fmtEur = n =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtSize = b => b < 1048576 ? `${(b / 1024).toFixed(0)} Ko` : `${(b / 1048576).toFixed(1)} Mo`;

export function parseActionDate(str) {
  if (!str) return null;
  const MONTHS = { jan: 0, 'fév': 1, mar: 2, avr: 3, mai: 4, juin: 5, juil: 6, 'aoû': 7, sep: 8, oct: 9, nov: 10, 'déc': 11 };
  const m = str.match(/(\d{1,2})\s+(jan|fév|mar|avr|mai|juin|juil|aoû|sep|oct|nov|déc)\.?/i);
  if (!m) return null;
  const d = new Date(new Date().getFullYear(), MONTHS[m[2].toLowerCase()], parseInt(m[1]));
  d.setHours(0, 0, 0, 0);
  return d;
}

export const isOverdue = na => { const d = parseActionDate(na); if (!d) return false; const n = new Date(); n.setHours(0, 0, 0, 0); return d < n; };
export const stageOf = key => STAGES.find(s => s.key === key) || STAGES[0];
export const prioOf = key => PRIORITY[key] || PRIORITY.medium;
export const formulaOf = key => FORMULAS.find(f => f.key === key) || FORMULAS[0];
