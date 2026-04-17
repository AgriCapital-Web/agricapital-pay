/**
 * Progressive pricing system based on AgriCapital flyer structure.
 * Rates change automatically per year (An1, An2, An3) based on activation date.
 * 
 * PalmInvest / PalmInvest+:
 *   Dépôt initial: 90,700 F/ha
 *   An 1 (12 mois): 60,000 F/mois/ha
 *   An 2 (12 mois): 120,000 F/mois/ha
 *   An 3 (10 mois): 194,000 F/mois/ha
 *   Total: 4,190,700 F/ha (34 mois)
 * 
 * TerraPalm / TerraPalm+:
 *   Dépôt initial: 84,700 F/ha
 *   An 1 (12 mois): 54,000 F/mois/ha
 *   An 2 (12 mois): 75,000 F/mois/ha
 *   An 3 (10 mois): 96,200 F/mois/ha
 *   Total: 2,594,700 F/ha (34 mois)
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

export interface CurrentRate {
  annee: number; // 1, 2, or 3
  label: string; // "An 1", "An 2", "An 3"
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

const PRICING: Record<string, PricingSchedule> = {
  PALMINVEST: {
    depot_initial: 90700,
    an1_mensuel: 60000,
    an1_duree_mois: 12,
    an2_mensuel: 120000,
    an2_duree_mois: 12,
    an3_mensuel: 194000,
    an3_duree_mois: 10,
    total_par_ha: 4190700,
    duree_totale_mois: 34,
    cash_price: 3890700,
  },
  'PALMINVEST+': {
    depot_initial: 90700,
    an1_mensuel: 60000,
    an1_duree_mois: 12,
    an2_mensuel: 120000,
    an2_duree_mois: 12,
    an3_mensuel: 194000,
    an3_duree_mois: 10,
    total_par_ha: 4190700,
    duree_totale_mois: 34,
    cash_price: 3890700,
  },
  TERRAPALM: {
    depot_initial: 84700,
    an1_mensuel: 54000,
    an1_duree_mois: 12,
    an2_mensuel: 75000,
    an2_duree_mois: 12,
    an3_mensuel: 96200,
    an3_duree_mois: 10,
    total_par_ha: 2594700,
    duree_totale_mois: 34,
    cash_price: 2294700,
  },
  'TERRAPALM+': {
    depot_initial: 84700,
    an1_mensuel: 54000,
    an1_duree_mois: 12,
    an2_mensuel: 75000,
    an2_duree_mois: 12,
    an3_mensuel: 96200,
    an3_duree_mois: 10,
    total_par_ha: 2594700,
    duree_totale_mois: 34,
    cash_price: 2294700,
  },
};

/**
 * Determine the current pricing year and rate based on offer code and activation date.
 * Falls back to DB rates if offer code not in progressive schedule.
 */
export function getCurrentRate(
  offreCode: string | undefined,
  dateActivation: string | null | undefined,
  fallbackMensuel: number = 0,
  fallbackDA: number = 0,
): CurrentRate | null {
  const code = (offreCode || '').toUpperCase().replace(/\s+/g, '').replace(/_PLUS/g, '+').replace(/_PLUS/g, '+');
  const schedule = PRICING[code];

  if (!schedule) {
    // Fallback to flat DB rate (e.g. PalmÉlite or unknown offers)
    if (fallbackMensuel > 0) {
      return {
        annee: 1,
        label: 'Tarif standard',
        mensuel_par_ha: fallbackMensuel,
        jour_par_ha: Math.round(fallbackMensuel / 30),
        semaine_par_ha: Math.round(fallbackMensuel / 4),
        trimestre_par_ha: fallbackMensuel * 3,
        semestre_par_ha: fallbackMensuel * 6,
        annuel_par_ha: fallbackMensuel * 12,
        mois_restants_dans_annee: 12,
        mois_ecoules: 0,
        schedule: {
          depot_initial: fallbackDA,
          an1_mensuel: fallbackMensuel,
          an1_duree_mois: 12,
          an2_mensuel: fallbackMensuel,
          an2_duree_mois: 12,
          an3_mensuel: fallbackMensuel,
          an3_duree_mois: 12,
          total_par_ha: fallbackDA + fallbackMensuel * 36,
          duree_totale_mois: 36,
          cash_price: fallbackDA + fallbackMensuel * 36,
        },
      };
    }
    return null;
  }

  // Calculate months since activation
  let moisEcoules = 0;
  if (dateActivation) {
    const activation = new Date(dateActivation);
    const now = new Date();
    moisEcoules = (now.getFullYear() - activation.getFullYear()) * 12 + (now.getMonth() - activation.getMonth());
    if (moisEcoules < 0) moisEcoules = 0;
  }

  let annee: number;
  let mensuel: number;
  let moisRestants: number;

  if (moisEcoules < schedule.an1_duree_mois) {
    annee = 1;
    mensuel = schedule.an1_mensuel;
    moisRestants = schedule.an1_duree_mois - moisEcoules;
  } else if (moisEcoules < schedule.an1_duree_mois + schedule.an2_duree_mois) {
    annee = 2;
    mensuel = schedule.an2_mensuel;
    moisRestants = (schedule.an1_duree_mois + schedule.an2_duree_mois) - moisEcoules;
  } else {
    annee = 3;
    mensuel = schedule.an3_mensuel;
    moisRestants = Math.max(0, schedule.duree_totale_mois - moisEcoules);
  }

  return {
    annee,
    label: `An ${annee}`,
    mensuel_par_ha: mensuel,
    jour_par_ha: Math.round(mensuel / 30),
    semaine_par_ha: Math.round(mensuel / 4),
    trimestre_par_ha: mensuel * 3,
    semestre_par_ha: mensuel * 6,
    annuel_par_ha: mensuel * 12,
    mois_restants_dans_annee: moisRestants,
    mois_ecoules: moisEcoules,
    schedule,
  };
}

/**
 * Get full tariff grid for display (all 3 years)
 */
export function getFullTariffGrid(offreCode: string | undefined): {
  label: string;
  mensuel: number;
  duree: number;
  total: number;
}[] | null {
  const code = (offreCode || '').toUpperCase().replace(/\s+/g, '').replace(/_PLUS/g, '+');
  const schedule = PRICING[code];
  if (!schedule) return null;

  return [
    { label: 'An 1 — 12 mois', mensuel: schedule.an1_mensuel, duree: schedule.an1_duree_mois, total: schedule.an1_mensuel * schedule.an1_duree_mois },
    { label: 'An 2 — 12 mois', mensuel: schedule.an2_mensuel, duree: schedule.an2_duree_mois, total: schedule.an2_mensuel * schedule.an2_duree_mois },
    { label: 'An 3 — 10 mois', mensuel: schedule.an3_mensuel, duree: schedule.an3_duree_mois, total: schedule.an3_mensuel * schedule.an3_duree_mois },
  ];
}

export function getPricingSchedule(offreCode: string | undefined): PricingSchedule | null {
  const code = (offreCode || '').toUpperCase().replace(/\s+/g, '').replace(/_PLUS/g, '+');
  return PRICING[code] || null;
}

export function formatCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " F";
}
