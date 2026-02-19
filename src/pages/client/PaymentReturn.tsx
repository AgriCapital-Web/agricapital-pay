import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoWhite from "@/assets/logo-white.png";
import { CheckCircle, XCircle, Loader2, Home, RefreshCw, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentReturnProps {
  onBack: () => void;
}

const PaymentReturn = ({ onBack }: PaymentReturnProps) => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [paiement, setPaiement] = useState<any>(null);
  const [checkCount, setCheckCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const reference = searchParams.get('reference') || searchParams.get('ref');
  const urlStatus = searchParams.get('status');
  const transactionId = searchParams.get('id') || searchParams.get('transaction_id') || searchParams.get('transactionId');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!reference && !transactionId) {
        setStatus('pending');
        return;
      }
      try {
        let query = supabase.from('paiements').select(`
          *,
          plantations (nom_plantation, id_unique, superficie_ha, superficie_activee),
          souscripteurs (nom_complet, telephone, id_unique)
        `);

        if (reference) query = query.eq('reference', reference);
        else if (transactionId) query = query.or(`metadata->>kkiapay_transaction_id.eq.${transactionId},reference.eq.${transactionId}`);

        const { data: dbPaiement, error: dbError } = await query.maybeSingle();
        if (dbError) throw dbError;

        if (dbPaiement) {
          setPaiement(dbPaiement);
          if (dbPaiement.statut === 'valide') { setStatus('success'); return; }
          if (dbPaiement.statut === 'echec' || dbPaiement.statut === 'rejete') { setStatus('error'); return; }

          if (transactionId) {
            try {
              const { data, error } = await supabase.functions.invoke('kkiapay-verify-transaction', { body: { transactionId } });
              if (!error && data?.success) {
                const isSuccess = data.transaction?.isPaymentSuccessful || data.transaction?.status?.toLowerCase() === 'success';
                const isFailed = ['failed', 'canceled'].includes(data.transaction?.status?.toLowerCase());
                if (isSuccess || isFailed) {
                  const newStatus = isSuccess ? 'valide' : 'echec';
                  await supabase.from('paiements').update({
                    statut: newStatus,
                    montant_paye: isSuccess ? (data.transaction?.amount ?? dbPaiement.montant) : 0,
                    date_paiement: isSuccess ? new Date().toISOString() : null,
                    metadata: { ...(dbPaiement.metadata as any || {}), kkiapay_transaction_id: transactionId, verified_at: new Date().toISOString(), payment_provider: 'kkiapay' }
                  }).eq('id', dbPaiement.id);
                  setPaiement({ ...dbPaiement, statut: newStatus, montant_paye: isSuccess ? (data.transaction?.amount ?? dbPaiement.montant) : 0 });
                  if (isSuccess && dbPaiement.type_paiement === 'DA' && dbPaiement.plantation_id) await activatePlantationAfterDA(dbPaiement);
                  setStatus(isSuccess ? 'success' : 'error');
                  return;
                }
              }
            } catch {}
          }

          if (urlStatus === 'success' || urlStatus === 'approved') {
            await supabase.from('paiements').update({ statut: 'valide', montant_paye: dbPaiement.montant, date_paiement: new Date().toISOString() }).eq('id', dbPaiement.id);
            setPaiement({ ...dbPaiement, statut: 'valide', montant_paye: dbPaiement.montant });
            if (dbPaiement.type_paiement === 'DA' && dbPaiement.plantation_id) await activatePlantationAfterDA(dbPaiement);
            setStatus('success');
            return;
          }

          if (checkCount < 10) setTimeout(() => setCheckCount(c => c + 1), 2500);
          setStatus('pending');
        } else {
          setStatus('pending');
        }
      } catch (error) {
        setStatus('pending');
      }
    };
    checkPaymentStatus();
  }, [reference, transactionId, checkCount, urlStatus]);

  const activatePlantationAfterDA = async (p: any) => {
    try {
      const { data: plantation } = await supabase.from('plantations').select('*').eq('id', p.plantation_id).single();
      if (plantation) {
        await supabase.from('plantations').update({
          superficie_activee: plantation.superficie_ha,
          date_activation: new Date().toISOString(),
          statut: 'active',
          statut_global: 'actif'
        }).eq('id', p.plantation_id);
      }
    } catch {}
  };

  const formatMontant = (m: number) => new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const element = receiptRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`recu-agri-${paiement?.reference || 'paiement'}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #00643C 0%, #004d2e 60%, #003320 100%)' }}>
      <header className="py-5 px-4">
        <div className="container mx-auto flex justify-center">
          <img src={logoWhite} alt="AgriCapital" className="h-14 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-4 pb-8">
        <Card className="w-full max-w-sm shadow-2xl border-0 overflow-hidden">
          <CardContent className="p-6 text-center space-y-5">
            
            {status === 'loading' && (
              <>
                <div className="h-20 w-20 mx-auto flex items-center justify-center">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                </div>
                <h2 className="text-xl font-bold">Vérification du paiement...</h2>
                <p className="text-muted-foreground text-sm">Veuillez patienter quelques instants</p>
              </>
            )}

            {status === 'success' && paiement && (
              <>
                {/* Icône succès animée */}
                <div className="relative h-20 w-20 mx-auto">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                  <div className="relative h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-600">Paiement réussi !</h2>
                  <p className="text-muted-foreground text-sm mt-1">Votre paiement a été confirmé avec succès</p>
                </div>

                {/* Reçu de paiement */}
                <div ref={receiptRef} className="bg-gray-50 rounded-xl p-4 text-left border border-gray-100 print:shadow-none">
                  {/* En-tête reçu */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-gray-200">
                    <div>
                      <p className="font-bold text-primary text-sm">REÇU DE PAIEMENT</p>
                      <p className="text-[10px] text-gray-400">AgriCapital CI</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Date</p>
                      <p className="text-xs font-semibold">
                        {paiement.date_paiement 
                          ? format(new Date(paiement.date_paiement), "dd/MM/yyyy HH:mm", { locale: fr })
                          : format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Détails */}
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Référence', value: paiement.reference || '—' },
                      { label: 'Souscripteur', value: paiement.souscripteurs?.nom_complet || '—' },
                      { label: 'Téléphone', value: paiement.souscripteurs?.telephone || '—' },
                      { label: 'Plantation', value: paiement.plantations?.nom_plantation || paiement.plantations?.id_unique || '—' },
                      { label: 'Type', value: paiement.type_paiement === 'DA' ? "Droit d'Accès" : 'Redevance mensuelle' },
                      { label: 'Mode', value: paiement.mode_paiement || 'Mobile Money' },
                    ].map(({ label, value }, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-gray-400">{label}</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
                      </div>
                    ))}
                    
                    {/* Transaction ID KKiaPay */}
                    {(paiement.metadata as any)?.kkiapay_transaction_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transaction ID</span>
                        <span className="font-mono text-[10px] text-gray-500">{String((paiement.metadata as any).kkiapay_transaction_id).slice(0, 14)}...</span>
                      </div>
                    )}
                  </div>

                  {/* Montant */}
                  <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">TOTAL PAYÉ</span>
                      <span className="text-xl font-bold text-primary">{formatMontant(paiement.montant_paye || paiement.montant)}</span>
                    </div>
                  </div>

                  {/* Mention */}
                  <div className="mt-3 pt-2 border-t border-dashed border-gray-100 text-center">
                    <p className="text-[9px] text-gray-300">Reçu généré le {format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}</p>
                    <p className="text-[9px] text-gray-300">AgriCapital — pay.agricapital.ci — +225 05 64 55 17 17</p>
                  </div>
                </div>

                {/* Boutons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleDownloadPDF} disabled={downloading} className="h-10 gap-1.5 text-xs">
                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Télécharger PDF
                  </Button>
                  <Button variant="outline" onClick={handlePrint} className="h-10 gap-1.5 text-xs">
                    <Printer className="h-3.5 w-3.5" />
                    Imprimer
                  </Button>
                </div>
                <Button onClick={onBack} className="w-full h-11 gap-2">
                  <Home className="h-4 w-4" />
                  Retour au tableau de bord
                </Button>
              </>
            )}

            {status === 'success' && !paiement && (
              <>
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-green-600">Paiement réussi !</h2>
                <Button onClick={onBack} className="w-full h-12 gap-2">
                  <Home className="h-5 w-5" /> Retour à l'accueil
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-20 w-20 text-red-500 mx-auto" />
                <h2 className="text-2xl font-bold text-red-600">Paiement échoué</h2>
                <p className="text-muted-foreground text-sm">Votre paiement n'a pas pu être traité.</p>
                {paiement && (
                  <div className="bg-red-50 rounded-lg p-4 text-left text-xs space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold">{formatMontant(paiement.montant)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Référence</span><span className="font-mono">{paiement.reference}</span></div>
                  </div>
                )}
                <div className="space-y-2">
                  <Button onClick={onBack} className="w-full h-11 gap-2"><RefreshCw className="h-4 w-4" />Réessayer</Button>
                  <Button variant="outline" onClick={onBack} className="w-full h-10 text-sm">Retour à l'accueil</Button>
                </div>
              </>
            )}

            {status === 'pending' && (
              <>
                <div className="h-20 w-20 mx-auto flex items-center justify-center bg-amber-50 rounded-full">
                  <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-amber-600">Paiement en cours de traitement</h2>
                <p className="text-muted-foreground text-sm">Vérification automatique en cours...</p>
                {checkCount < 5 && <p className="text-xs text-muted-foreground">Tentative {checkCount + 1}/5</p>}
                <div className="space-y-2">
                  <Button variant="outline" onClick={() => setCheckCount(c => c + 1)} className="w-full gap-2 h-10 text-sm">
                    <RefreshCw className="h-4 w-4" /> Actualiser le statut
                  </Button>
                  <Button onClick={onBack} className="w-full h-10 text-sm">Retour à l'accueil</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="py-4 text-center">
        <p className="text-sm text-white/80">Support : +225 05 64 55 17 17</p>
        <p className="text-xs text-white/50 mt-0.5">© {new Date().getFullYear()} AgriCapital</p>
      </footer>
    </div>
  );
};

export default PaymentReturn;
