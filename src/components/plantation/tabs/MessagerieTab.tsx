import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, Loader2, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "../EmptyState";

export const MessagerieTab = ({ souscripteur, plantation }: { souscripteur: any; plantation?: any }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    const token = sessionStorage.getItem("agri_portal_access_token");
    if (!token || sessionStorage.getItem("agri_demo") === "1") {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: invokeError } = await supabase.functions.invoke("client-portal-data", {
      body: { action: "list_messages", access_token: token, plantation_id: plantation?.id || null },
    });
    if (invokeError || !data?.success) {
      setError(data?.error || invokeError?.message || "Impossible de charger les messages.");
    } else {
      setError("");
      setMessages(data.messages || []);
      await supabase.functions.invoke("client-portal-data", {
        body: { action: "mark_messages_read", access_token: token, plantation_id: plantation?.id || null },
      });
    }
    setLoading(false);
  }, [plantation?.id]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    const token = sessionStorage.getItem("agri_portal_access_token");
    if (!token) return;
    setSending(true);
    const { data, error: invokeError } = await supabase.functions.invoke("client-portal-data", {
      body: { action: "send_message", access_token: token, plantation_id: plantation?.id || null, message },
    });
    if (invokeError || !data?.success) {
      setError(data?.error || invokeError?.message || "Impossible d'envoyer le message.");
    } else {
      setDraft("");
      setMessages(prev => [...prev, data.message]);
      setError("");
    }
    setSending(false);
  };

  if (sessionStorage.getItem("agri_demo") === "1") {
    return <EmptyState icon={MessageSquare} title="Messagerie de démonstration" description="La messagerie réelle est disponible après connexion à un compte client AgriCapital." />;
  }

  return (
    <div className="space-y-3">
      <Card className="card-brand-subtle rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-bold">Messagerie AgriCapital</p>
              <p className="text-[11px] text-muted-foreground">Échangez avec votre équipe depuis votre espace client.</p>
            </div>
          </div>

          <div className="min-h-[220px] max-h-[360px] overflow-y-auto rounded-xl bg-muted/20 p-3 space-y-2">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : messages.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-center text-muted-foreground">
                <MessageSquare className="h-7 w-7 mb-2 opacity-40" />
                <p className="text-sm font-medium">Aucun message</p>
                <p className="text-xs mt-1">Votre équipe pourra vous répondre ici.</p>
              </div>
            ) : messages.map((m) => {
              const mine = m.auteur_type === "client";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-white rounded-br-sm" : "bg-white border rounded-bl-sm"}`}>
                    <p className="text-[10px] font-bold opacity-70 mb-0.5">{mine ? "Vous" : (m.auteur_nom || "AgriCapital")}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-60">
                      <span>{new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      {mine && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <div className="mt-3 flex items-end gap-2">
            <Textarea
              value={draft}
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder="Écrivez votre message…"
              className="min-h-[48px] max-h-32 rounded-xl resize-none"
              disabled={sending}
            />
            <Button onClick={() => void sendMessage()} disabled={sending || !draft.trim()} className="h-12 w-12 shrink-0 rounded-xl p-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne.</p>
        </CardContent>
      </Card>
    </div>
  );
};
