import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, Loader2, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const MessagerieTab = ({ souscripteur, sessionToken }: { souscripteur: any; sessionToken?: string | null }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [contenu, setContenu] = useState("");
  const [loading, setLoading] = useState(false);
  const commercial = souscripteur?.commercial;

  const load = async () => {
    if (!sessionToken) return;
    const { data } = await supabase.functions.invoke("portal-messages", { body: { action: "list", session_token: sessionToken } });
    if (data?.success) setMessages(data.messages || []);
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [sessionToken]);

  const send = async () => {
    if (!sessionToken || !contenu.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("portal-messages", { body: { action: "send", session_token: sessionToken, contenu: contenu.trim() } });
      if (data?.success && data.message) { setMessages((prev) => [...prev, data.message]); setContenu(""); }
    } finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    if (!sessionToken) return;
    await supabase.functions.invoke("portal-messages", { body: { action: "read", session_token: sessionToken, message_id: id } });
  };

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><span className="font-bold text-sm">Messagerie AgriCapital</span></div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {messages.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Aucun message. Vous pouvez écrire au Service Client.</p>}
            {messages.map((m) => (
              <div key={m.id} onClick={() => m.auteur_type !== "client" && !m.lu_client_at && markRead(m.id)} className={`rounded-xl p-3 ${m.auteur_type === "client" ? "bg-primary/10 ml-6" : "bg-muted mr-6"}`}>
                <p className="text-[10px] text-muted-foreground mb-1">{m.auteur_type === "client" ? "Vous" : "AgriCapital"} · {new Date(m.created_at).toLocaleString("fr-FR")}</p>
                <p className="text-sm whitespace-pre-wrap">{m.contenu}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Écrivez votre message..." maxLength={4000} className="min-h-20" />
            <Button onClick={send} disabled={loading || !contenu.trim()} className="self-end"><Send className="h-4 w-4" />{loading && <Loader2 className="h-4 w-4 animate-spin ml-1" />}</Button>
          </div>
        </CardContent>
      </Card>
      {commercial?.telephone && <Card className="rounded-2xl"><CardContent className="p-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold">{commercial.nom}</p><p className="text-xs text-muted-foreground">{commercial.fonction || "Conseiller"}</p></div><Button asChild size="sm" variant="outline"><a href={"https://wa.me/225" + commercial.telephone.replace(/\D/g, "").replace(/^225/, "")} target="_blank" rel="noreferrer"><Phone className="h-3.5 w-3.5 mr-1" /> WhatsApp</a></Button></CardContent></Card>}
    </div>
  );
};