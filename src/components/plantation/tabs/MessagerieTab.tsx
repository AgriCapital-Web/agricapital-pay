import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, Loader2, UserRound, Headphones, Wrench, BriefcaseBusiness } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Props = { souscripteur: any; plantation?: any };

const labelFor = (type: string) => {
  if (type === "technicien") return { label: "Technicien", icon: Wrench };
  if (type === "commercial") return { label: "Commercial", icon: BriefcaseBusiness };
  if (type === "staff") return { label: "AgriCapital", icon: Headphones };
  return { label: "Vous", icon: UserRound };
};

export const MessagerieTab = ({ souscripteur, plantation }: Props) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const token = sessionStorage.getItem("agri_portal_access_token");
  const isDemo = sessionStorage.getItem("agri_demo") === "1";

  const load = useCallback(async () => {
    if (!token || isDemo) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.functions.invoke("portal-messages", {
      body: { action: "list", access_token: token },
    });
    if (!error && data?.success) {
      setMessages(data.messages || []);
      if ((data.messages || []).some((m: any) => m.auteur_type === "staff" && !m.lu)) {
        await supabase.functions.invoke("portal-messages", {
          body: { action: "mark_read", access_token: token },
        });
      }
    }
    setLoading(false);
  }, [token, isDemo]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 12000);
    return () => window.clearInterval(timer);
  }, [load]);

  const currentMessages = useMemo(
    () => messages.filter((m) => !plantation?.id || !m.plantation_id || m.plantation_id === plantation.id),
    [messages, plantation?.id]
  );

  const send = async () => {
    const message = draft.trim();
    if (!message || !token || isDemo) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-messages", {
        body: {
          action: "send",
          access_token: token,
          message,
          plantation_id: plantation?.id || null,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Envoi impossible.");
      setDraft("");
      await load();
    } finally {
      setSending(false);
    }
  };

  if (isDemo) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 text-center space-y-2">
          <MessageSquare className="h-8 w-8 mx-auto text-primary" />
          <p className="font-bold">Messagerie de démonstration</p>
          <p className="text-xs text-muted-foreground">La messagerie est disponible pour les comptes clients réels. Le mode démo ne crée ni message ni donnée dans le CRM.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" /> Messagerie AgriCapital
        </CardTitle>
        <p className="text-xs text-muted-foreground">Échangez avec votre équipe AgriCapital. Vos messages sont rattachés à votre dossier et, si applicable, à la plantation sélectionnée.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-[260px] max-h-[460px] overflow-y-auto rounded-xl bg-muted/20 p-3 space-y-3">
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : currentMessages.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold">Aucun message</p>
              <p className="text-xs text-muted-foreground">Écrivez à votre équipe pour démarrer la conversation.</p>
            </div>
          ) : currentMessages.map((m) => {
            const meta = labelFor(m.auteur_type);
            const Icon = meta.icon;
            const mine = m.auteur_type === "client";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 ${mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-white border rounded-bl-md"}`}>
                  <div className={`flex items-center gap-1.5 mb-1 text-[10px] ${mine ? "text-white/75" : "text-muted-foreground"}`}>
                    <Icon className="h-3 w-3" />
                    <span className="font-semibold">{mine ? "Vous" : (m.auteur_nom || meta.label)}</span>
                    {!mine && <Badge variant="outline" className="h-4 px-1 text-[8px]">{meta.label}</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={`text-[9px] mt-1 ${mine ? "text-white/60" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Textarea value={draft} maxLength={4000} rows={3} placeholder="Écrire un message à AgriCapital…"
            onChange={(e) => setDraft(e.target.value)} disabled={sending} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] text-muted-foreground">{draft.length}/4000</span>
            <Button onClick={send} disabled={sending || !draft.trim()} className="btn-brand">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
