import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useKkiapay } from "@/hooks/useKkiapay";
import logoWhiteBg from "@/assets/logo-white-bg.png";
import { getCurrentRate, getFullTariffGrid, formatCFA } from "@/utils/pricing";
import { ArrowLeft, CreditCard, MapPin, Check, AlertTriangle, Calculator, Loader2, Phone, Trophy, Target, Zap, Plus, Leaf, Calendar } from "lucide-react";

interface ClientPaymentProps {
  souscripteur: any; plantations: any[]; paiements: any[]; onBack: () => void;
  prefillAmount?: number; prefillType?: 'arriere' | 'avance';
}

const STEPS = [
  { key: 'type', label: 'Type' },
  { key: 'plantation', label: 'Plantation' },
  { key: 'details', label: 'Détails' },
  { key: 'confirm', label: 'Payer' },
] as const;

const ClientPayment = ({ souscripteur, plantations, paiements, onBack, prefillAmount, prefillType }: ClientPaymentProps) => {
  const { toast } = useToast();
  const { openPayment, onSuccess, onFailed, onClose } = useKkiapay();
  const [step, setStep] = useState<'type' | 'plantation' | 'details' | 'confirm'>('type');
  const [typePaiement, setTypePaiement] = useState<'da' | 'redevance'>('redevance');
  const [selectedPlantation, setSelectedPlantation] = useState('');
  const [periodType, setPeriodType] = useState<'jour' | 'semaine' | 'mois' | 'trimestre' | 'semestre' | 'annee' | 'custom'>('mois');
  const [periodCount, setPeriodCount] = useState(1);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPaiementRef, setCurrentPaiementRef] = useState<string | null>(null);
  const [modeArriere, setModeArriere] = useState<'only' | 'avance' | null>(null);
  const [avancePeriodType, setAvancePeriodType] = useState<'jour' | 'semaine' | 'mois' | 'trimestre' | 'semestre' | 'annee'>('mois');
  const [avancePeriodCount, setAvancePeriodCount] = useState(1);

  useEffect(() => {
    if (prefillType === 'arriere') {
      setTypePaiement('redevance'); setModeArriere('only');
      const p = plantations.find((p: any) => p.superficie_activee > 0);
      if (p) setSelectedPlantation(p.id);
      setStep('details');
    } else if (prefillType === 'avance') {
      setTypePaiement('redevance'); setModeArriere('avance');
      const p = plantations.find((p: any) => p.superficie_activee > 0);
      if (p) setSelectedPlantation(p.id);
      setStep('details');
    }
  }, [prefillType]);

  const plantation = useMemo(() => plantations.find(p => p.id === selectedPlantation), [selectedPlantation, plantations]);

  // Get progressive rate for the selected plantation
  const plantationRate = useMemo(() => {
    return getCurrentRate(
      souscripteur?.offres?.code,
      plantation?.date_activation,
      souscripteur?.offres?.contribution_mensuelle_par_ha || 0,
      souscripteur?.offres?.montant_da_par_ha || 0,
    );
  }, [souscripteur, plantation]);

  const tariffGrid = useMemo(() => getFullTariffGrid(souscripteur?.offres?.code), [souscripteur]);

  const TARIFS = useMemo(() => {
    if (plantationRate) {
      return {
        jour: plantationRate.jour_par_ha,
        semaine: plantationRate.semaine_par_ha,
        mois: plantationRate.mensuel_par_ha,
        trimestre: plantationRate.trimestre_par_ha,
        semestre: plantationRate.semestre_par_ha,
        annee: plantationRate.annuel_par_ha,
        da_par_hectare: plantationRate.schedule.depot_initial,
      };
    }
    const offre = souscripteur?.offres;
    if (offre) {
      const cm = offre.contribution_mensuelle_par_ha || 0;
      return { jour: Math.round(cm / 30), semaine: Math.round(cm / 4), mois: cm, trimestre: cm * 3, semestre: cm * 6, annee: cm * 12, da_par_hectare: offre.montant_da_par_ha || 0 };
    }
    return { jour: 65, semaine: 450, mois: 1900, trimestre: 5500, semestre: 11000, annee: 20000, da_par_hectare: 20000 };
  }, [plantationRate, souscripteur]);

  const fmt = (m: number) => formatCFA(m);

  useEffect(() => {
    onSuccess(async (response) => {
      if (currentPaiementRef) {
        const { data: paiementData } = await supabase.from('paiements').select('*, plantations(*)').eq('reference', currentPaiementRef).maybeSingle();
        const { error } = await supabase.from('paiements').update({
          statut: 'valide', date_paiement: new Date().toISOString(),
          montant_paye: response.amount || paiementData?.montant || 0,
          metadata: { payment_provider: 'kkiapay', kkiapay_transaction_id: response.transactionId, method: response.method || null, fees: response.fees || 0 }
        }).eq('reference', currentPaiementRef);
        if (!error && paiementData?.type_paiement === 'DA' && paiementData?.plantation_id) {
          const p = paiementData.plantations;
          if (p) await supabase.from('plantations').update({ superficie_activee: p.superficie_ha, date_activation: new Date().toISOString(), statut: 'active', statut_global: 'actif' }).eq('id', paiementData.plantation_id);
        }
        try {
          const montantPaye = response.amount || paiementData?.montant || 0;
          await supabase.functions.invoke('send-otp', {
            body: { telephone: souscripteur.telephone, action: 'send_custom', customMessage: `AgriCapital: Paiement de ${new Intl.NumberFormat("fr-FR").format(montantPaye)} F CFA recu (Ref: ${currentPaiementRef}). Merci! Votre recu est disponible sur pay.agricapital.ci` }
          }).catch(() => {});
        } catch {}
      }
      toast({ title: "✅ Paiement réussi !", description: `Transaction ${response.transactionId} validée.` });
      setTimeout(() => onBack(), 2000);
    });
    onFailed((error) => { toast({ variant: "destructive", title: "Paiement échoué", description: error.reason }); setLoading(false); });
    onClose(() => setLoading(false));
  }, [currentPaiementRef]);

  const calculerArrieres = (plant: any) => {
    if (!plant?.date_activation || plant.statut_global === 'en_attente_da') return { montant: 0, jours: 0, enAvance: false };
    const rate = getCurrentRate(souscripteur?.offres?.code, plant.date_activation, souscripteur?.offres?.contribution_mensuelle_par_ha || 0);
    const tarifJour = rate?.jour_par_ha || 65;
    const jours = Math.floor((Date.now() - new Date(plant.date_activation).getTime()) / 86400000);
    const attendu = jours * tarifJour * (plant.superficie_activee || 0);
    const paye = paiements.filter((p: any) => p.plantation_id === plant.id && (p.type_paiement === 'REDEVANCE' || p.type_paiement === 'contribution') && p.statut === 'valide')
      .reduce((s: number, p: any) => s + (p.montant_paye || 0), 0);
    const diff = attendu - paye;
    if (diff > 0) return { montant: diff, jours: Math.floor(diff / (tarifJour * (plant.superficie_activee || 1))), enAvance: false };
    return { montant: Math.abs(diff), jours: Math.floor(Math.abs(diff) / (tarifJour * (plant.superficie_activee || 1))), enAvance: true };
  };

  const calculerMontantAvance = () => {
    if (!plantation) return 0;
    return TARIFS[avancePeriodType] * avancePeriodCount * (plantation.superficie_activee || plantation.superficie_ha || 1);
  };

  const calculerMontantRedevance = () => {
    if (!plantation) return 0;
    const sup = plantation.superficie_activee || plantation.superficie_ha || 1;
    if (periodType === 'custom') return Number(customAmount) || 0;
    return TARIFS[periodType] * periodCount * sup;
  };

  const montantArriere = plantation ? calculerArrieres(plantation).montant : 0;
  const montantAvance = calculerMontantAvance();
  const montantTotal = useMemo(() => {
    if (typePaiement === 'da') { if (!plantation) return 0; return (plantation.superficie_ha - (plantation.superficie_activee || 0)) * TARIFS.da_par_hectare; }
    if (modeArriere === 'only') return montantArriere;
    if (modeArriere === 'avance') return montantArriere + montantAvance;
    return calculerMontantRedevance();
  }, [typePaiement, plantation, modeArriere, montantArriere, montantAvance, periodType, periodCount, customAmount, avancePeriodType, avancePeriodCount]);

  const handleSubmit = async () => {
    if (!plantation || montantTotal <= 0) { toast({ variant: "destructive", title: "Erreur", description: "Plantation et montant requis" }); return; }
    setLoading(true);
    try {
      const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setCurrentPaiementRef(reference);
      const { data: paiementRow, error: insertError } = await supabase.from('paiements').insert({
        souscripteur_id: souscripteur.id, plantation_id: plantation.id,
        type_paiement: typePaiement === 'da' ? 'DA' : 'REDEVANCE',
        montant: montantTotal, statut: 'en_attente', mode_paiement: 'Mobile Money', reference,
        metadata: { mode_arriere: modeArriere, montant_arriere: modeArriere ? montantArriere : null, montant_avance: modeArriere === 'avance' ? montantAvance : null, payment_provider: 'kkiapay', annee_tarif: plantationRate?.annee || 1, tarif_mensuel: TARIFS.mois }
      }).select().single();
      if (insertError) throw insertError;
      const opened = await openPayment({
        amount: Math.round(montantTotal),
        email: souscripteur.email || 'client@agricapital.ci',
        phone: souscripteur.telephone,
        name: souscripteur.nom_complet || `${souscripteur.prenoms} ${souscripteur.nom}`,
        data: { reference, paiement_id: paiementRow.id, plantation_id: plantation.id, type: typePaiement }
      });
      if (!opened) { toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ouvrir la page de paiement." }); setLoading(false); }
    } catch (error: any) { toast({ variant: "destructive", title: "Erreur", description: error.message }); setLoading(false); }
  };

  const PERIODE_OPTIONS = [
    { key: 'jour' as const, label: 'Jour', tarif: TARIFS.jour },
    { key: 'semaine' as const, label: 'Semaine', tarif: TARIFS.semaine },
    { key: 'mois' as const, label: 'Mois', tarif: TARIFS.mois },
    { key: 'trimestre' as const, label: 'Trimestre', tarif: TARIFS.trimestre },
    { key: 'semestre' as const, label: 'Semestre', tarif: TARIFS.semestre },
    { key: 'annee' as const, label: 'Année', tarif: TARIFS.annee },
  ];

  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="py-3 px-4 shadow-lg sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, #00643C, #004d2e)' }}>
        <div className="container mx-auto flex items-center gap-3 max-w-lg lg:max-w-4xl">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/15 h-9 w-9"><ArrowLeft className="h-5 w-5" /></Button>
          <img src={logoWhiteBg} alt="AgriCapital" className="h-7 object-contain rounded" />
          <span className="font-semibold text-white text-sm">Paiement</span>
        </div>
      </header>

      {/* Step Progress */}
      <div className="px-4 py-3 bg-card border-b">
        <div className="container mx-auto max-w-lg lg:max-w-4xl">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${i <= stepIndex ? 'text-primary' : 'text-muted-foreground'}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4 max-w-lg lg:max-w-4xl">

        {/* Step 1: Type */}
        {step === 'type' && (
          <Card className="card-brand rounded-2xl shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1"><CreditCard className="h-5 w-5 text-primary" /><h3 className="text-base font-bold">Type de paiement</h3></div>
              <RadioGroup value={typePaiement} onValueChange={(v) => setTypePaiement(v as any)} className="space-y-3">
                {[
                  { val: 'redevance', title: "Mensualité", desc: "Contributions mensuelles progressives", badge: plantationRate ? `${fmt(plantationRate.mensuel_par_ha)}/mois` : '', icon: "📅" },
                  { val: 'da', title: "Dépôt Initial", desc: "Activer vos hectares", badge: `${fmt(TARIFS.da_par_hectare)}/ha`, icon: "🔑" },
                ].map(opt => (
                  <div key={opt.val} onClick={() => setTypePaiement(opt.val as any)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${typePaiement === opt.val ? 'border-gold bg-gold/5 shadow-sm' : 'border-border hover:border-gold/30'}`}>
                    <span className="text-2xl">{opt.icon}</span>
                    <RadioGroupItem value={opt.val} className="sr-only" />
                    <div className="flex-1"><span className="font-bold text-sm block">{opt.title}</span><span className="text-xs text-muted-foreground">{opt.desc}</span></div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 bg-gold/10 text-gold-dark border-gold/30">{opt.badge}</Badge>
                  </div>
                ))}
              </RadioGroup>

              {/* Tariff Grid Display */}
              {tariffGrid && (
                <Card className="bg-muted/20 border-dashed rounded-xl">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gold" />
                      <span className="text-xs font-bold">Grille tarifaire — {souscripteur.offres?.nom || ''} (par hectare)</span>
                    </div>
                    <div className="space-y-1">
                      {tariffGrid.map((row, i) => (
                        <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${plantationRate?.annee === i + 1 ? 'bg-primary/10 font-bold text-primary' : 'text-muted-foreground'}`}>
                          <span>{row.label} {plantationRate?.annee === i + 1 && '← actuel'}</span>
                          <span>{fmt(row.mensuel)}/mois</span>
                        </div>
                      ))}
                    </div>
                    {plantationRate && (
                      <div className="mt-2 pt-2 border-t border-dashed">
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                          <div className="bg-card rounded-lg p-1.5">
                            <p className="text-muted-foreground">Jour</p>
                            <p className="font-bold">{fmt(plantationRate.jour_par_ha)}</p>
                          </div>
                          <div className="bg-card rounded-lg p-1.5">
                            <p className="text-muted-foreground">Semaine</p>
                            <p className="font-bold">{fmt(plantationRate.semaine_par_ha)}</p>
                          </div>
                          <div className="bg-card rounded-lg p-1.5">
                            <p className="text-muted-foreground">Trimestre</p>
                            <p className="font-bold">{fmt(plantationRate.trimestre_par_ha)}</p>
                          </div>
                          <div className="bg-card rounded-lg p-1.5">
                            <p className="text-muted-foreground">Semestre</p>
                            <p className="font-bold">{fmt(plantationRate.semestre_par_ha)}</p>
                          </div>
                          <div className="bg-card rounded-lg p-1.5">
                            <p className="text-muted-foreground">Année</p>
                            <p className="font-bold">{fmt(plantationRate.annuel_par_ha)}</p>
                          </div>
                          <div className="bg-gold/10 rounded-lg p-1.5">
                            <p className="text-gold-dark font-bold">Total</p>
                            <p className="font-black text-gold-dark">{fmt(plantationRate.schedule.total_par_ha)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button onClick={() => setStep('plantation')} className="w-full h-12 rounded-xl font-bold btn-brand-green">
                Continuer <ArrowLeft className="h-4 w-4 rotate-180 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Plantation */}
        {step === 'plantation' && (
          <Card className="card-brand rounded-2xl shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('type')} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                <MapPin className="h-5 w-5 text-primary" /><h3 className="text-base font-bold">Choisir la plantation</h3>
              </div>
              {plantations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gold" /><p className="font-semibold">Aucune plantation</p><p className="text-xs mt-1">Contactez votre technico-commercial</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plantations.map((plant: any) => {
                    const etat = calculerArrieres(plant);
                    const pRate = getCurrentRate(souscripteur?.offres?.code, plant.date_activation, souscripteur?.offres?.contribution_mensuelle_par_ha || 0);
                    const isSelectable = typePaiement === 'da' ? (plant.superficie_ha - (plant.superficie_activee || 0)) > 0 : (plant.superficie_activee || 0) > 0;
                    return (
                      <div key={plant.id} onClick={() => isSelectable && setSelectedPlantation(plant.id)}
                        className={`p-4 rounded-2xl border-2 transition-all ${selectedPlantation === plant.id ? 'border-gold bg-gold/5 shadow-sm' : isSelectable ? 'border-border hover:border-gold/30 cursor-pointer' : 'border-border opacity-40'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-sm">{plant.nom_plantation || plant.id_unique}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{plant.id_unique}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {pRate && <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-0">{pRate.label}</Badge>}
                            {selectedPlantation === plant.id && <div className="h-6 w-6 rounded-full bg-gold flex items-center justify-center"><Check className="h-3.5 w-3.5 text-white" /></div>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-muted/50 rounded-xl p-2"><p className="text-muted-foreground">Surface</p><p className="font-bold">{plant.superficie_ha} ha</p></div>
                          <div className="bg-muted/50 rounded-xl p-2"><p className="text-muted-foreground">Activée</p><p className="font-bold">{plant.superficie_activee || 0} ha</p></div>
                        </div>
                        {typePaiement === 'redevance' && plant.date_activation && (
                          <div className={`flex items-center gap-1.5 text-[11px] mt-2 p-2 rounded-xl ${etat.enAvance ? 'bg-primary/5 text-primary' : etat.jours > 0 ? 'bg-destructive/5 text-destructive' : 'bg-muted/30 text-muted-foreground'}`}>
                            {etat.enAvance ? <Trophy className="h-3.5 w-3.5" /> : etat.jours > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            {etat.enAvance ? `En avance : ${etat.jours}j` : etat.jours > 0 ? `Arriéré : ${etat.jours}j (${fmt(etat.montant)})` : 'À jour'}
                          </div>
                        )}
                        {pRate && (
                          <p className="text-[10px] text-muted-foreground mt-1">Tarif actuel : {fmt(pRate.mensuel_par_ha)}/mois/ha</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedPlantation && <Button onClick={() => setStep('details')} className="w-full h-12 rounded-xl font-bold btn-brand-green">Continuer</Button>}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Details */}
        {step === 'details' && plantation && (
          <Card className="card-brand rounded-2xl shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('plantation')} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                <Calculator className="h-5 w-5 text-primary" /><h3 className="text-base font-bold">{typePaiement === 'da' ? "Dépôt Initial" : 'Détails du paiement'}</h3>
              </div>

              <div className="bg-muted/30 rounded-2xl p-3 flex items-center gap-3 card-brand-subtle">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="h-5 w-5 text-primary" /></div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{plantation.nom_plantation || plantation.id_unique}</p>
                  <p className="text-xs text-muted-foreground">{plantation.superficie_activee || plantation.superficie_ha} ha {plantationRate && `· ${plantationRate.label}`}</p>
                </div>
              </div>

              {/* Current rate info */}
              {plantationRate && typePaiement === 'redevance' && (
                <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Leaf className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary">Tarif {plantationRate.label} — {souscripteur.offres?.nom}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{fmt(plantationRate.mensuel_par_ha)}/mois/ha · {fmt(plantationRate.jour_par_ha)}/jour/ha</p>
                  {plantationRate.mois_restants_dans_annee > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">{plantationRate.mois_restants_dans_annee} mois restants à ce tarif</p>
                  )}
                </div>
              )}

              {typePaiement === 'da' ? (
                <div className="space-y-2 text-sm">
                  {[['Superficie totale', `${plantation.superficie_ha} ha`], ['Activée', `${plantation.superficie_activee || 0} ha`], ['À activer', `${plantation.superficie_ha - (plantation.superficie_activee || 0)} ha`], ['Dépôt initial', `${fmt(TARIFS.da_par_hectare)}/ha`]].map(([l, v], i) => (
                    <div key={i} className="flex justify-between py-2 border-b last:border-0"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => { const etat = calculerArrieres(plantation); if (!etat.jours && !etat.enAvance) return null; return (
                    <div className={`p-3 rounded-2xl border ${etat.enAvance ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
                      <div className={`flex items-center gap-2 font-bold text-sm ${etat.enAvance ? 'text-primary' : 'text-destructive'}`}>
                        {etat.enAvance ? <Trophy className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {etat.enAvance ? 'En avance !' : 'Arriéré détecté'}
                      </div>
                      <p className={`text-xs mt-0.5 ${etat.enAvance ? 'text-primary/80' : 'text-destructive/80'}`}>
                        {etat.enAvance ? `${etat.jours}j d'avance — ${fmt(etat.montant)}` : `${etat.jours}j de retard — ${fmt(etat.montant)}`}
                      </p>
                    </div>
                  ); })()}

                  {(modeArriere || montantArriere > 0) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Mode de régularisation</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div onClick={() => setModeArriere('only')} className={`p-3 rounded-2xl border-2 cursor-pointer text-center transition-all ${modeArriere === 'only' ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/30'}`}>
                          <Zap className="h-5 w-5 mx-auto mb-1 text-gold-dark" />
                          <p className="text-xs font-bold">Arriéré seul</p>
                          <p className="text-[10px] text-muted-foreground">{fmt(montantArriere)}</p>
                        </div>
                        <div onClick={() => setModeArriere('avance')} className={`p-3 rounded-2xl border-2 cursor-pointer text-center transition-all ${modeArriere === 'avance' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                          <Plus className="h-5 w-5 mx-auto mb-1 text-primary" />
                          <p className="text-xs font-bold">Arriéré + Avance</p>
                          <p className="text-[10px] text-muted-foreground">Prendre de l'avance</p>
                        </div>
                      </div>
                      <div onClick={() => setModeArriere(null)} className={`p-2.5 rounded-2xl border-2 cursor-pointer text-center transition-all ${modeArriere === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                        <p className="text-xs font-bold">Paiement classique</p>
                      </div>
                    </div>
                  )}

                  {modeArriere === 'avance' && (
                    <div className="space-y-3 p-3 bg-primary/5 rounded-2xl border border-primary/15">
                      <Label className="text-sm font-bold text-primary">Avance supplémentaire</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PERIODE_OPTIONS.map(opt => (
                          <div key={opt.key} onClick={() => { setAvancePeriodType(opt.key); setAvancePeriodCount(1); }}
                            className={`p-2 rounded-xl border-2 cursor-pointer text-center transition-all ${avancePeriodType === opt.key ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30 bg-card'}`}>
                            <p className="text-[11px] font-bold">{opt.label}</p>
                            <p className="text-[9px] text-muted-foreground">{fmt(opt.tarif * (plantation.superficie_activee || 1))}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs shrink-0">Quantité</Label>
                        <Input type="number" min="1" max="24" value={avancePeriodCount} onChange={e => setAvancePeriodCount(Math.max(1, Number(e.target.value)))} className="h-9 text-sm rounded-xl" />
                      </div>
                      <div className="flex justify-between text-sm text-primary font-bold"><span>Avance :</span><span>{fmt(montantAvance)}</span></div>
                    </div>
                  )}

                  {modeArriere === null && (
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Période de paiement</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PERIODE_OPTIONS.map(opt => (
                          <div key={opt.key} onClick={() => { setPeriodType(opt.key); setPeriodCount(1); }}
                            className={`p-2 rounded-xl border-2 cursor-pointer text-center transition-all ${periodType === opt.key ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/30'}`}>
                            <p className="text-[11px] font-bold">{opt.label}</p>
                            <p className="text-[9px] text-muted-foreground">{fmt(opt.tarif * (plantation.superficie_activee || plantation.superficie_ha || 1))}</p>
                          </div>
                        ))}
                      </div>
                      <div onClick={() => setPeriodType('custom')} className={`p-2.5 rounded-xl border-2 cursor-pointer text-center ${periodType === 'custom' ? 'border-gold bg-gold/5' : 'border-border'}`}>
                        <p className="text-xs font-bold">Montant personnalisé</p>
                      </div>
                      {periodType !== 'custom' ? (
                        <div className="flex items-center gap-2"><Label className="text-xs shrink-0">Quantité</Label><Input type="number" min="1" max="36" value={periodCount} onChange={e => setPeriodCount(Math.max(1, Number(e.target.value)))} className="h-9 rounded-xl" /></div>
                      ) : (
                        <div><Label className="text-xs">Montant (F CFA)</Label><Input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="50000" className="h-12 mt-1 rounded-xl" /></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="rounded-2xl p-4 card-brand-subtle bg-muted/20">
                {modeArriere === 'avance' && (
                  <div className="space-y-1 mb-2 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Arriéré :</span><span className="font-bold text-destructive">{fmt(montantArriere)}</span></div>
                    <div className="flex justify-between"><span>Avance :</span><span className="font-bold text-primary">{fmt(montantAvance)}</span></div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base">Total à payer</span>
                  <span className="text-2xl font-black text-primary">{fmt(montantTotal)}</span>
                </div>
              </div>

              <Button onClick={() => setStep('confirm')} disabled={montantTotal <= 0} className="w-full h-12 rounded-xl font-bold btn-brand">
                <CreditCard className="h-5 w-5 mr-2" />Confirmer et payer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && plantation && (
          <Card className="card-brand rounded-2xl shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('details')} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                <h3 className="text-base font-bold">Confirmation</h3>
              </div>

              <div className="bg-primary/5 rounded-2xl p-4 space-y-2.5 text-sm card-brand-subtle">
                {[['Client', souscripteur.nom_complet], ['Téléphone', souscripteur.telephone], ['Plantation', plantation.nom_plantation || plantation.id_unique], ['Type', typePaiement === 'da' ? "Dépôt Initial" : 'Mensualité'], ['Tarif', plantationRate ? `${plantationRate.label} — ${fmt(plantationRate.mensuel_par_ha)}/mois/ha` : '']].filter(([, v]) => v).map(([l, v], i) => (
                  <div key={i} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{v}</span></div>
                ))}
                {modeArriere === 'avance' && (
                  <><div className="flex justify-between text-xs text-muted-foreground"><span>dont arriéré</span><span className="text-destructive font-bold">{fmt(montantArriere)}</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground"><span>dont avance</span><span className="text-primary font-bold">{fmt(montantAvance)}</span></div></>
                )}
                {modeArriere === 'only' && (
                  <div className="flex justify-between text-xs text-gold-dark"><span>Régularisation arriéré</span><span className="font-bold">✓</span></div>
                )}
                <div className="flex justify-between pt-2 border-t"><span className="font-black text-base">Total</span><span className="text-xl font-black text-primary">{fmt(montantTotal)}</span></div>
              </div>

              <Button onClick={handleSubmit} disabled={loading} className="w-full h-14 text-base rounded-xl font-bold btn-brand">
                {loading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Ouverture...</> : <><CreditCard className="h-5 w-5 mr-2" />Procéder au paiement</>}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">Paiement sécurisé — Mobile Money, Wave, Carte bancaire</p>
            </CardContent>
          </Card>
        )}

        <Card className="card-brand-green rounded-2xl shadow-none">
          <CardContent className="p-3 text-center">
            <a href="tel:+2250564551717" className="inline-flex items-center gap-2 text-primary font-bold text-sm"><Phone className="h-4 w-4" />+225 05 64 55 17 17</a>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-card py-3">
        <p className="text-xs text-muted-foreground text-center">© {new Date().getFullYear()} AgriCapital</p>
      </footer>
    </div>
  );
};

export default ClientPayment;
