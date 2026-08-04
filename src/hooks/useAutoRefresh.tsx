import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeStatus = "loading" | "connecting" | "live" | "offline" | "error" | "reconnecting";

/**
 * Rafraîchissement automatique + statut de connexion Realtime.
 * - Polling silencieux vers `subscriber-lookup` (service-role) toutes les `intervalMs` ms.
 * - Abonnement Realtime sur toutes les tables CRM concernées.
 * - Expose un `status` (connecting / live / offline / error / reconnecting) que l'UI peut afficher.
 * - Gère la reconnexion automatique quand le navigateur repasse online / la page redevient visible.
 */
export function useAutoRefresh(
  telephone: string | null | undefined,
  onData: (souscripteur: any, plantations: any[], paiements: any[]) => void,
  intervalMs: number = 5000,
) {
  const [status, setStatus] = useState<RealtimeStatus>("loading");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const busy = useRef(false);
  const cbRef = useRef(onData);
  cbRef.current = onData;

  useEffect(() => {
    if (!telephone) return;
    let cancelled = false;

    const refresh = async (silent = true) => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("subscriber-lookup", { body: { telephone } });
        if (!cancelled && !error && data?.success) {
          cbRef.current(data.souscripteur, data.plantations || [], data.paiements || []);
          setLastSync(new Date());
          setStatus("live");
          try {
            sessionStorage.setItem("agri_souscripteur", JSON.stringify(data.souscripteur));
            sessionStorage.setItem("agri_plantations", JSON.stringify(data.plantations || []));
            sessionStorage.setItem("agri_paiements", JSON.stringify(data.paiements || []));
          } catch { /* quota */ }
        } else if (error) {
          setStatus("error");
        }
      } catch {
        setStatus(navigator.onLine ? "error" : "offline");
      } finally { busy.current = false; }
    };

    refresh(false);
    const timer = setInterval(() => refresh(true), intervalMs);

    const channel = supabase
      .channel(`portal-sync-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offres" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "souscripteurs" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "plantations" }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, () => refresh(false))
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("reconnecting");
        else if (s === "CLOSED") setStatus(navigator.onLine ? "reconnecting" : "offline");
      });

    const onVis = () => { if (document.visibilityState === "visible") { setStatus("reconnecting"); refresh(false); } };
    const onOnline = () => { setStatus("reconnecting"); refresh(false); };
    const onOffline = () => setStatus("offline");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [telephone, intervalMs]);

  return { status, lastSync };
}
