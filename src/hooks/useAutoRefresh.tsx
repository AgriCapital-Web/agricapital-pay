import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Rafraîchissement automatique des données du portail client :
 * - Polling silencieux toutes les 15 secondes vers `subscriber-lookup`
 *   (edge function service-role qui recharge souscripteur + plantations + paiements + offres)
 * - Abonnement Realtime sur `offres`, `promotions` (publics) pour déclencher
 *   un refresh immédiat quand le CRM change un prix ou une promo.
 *
 * Résultat : dès qu'un utilisateur CRM modifie un prix/offre/promotion,
 * chaque portail client ouvert récupère la nouvelle valeur en < 15 s
 * (souvent instantanément grâce au canal realtime).
 */
export function useAutoRefresh(
  telephone: string | null | undefined,
  onData: (souscripteur: any, plantations: any[], paiements: any[]) => void,
  intervalMs: number = 15000,
) {
  const busy = useRef(false);
  const cbRef = useRef(onData);
  cbRef.current = onData;

  useEffect(() => {
    if (!telephone) return;

    let cancelled = false;

    const refresh = async () => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("subscriber-lookup", {
          body: { telephone },
        });
        if (!cancelled && !error && data?.success) {
          cbRef.current(data.souscripteur, data.plantations || [], data.paiements || []);
          try {
            sessionStorage.setItem("agri_souscripteur", JSON.stringify(data.souscripteur));
            sessionStorage.setItem("agri_plantations", JSON.stringify(data.plantations || []));
            sessionStorage.setItem("agri_paiements", JSON.stringify(data.paiements || []));
          } catch { /* quota */ }
        }
      } catch { /* silencieux */ }
      finally { busy.current = false; }
    };

    // Poll périodique
    const timer = setInterval(refresh, intervalMs);

    // Realtime : réagir immédiatement aux changements CRM
    const channel = supabase
      .channel(`portal-sync-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offres" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, () => refresh())
      .subscribe();

    // Refresh quand l'onglet redevient visible
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [telephone, intervalMs]);
}
