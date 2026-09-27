import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { appendJournal, buildCrmSnapshot, diffAndLog, type CrmSnapshot } from "@/utils/syncJournal";
import { trackEvent } from "@/utils/errorTracker";


export type RealtimeStatus = "loading" | "connecting" | "live" | "offline" | "error" | "reconnecting";

/**
 * Rafraîchissement automatique + statut de connexion Realtime.
 * - Polling silencieux vers `subscriber-lookup` (service-role) toutes les `intervalMs` ms.
 * - Abonnement Realtime sur toutes les tables CRM concernées.
 * - Expose un `status` (connecting / live / offline / error / reconnecting) que l'UI peut afficher.
 * - Gère la reconnexion automatique quand le navigateur repasse online / la page redevient visible.
 */
export function useAutoRefresh(
  sessionToken: string | null | undefined,
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
    if (!sessionToken) return;
    let cancelled = false;
    snapRef.current = null;

    const refresh = async (silent = true, trigger = "polling") => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("subscriber-lookup", { body: { portal_token: sessionToken, silent: true } });
        if (!cancelled && !error && data?.success) {
          const plants = data.plantations || [];
          const pays = data.paiements || [];
          cbRef.current(data.client || data.souscripteur, plants, pays);
          setLastSync(new Date());
          setStatus("live");

          // === Journal de synchronisation par compte ===
          const account = data.client?.id_unique || data.souscripteur?.id_unique || "client";
          const snapshot = buildCrmSnapshot(data.client || data.souscripteur, plants, pays);
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
            appendJournal("portal", { kind: "sync_error", label: "Échec de synchronisation", details: error.message || "Erreur inconnue" });
            trackEvent({ level: "error", scope: "sync", message: "Échec de synchronisation CRM", account: "portal", context: { trigger, error: error.message } });
          }
        }
      } catch (e: any) {
        const offline = !navigator.onLine;
        setStatus(offline ? "offline" : "error");
        if (!errLoggedRef.current) {
          errLoggedRef.current = true;
          appendJournal("portal", {
            kind: offline ? "connection" : "sync_error",
            label: offline ? "Connexion perdue" : "Erreur réseau pendant la synchronisation",
            details: e?.message,
          });
          trackEvent({
            level: offline ? "warning" : "error",
            scope: "realtime",
            message: offline ? "Connexion perdue (offline)" : "Erreur réseau pendant la synchronisation CRM",
            account: "portal",
            context: { trigger, error: e?.message },
          });
        }
      } finally { busy.current = false; }
    };


    refresh(false);
    const timer = setInterval(() => refresh(true), intervalMs);

    // Le portail n'ouvre pas de canal Realtime direct : les lectures CRM restent derrière l'API de session.
    const onVis = () => { if (document.visibilityState === "visible") { setStatus("reconnecting"); refresh(false); } };
    const onOnline = () => { setStatus("reconnecting"); trackEvent({ level: "info", scope: "realtime", message: "Retour en ligne — resynchronisation", account: "portal" }); refresh(false); };
    const onOffline = () => { setStatus("offline"); trackEvent({ level: "warning", scope: "realtime", message: "Navigateur hors ligne", account: "portal" }); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sessionToken, intervalMs]);

  return { status, lastSync };
}
