import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, RefreshCw, ShieldCheck, Smartphone, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { trackEvent } from "@/utils/errorTracker";

interface Props {
  telephone?: string | null;
  email?: string | null;
  account?: string | null;
  trigger?: React.ReactNode;
}

interface AccessStatus {
  telephone_masque: string;
  created_at: string | null;
  expires_at: string | null;
  verified: boolean;
  attempts: number;
  expired: boolean;
  seconds_restantes: number;
  demandes_10min: number;
  email_masque?: string | null;
}

const mask = (v?: string | null) => {
  if (!v) return "—";
  if (v.includes("@")) {
    const [u, d] = v.split("@");
    return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
  }
  return `${v.slice(0, 4)}****${v.slice(-2)}`;
};

/**
 * Panneau "Code d'accès" : dernière génération, expiration, téléphone
 * demandeur, e-mail rattaché au compte (anti-fraude) et réémission
 * sans blocage possible.
 */
export const AccessCodePanel = ({ telephone, email, account, trigger }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<AccessStatus | null>(null);
  const load = useCallback(async () => {
    if (!telephone) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("portal-access", {
        body: { action: "inspect", telephone },
      });
      if (error) throw error;
      setData(res?.success ? res : null);
    } catch (e: any) {
      trackEvent({ level: "error", scope: "auth", message: "Lecture du statut du code d'accès impossible", account, context: { error: e?.message } });
      toast({ variant: "destructive", title: "Erreur", description: e?.message || "Statut du code d'accès indisponible." });
    } finally {
      setLoading(false);
    }
  }, [telephone, account, toast]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const Row = ({ label, value, Icon }: { label: string; value: React.ReactNode; Icon?: any }) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </span>
      <span className="text-xs font-semibold text-right">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-9 w-9" aria-label="Code d'accès">
            <KeyRound className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Sécurité — Code d'accès
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <Row label="Téléphone demandeur" Icon={Smartphone} value={mask(data?.telephone || telephone)} />
          <Row label="E-mail rattaché" Icon={Mail} value={mask(email)} />
          <Row
            label="Code d'accès"
            Icon={data?.needs_access_code_setup ? AlertCircle : CheckCircle2}
            value={data?.needs_access_code_setup ? (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">À créer</Badge>
            ) : data?.locked_until && new Date(data.locked_until).getTime() > Date.now() ? (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Verrouillé</Badge>
            ) : (
              <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">Configuré</Badge>
            )}
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Le portail utilise désormais un code personnel à 4 chiffres enregistré de façon sécurisée. La génération/réinitialisation
          est gérée par le parcours d'accès portail ou par l'équipe habilitée dans le CRM.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>     </DialogContent>
    </Dialog>
  );
};

export default AccessCodePanel;interface AccessStatus {
  telephone: string | null;
  nom_complet?: string | null;
  needs_access_code_setup: boolean;
  locked_until?: string | null;
  success?: boolean;
}

const mask = (v?: string | null) => {
  if (!v) return "—";
  if (v.includes("@")) {
    const [u, d] = v.split("@");
    return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
  }
  return `${v.slice(0, 4)}****${v.slice(-2)}`;
};

/**
 * Panneau "Code d'accès" : dernière génération, expiration, téléphone
 * demandeur, e-mail rattaché au compte (anti-fraude) et réémission
 * sans blocage possible.
 */
export const AccessCodePanel = ({ telephone, email, account, trigger }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [data, setData] = useState<OtpStatus | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const load = useCallback(async () => {
    if (!telephone) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "status", telephone },
      });
      if (error) throw error;
      setData(res?.status || null);
    } catch (e: any) {
      trackEvent({ level: "error", scope: "auth", message: "Lecture du statut du code d'accès impossible", account, context: { error: e?.message } });
      toast({ variant: "destructive", title: "Erreur", description: "Statut du code d'accès indisponible." });
    } finally {
      setLoading(false);
    }
  }, [telephone, account, toast]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const resend = async () => {
    if (!telephone) return;
    setResending(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "send", telephone },
      });
      if (error) throw error;
      toast({
        title: "Code renvoyé",
        description: res?.devCode ? `Code (mode test) : ${res.devCode}` : "Un nouveau code vous a été envoyé par SMS.",
      });
      trackEvent({ level: "info", scope: "auth", message: "Réémission du code d'accès", account });
      load();
    } catch (e: any) {
      trackEvent({ level: "error", scope: "auth", message: "Réémission du code d'accès échouée", account, context: { error: e?.message } });
      toast({ variant: "destructive", title: "Erreur", description: e?.message || "Réémission impossible." });
    } finally {
      setResending(false);
    }
  };

  const Row = ({ label, value, Icon }: { label: string; value: React.ReactNode; Icon?: any }) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </span>
      <span className="text-xs font-semibold text-right">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-9 w-9" aria-label="Code d'accès">
            <KeyRound className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Sécurité — Code d'accès
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <Row label="Téléphone demandeur" Icon={Smartphone} value={data?.telephone_masque || mask(telephone)} />
          <Row label="E-mail rattaché" Icon={Mail} value={data?.email_masque || mask(email)} />
          <Row
            label="Dernière génération"
            Icon={Clock}
            value={data?.created_at ? format(new Date(data.created_at), "dd/MM/yyyy HH:mm:ss", { locale: fr }) : "—"}
          />
          <Row
            label="Statut"
            value={
              !data ? "—" : data.verified ? (
                <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">Utilisé</Badge>
              ) : remaining > 0 ? (
                <Badge className="bg-gold/15 text-gold-dark border-gold/30" variant="outline">Valide · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</Badge>
              ) : (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Expiré</Badge>
              )
            }
          />
          <Row label="Tentatives sur ce code" value={data ? `${data.attempts}` : "—"} />
          <Row label="Demandes (10 dernières min)" value={data ? `${data.demandes_10min}` : "—"} />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Contrôle anti-fraude : le portail vérifie en arrière-plan que le numéro qui demande le code
          correspond bien au compte client et à l'e-mail enregistré côté CRM. La réémission n'est jamais bloquée.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
          <Button size="sm" className="flex-1 btn-brand" onClick={resend} disabled={resending}>
            <KeyRound className="mr-2 h-3.5 w-3.5" /> {resending ? "Envoi…" : "Renvoyer un code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccessCodePanel;
