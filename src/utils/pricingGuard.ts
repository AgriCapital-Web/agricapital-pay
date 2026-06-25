/**
 * Garde-fou : vérifie que les prix lus depuis la table `offres` (tranches_paiement,
 * montant_total_par_ha, montant_cash_par_ha, duree_paiement_mois) restent cohérents
 * avec ce que le moteur de pricing calcule. Émet un avertissement en console quand
 * un décalage est détecté pour éviter qu'un changement DB passe inaperçu côté CRM.
 */
import { getPricingScheduleFromOffer, type OfferPricingSource } from "./pricing";

export interface PricingConsistencyIssue {
  code: string;
  field: "duree_paiement_mois" | "montant_total_par_ha" | "tranches_paiement" | "montant_cash_par_ha";
  expected: number;
  actual: number;
  message: string;
}

const TOLERANCE = 1; // F CFA, marge d'arrondi

export function validateOfferPricing(offre: OfferPricingSource | null | undefined): PricingConsistencyIssue[] {
  if (!offre) return [];
  const code = String(offre.code ?? "?");
  const issues: PricingConsistencyIssue[] = [];
  const schedule = getPricingScheduleFromOffer(offre);
  if (!schedule) return issues;

  const expectedDuree = schedule.an1_duree_mois + schedule.an2_duree_mois + schedule.an3_duree_mois;
  const actualDuree = Number(offre.duree_paiement_mois ?? expectedDuree);
  if (Math.abs(expectedDuree - actualDuree) > 0) {
    issues.push({
      code,
      field: "duree_paiement_mois",
      expected: expectedDuree,
      actual: actualDuree,
      message: `Durée totale incohérente pour ${code} : tranches=${expectedDuree} mois, DB=${actualDuree} mois.`,
    });
  }

  const expectedTotal =
    schedule.depot_initial +
    schedule.an1_mensuel * schedule.an1_duree_mois +
    schedule.an2_mensuel * schedule.an2_duree_mois +
    schedule.an3_mensuel * schedule.an3_duree_mois;
  const actualTotal = Number(offre.montant_total_par_ha ?? 0);
  if (actualTotal > 0 && Math.abs(expectedTotal - actualTotal) > TOLERANCE) {
    issues.push({
      code,
      field: "montant_total_par_ha",
      expected: expectedTotal,
      actual: actualTotal,
      message: `Total/ha incohérent pour ${code} : tranches→${expectedTotal} F, DB=${actualTotal} F.`,
    });
  }

  return issues;
}

const warned = new Set<string>();
export function assertOfferPricingFresh(offre: OfferPricingSource | null | undefined): void {
  const issues = validateOfferPricing(offre);
  for (const issue of issues) {
    const key = `${issue.code}:${issue.field}`;
    if (warned.has(key)) continue;
    warned.add(key);
    // eslint-disable-next-line no-console
    console.warn("[pricing-guard]", issue.message, issue);
  }
}
