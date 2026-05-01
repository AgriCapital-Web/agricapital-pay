import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle, RotateCcw, Ban, Loader2, Receipt } from "lucide-react";
import { formatCFA } from "@/utils/pricing";
import { useToast } from "@/hooks/use-toast";

interface TransactionStatusWidgetProps {
  souscripteurId: string;
  limit?: number;
}

const STATUS_META: Record<string, { label: string; icon: any; cls: string }> = {
  en_attente: { label: "En attente", icon: Clock, cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  valide: { label: "Payée", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  echoue: { label: "Échouée", icon: XCircle, cls: "bg-red-500/15 text-red-700 border-red-500/30" },
  rembourse: { label: "Remboursée", icon: RotateCcw, cls: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  annule: { label: "Annulée", icon: Ban, cls: "bg-gray-500/15 text-gray-700 border-gray-500/30" },
};

export const TransactionStatusWidget = ({ souscripteurId, limit = 5 }: TransactionStatusWidgetProps) => {
  const { toast } = useToast();
  const [paiements, setPaiements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("paiements")
      .select("id, reference, montant, montant_paye, statut, type_paiement, date_paiement, created_at, refund_requested_at, refunded_at, cancelled_at, kkiapay_transaction_id")
      .eq("souscripteur_id", souscripteurId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setPaiements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!souscripteurId) return;
    load();
    const channel = supabase
      .channel(`paiements:${souscripteurId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements", filter: `souscripteur_id=eq.${souscripteurId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [souscripteurId]);

  const handleRefundRequest = async (paiement: any) => {
    if (!confirm(`Demander le remboursement de ${formatCFA(paiement.montant_paye || paiement.montant)} ?\nL'équipe traitera votre demande sous 48h.`)) return;
    const reason = prompt("Motif (optionnel) :") || "Demande client";
    setRefundingId(paiement.id);
    try {
      const now = new Date().toISOString();
      const { error: e1 } = await supabase.from("paiements").update({ refund_requested_at: now, refund_reason: reason }).eq("id", paiement.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("remboursements").insert({
        paiement_id: paiement.id, souscripteur_id: souscripteurId,
        montant: paiement.montant_paye || paiement.montant, motif: reason, statut: "en_attente",
      });
      if (e2) throw e2;
      toast({ title: "✅ Demande envoyée", description: "L'équipe AgriCapital vous recontactera." });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally { setRefundingId(null); }
  };

  if (loading) return <Card className="card-brand rounded-2xl"><CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</CardContent></Card>;
  if (paiements.length === 0) return null;

  return (
    <Card className="card-brand rounded-2xl shadow-md">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm">Mes transactions récentes</h3>
        </div>
        <div className="space-y-2">
          {paiements.map(p => {
            const meta = STATUS_META[p.statut] || STATUS_META.en_attente;
            const Icon = meta.icon;
            const canRefund = p.statut === "valide" && !p.refund_requested_at && !p.refunded_at;
            return (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border">
                <div className={`p-2 rounded-lg ${meta.cls.split(' ').slice(0,2).join(' ')}`}><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-sm">{formatCFA(p.montant_paye || p.montant)}</span>
                    <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.type_paiement === "DA" ? "Dépôt Initial" : "Mensualité"} • {p.reference}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(p.date_paiement || p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {p.refund_requested_at && !p.refunded_at && (
                    <p className="text-[10px] text-amber-700 mt-1">⏳ Remboursement en cours de traitement</p>
                  )}
                  {canRefund && (
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-[10px]" onClick={() => handleRefundRequest(p)} disabled={refundingId === p.id}>
                      {refundingId === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                      Demander un remboursement
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionStatusWidget;
