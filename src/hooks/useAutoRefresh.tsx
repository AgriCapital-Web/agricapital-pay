import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { appendJournal, buildCrmSnapshot, diffAndLog, type CrmSnapshot } from "@/utils/syncJournal";


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
  intervalMs: number = 3000,
) {
  const [status, setStatus] = useState<RealtimeStatus>("loading");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const busy = useRef(false);
  const cbRef = useRef(onData);
  cbRef.current = onData;
  const snapRef = useRef<CrmSnapshot | null>(null);
  const errLoggedRef = useRef(false);

  useEffect(() => {
    if (!telephone) return;
    let cancelled = false;
    snapRef.current = null;

    const refresh = async (silent = true, trigger = "polling") => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("subscriber-lookup", { body: { telephone } });
        if (!cancelled && !error && data?.success) {
          const plants = data.plantations || [];
          const pays = data.paiements || [];
          cbRef.current(data.souscripteur, plants, pays);
          setLastSync(new Date());
          setStatus("live");

          // === Journal de synchronisation par compte ===
          const account = data.souscripteur?.id_unique || telephone;
          const snapshot = buildCrmSnapshot(data.souscripteur, plants, pays);
          const changes = diffAndLog(account, snapRef.current, snapshot);
          snapRef.current = snapshot;
          if (!silent || changes > 0) {
            appendJournal(account, {
              kind: "sync",
              label: changes > 0 ? `Synchronisation — ${changes} changement(s) CRM` : "Synchronisation CRM",
              details: `Déclencheur : ${trigger} · source prix : ${snapshot.price_source}`,
            });
          }
          errLoggedRef.current = false;
        } else if (error) {
          setStatus("error");
          if (!errLoggedRef.current) {
            errLoggedRef.current = true;
            appendJournal(telephone, { kind: "sync_error", label: "Échec de synchronisation", details: error.message || "Erreur inconnue" });
          }
        }
      } catch (e: any) {
        setStatus(navigator.onLine ? "error" : "offline");
        if (!errLoggedRef.current) {
          errLoggedRef.current = true;
          appendJournal(telephone, {
            kind: navigator.onLine ? "sync_error" : "connection",
            label: navigator.onLine ? "Erreur réseau pendant la synchronisation" : "Connexion perdue",
            details: e?.message,
          });
        }
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
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets_techniques" }, () => refresh(false))
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
