/**
 * Pricing is CRM-driven. No commercial tariff is hardcoded in the client portal.
 * The six official formulas are read from public.offres through subscriber-lookup.
 */

export interface PricingSchedule {
  depot_initial: number;
  an1_mensuel: number;
  an1_duree_mois: number;
  an2_mensuel: number;
  an2_duree_mois: number;
  an3_mensuel: number;
  an3_duree_mois: number;
  total_par_ha: number;
  duree_totale_mois: number;
  cash_price: number;
}

export interface OfferPricingSource {
  code?: string | null;
  famille_offre?: string | null;
  formule_code?: string | null;
  formule_nom?: string | null;
  montant_da_par_ha?: number | null;
  montant_depot_initial_par_ha?: number | null;
  contribution_mensuelle_par_ha?: number | null;
  montant_total_par_ha?: number | null;
  montant_cash_par_ha?: number | null;
  duree_paiement_mois?: number | null;
  tranches_paiement?: unknown;
}

export interface CurrentRate {
  annee: number;
  label: string;
  mensuel_par_ha: number;
  jour_par_ha: number;
  semaine_par_ha: number;
  trimestre_par_ha: number;
  semestre_par_ha: number;
  annuel_par_ha: number;
  mois_restants_dans_annee: number;
  mois_ecoules: number;
  schedule: PricingSchedule;
}

export interface PaymentBreakdownSegment {
  label: string;
  annee: number;
  jours: number;
  moisEquivalent: number;
  mensuel_par_ha: number;
  montant: number;
}

export interface ProgressivePaymentResult {
  montant: number;
  totalJours: number;
  segments: PaymentBreakdownSegment[];
}

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const resolveInitial = (offre?: OfferPricingSource | null) => {
  const v = offre?.montant_depot_initial_par_ha ?? offre?.montant_da_par_ha;
  return v === null || v === undefined ? 0 : toNumber(v);
};

type Tranche = {
  annee: number;
  mois: number;
  mensualite_par_ha: number;
  mois_debut?: number;
  mois_fin?: number;
  type?: string;
  montant?: number;
};

function getTranches(offre?: OfferPricingSource | null): Tranche[] {
  const raw = Array.isArray(offre?.tranches_paiement) ? offre!.tranches_paiement as any[] : [];
  return raw.map((t) => ({
    annee: toNumber(t?.annee, 0),
    mois: Math.max(0, toNumber(t?.mois, 0)),
    mensualite_par_ha: Math.max(0, toNumber(t?.mensualite_par_ha, 0)),
    mois_debut: toNumber(t?.mois_debut, 0),
    mois_fin: toNumber(t?.mois_fin, 0),
    type: String(t?.type || ""),
    montant: Math.max(0, toNumber(t?.montant, 0)),
  }));
}

export function getPricingScheduleFromOffer(offre?: OfferPricingSource | null): PricingSchedule | null {
  if (!offre) return null;
  const tranches = getTranches(offre);
  const initial = resolveInitial(offre);

  // Only recurring payment tranches are used as progressive rates.
  const recurring = tranches.filter((t) => t.mois > 0 && t.mensualite_par_ha > 0 && t.type !== "paiement_initial");
  if (!recurring.length) {
    const monthly = toNumber(offre.contribution_mensuelle_par_ha);
    const duration = toNumber(offre.duree_paiement_mois);
    if (monthly <= 0 || duration <= 0) return null;
    return {
      depot_initial: initial,
      an1_mensuel: monthly,
      an1_duree_mois: Math.min(12, duration),
      an2_mensuel: monthly,
      an2_duree_mois: Math.min(12, Math.max(0, duration - 12)),
      an3_mensuel: monthly,
      an3_duree_mois: Math.max(0, duration - 24),
      total_par_ha: toNumber(offre.montant_total_par_ha, initial + monthly * duration),
      duree_totale_mois: duration,
      cash_price: toNumber(offre.montant_cash_par_ha, offre.montant_total_par_ha ?? 0),
    };
  }

  const years = [recurring[0], recurring[1] || recurring[0], recurring[2] || recurring[1] || recurring[0]];
  const duration = toNumber(offre.duree_paiement_mois, recurring.reduce((s, t) => s + t.mois, 0));
  const computedTotal = initial + recurring.reduce((s, t) => s + t.mensualite_par_ha * t.mois, 0);

  return {
    depot_initial: initial,
    an1_mensuel: years[0].mensualite_par_ha,
    an1_duree_mois: years[0].mois,
    an2_mensuel: years[1].mensualite_par_ha,
    an2_duree_mois: years[1].mois,
    an3_mensuel: years[2].mensualite_par_ha,
    an3_duree_mois: years[2].mois,
    total_par_ha: toNumber(offre.montant_total_par_ha, computedTotal),
    duree_totale_mois: duration,
    cash_price: toNumber(offre.montant_cash_par_ha, toNumber(offre.montant_total_par_ha, computedTotal)),
  };
}

function getElapsedDays(dateActivation?: string | null) {
  if (!dateActivation) return 0;
  const t = new Date(dateActivation).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 0;
}

function getElapsedMonths(dateActivation?: string | null) {
  if (!dateActivation) return 0;
  const d = new Date(dateActivation);
  if (Number.isNaN(d.getTime())) return 0;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth());
}

function getScheduleTranches(schedule: PricingSchedule) {
  return [
    { annee: 1, label: "An 1", mois: schedule.an1_duree_mois, mensuel: schedule.an1_mensuel },
    { annee: 2, label: "An 2", mois: schedule.an2_duree_mois, mensuel: schedule.an2_mensuel },
    { annee: 3, label: "An 3", mois: schedule.an3_duree_mois, mensuel: schedule.an3_mensuel },
  ].filter((t) => t.mois > 0 && t.mensuel > 0);
}

function getCurrentRateFromSchedule(schedule: PricingSchedule | null, dateActivation?: string | null): CurrentRate | null {
  if (!schedule) return null;
  const elapsed = getElapsedMonths(dateActivation);
  const rows = getScheduleTranches(schedule);
  let cursor = elapsed;
  let selected = rows[rows.length - 1];
  let index = rows.length - 1;
  for (let i = 0; i < rows.length; i++) {
    if (cursor < rows[i].mois) {
      selected = rows[i];
      index = i;
      break;
    }
    cursor -= rows[i].mois;
  }
  if (!selected) return null;
  const monthsBefore = rows.slice(0, index).reduce((s, t) => s + t.mois, 0);
  const monthsRemaining = Math.max(0, selected.mois - Math.max(0, elapsed - monthsBefore));
  return {
    annee: selected.annee,
    label: selected.label,
    mensuel_par_ha: selected.mensuel,
    jour_par_ha: Math.round(selected.mensuel / 30),
    semaine_par_ha: Math.round(selected.mensuel / 4),
    trimestre_par_ha: selected.mensuel * 3,
    semestre_par_ha: selected.mensuel * 6,
    annuel_par_ha: selected.mensuel * 12,
    mois_restants_dans_annee: monthsRemaining,
    mois_ecoules: elapsed,
    schedule,
  };
}

export function getCurrentRateFromOffer(offre: OfferPricingSource | null | undefined, dateActivation?: string | null) {
  return getCurrentRateFromSchedule(getPricingScheduleFromOffer(offre), dateActivation);
}

export function getFullTariffGridFromOffer(offre: OfferPricingSource | null | undefined) {
  const schedule = getPricingScheduleFromOffer(offre);
  if (!schedule) return null;
  return getScheduleTranches(schedule).map((t) => ({
    label: `${t.label} — ${t.mois} mois`,
    mensuel: t.mensuel,
    duree: t.mois,
    total: t.mensuel * t.mois,
  }));
}

export function periodToDays(periodType: "jour" | "semaine" | "mois" | "trimestre" | "semestre" | "annee", count: number) {
  const n = Math.max(1, Math.floor(Number(count) || 1));
  return n * ({ jour: 1, semaine: 7, mois: 30, trimestre: 90, semestre: 180, annee: 360 } as const)[periodType];
}

export function calculateProgressiveAmountByDays(offre: OfferPricingSource | null | undefined, startDayOffset: number, daysCount: number, superficieHa: number): ProgressivePaymentResult {
  const schedule = getPricingScheduleFromOffer(offre);
  const sup = Math.max(0, Number(superficieHa) || 0);
  let remaining = Math.max(0, Math.floor(Number(daysCount) || 0));
  let cursor = Math.max(0, Math.floor(Number(startDayOffset) || 0));
  if (!schedule || sup <= 0 || remaining <= 0) return { montant: 0, totalJours: 0, segments: [] };

  const segments: PaymentBreakdownSegment[] = [];
  for (const t of getScheduleTranches(schedule)) {
    const span = t.mois * 30;
    if (cursor >= span) { cursor -= span; continue; }
    const days = Math.min(remaining, span - cursor);
    segments.push({ label: t.label, annee: t.annee, jours: days, moisEquivalent: days / 30, mensuel_par_ha: t.mensuel, montant: (t.mensuel / 30) * days * sup });
    remaining -= days;
    cursor = 0;
    if (remaining <= 0) break;
  }
  return { montant: segments.reduce((s, x) => s + x.montant, 0), totalJours: daysCount - remaining, segments };
}

export function calculateProgressivePeriodAmount(offre: OfferPricingSource | null | undefined, dateActivation: string | null | undefined, periodType: "jour" | "semaine" | "mois" | "trimestre" | "semestre" | "annee", count: number, superficieHa: number) {
  return calculateProgressiveAmountByDays(offre, getElapsedDays(dateActivation), periodToDays(periodType, count), superficieHa);
}

export function formatCFA(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " F";
}

export function getPricingSchedule(offreCode?: string) {
  return null; // Deprecated: pricing is now CRM-driven.
}

export function getCurrentRate(offreCode?: string, dateActivation?: string | null, fallbackMensuel = 0, fallbackDA = 0) {
  return null; // Deprecated: use getCurrentRateFromOffer.
}

export function getFullTariffGrid(offreCode?: string) {
  return null; // Deprecated: use getFullTariffGridFromOffer.
}
