import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useKkiapay } from "@/hooks/useKkiapay";
import logoWhite from "@/assets/logo-white.png";
import { 
  ArrowLeft, CreditCard, MapPin, Check, AlertTriangle,
  Calculator, Loader2, Phone, Trophy, Target, Zap, Plus
} from "lucide-react";

interface ClientPaymentProps {
  souscripteur: any;
  plantations: any[];
  paiements: any[];
  onBack: () => void;
  prefillAmount?: number;
  prefillType?: 'arriere' | 'avance';
}

const ClientPayment = ({ souscripteur, plantations, paiements, onBack, prefillAmount, prefillType }: ClientPaymentProps) => {
  const { toast } = useToast();
  const { openPayment, onSuccess, onFailed, onClose } = useKkiapay();
  const [step, setStep] = useState<'type' | 'plantation' | 'details' | 'confirm'>('type');
  const [typePaiement, setTypePaiement] = useState<'da' | 'redevance'>('redevance');
  const [selectedPlantation, setSelectedPlantation] = useState<string>('');
  const [periodType, setPeriodType] = useState<'jour' | 'semaine' | 'mois' | 'trimestre' | 'semestre' | 'annee' | 'custom'>('mois');
  const [periodCount, setPeriodCount] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentPaiementRef, setCurrentPaiementRef] = useState<string | null>(null);
  
  // Mode arriéré + avance
  const [modeArriere, setModeArriere] = useState<'only' | 'avance' | null>(null);
  const [avancePeriodType, setAvancePeriodType] = useState<'jour' | 'semaine' | 'mois' | 'trimestre' | 'semestre' | 'annee'>('mois');
  const [avancePeriodCount, setAvancePeriodCount] = useState<number>(1);

  // Initialiser selon les options passées depuis le dashboard
  useEffect(() => {
    if (prefillType === 'arriere') {
      setTypePaiement('redevance');
      setModeArriere('only');
      // Sélectionner la première plantation active
      const premiere = plantations.find((p: any) => p.superficie_activee > 0);
      if (premiere) setSelectedPlantation(premiere.id);
      setStep('details');
    } else if (prefillType === 'avance') {
      setTypePaiement('redevance');
      setModeArriere('avance');
      const premiere = plantations.find((p: any) => p.superficie_activee > 0);
      if (premiere) setSelectedPlantation(premiere.id);
      setStep('details');
    }
  }, [prefillType]);

  const plantation = useMemo(() => plantations.find(p => p.id === selectedPlantation), [selectedPlantation, plantations]);

  const TARIFS = useMemo(() => {
    const offre = souscripteur?.offres;
    if (offre) {
      const cm = offre.contribution_mensuelle_par_ha || 0;
      return {
        jour: Math.round(cm / 30),
        semaine: Math.round(cm / 4),
        mois: cm,
        trimestre: cm * 3,
        semestre: cm * 6,
        annee: cm * 12,
        da_par_hectare: offre.montant_da_par_ha || 0
      };
    }
    return { jour: 65, semaine: 450, mois: 1900, trimestre: 5500, semestre: 11000, annee: 20000, da_par_hectare: 20000 };
  }, [souscripteur]);

  useEffect(() => {
    onSuccess(async (response) => {
      if (currentPaiementRef) {
        const { data: paiementData } = await supabase
          .from('paiements')
          .select('*, plantations(*)')
          .eq('reference', currentPaiementRef)
          .maybeSingle();

        const { error } = await supabase
          .from('paiements')
          .update({
            statut: 'valide',
            date_paiement: new Date().toISOString(),
            montant_paye: response.amount || paiementData?.montant || 0,
            metadata: {
              payment_provider: 'kkiapay',
              kkiapay_transaction_id: response.transactionId,
              method: response.method || null,
              fees: response.fees || 0,
              performed_at: response.performedAt || null
            }
          })
          .eq('reference', currentPaiementRef);

        if (!error && paiementData?.type_paiement === 'DA' && paiementData?.plantation_id) {
          const p = paiementData.plantations;
          if (p) {
            await supabase.from('plantations').update({
              superficie_activee: p.superficie_ha,
              date_activation: new Date().toISOString(),
              statut: 'active',
              statut_global: 'actif'
            }).eq('id', paiementData.plantation_id);
          }
        }
      }
      toast({ title: "Paiement réussi !", description: `Transaction ${response.transactionId} validée.` });
      setTimeout(() => onBack(), 2000);
    });

    onFailed((error) => {
      toast({ variant: "destructive", title: "Paiement échoué", description: error.reason });
      setLoading(false);
    });

    onClose(() => setLoading(false));
  }, [currentPaiementRef]);

  const calculerArrieres = (plant: any) => {
    if (!plant?.date_activation || plant.statut_global === 'en_attente_da') return { montant: 0, jours: 0, enAvance: false };
    const jours = Math.floor((new Date().getTime() - new Date(plant.date_activation).getTime()) / 86400000);
    const attendu = jours * TARIFS.jour * (plant.superficie_activee || 0);
    const paye = paiements
      .filter((p: any) => p.plantation_id === plant.id && p.type_paiement === 'REDEVANCE' && p.statut === 'valide')
      .reduce((sum: number, p: any) => sum + (p.montant_paye || 0), 0);
    const diff = attendu - paye;
    if (diff > 0) return { montant: diff, jours: Math.floor(diff / (TARIFS.jour * (plant.superficie_activee || 1))), enAvance: false };
    return { montant: Math.abs(diff), jours: Math.floor(Math.abs(diff) / (TARIFS.jour * (plant.superficie_activee || 1))), enAvance: true };
  };

  const calculerMontantAvance = () => {
    if (!plantation) return 0;
    const superficie = plantation.superficie_activee || plantation.superficie_ha || 1;
    const tarif = TARIFS[avancePeriodType];
    return tarif * avancePeriodCount * superficie;
  };

  const calculerMontantRedevance = () => {
    if (!plantation) return 0;
    const superficie = plantation.superficie_activee || plantation.superficie_ha || 1;
    if (periodType === 'custom') return Number(customAmount) || 0;
    return TARIFS[periodType] * periodCount * superficie;
  };

  const montantArriere = plantation ? calculerArrieres(plantation).montant : 0;
  const montantAvance = calculerMontantAvance();
  const montantTotal = useMemo(() => {
    if (typePaiement === 'da') {
      if (!plantation) return 0;
      return (plantation.superficie_ha - (plantation.superficie_activee || 0)) * TARIFS.da_par_hectare;
    }
    if (modeArriere === 'only') return montantArriere;
    if (modeArriere === 'avance') return montantArriere + montantAvance;
    return calculerMontantRedevance();
  }, [typePaiement, plantation, modeArriere, montantArriere, montantAvance, periodType, periodCount, customAmount, avancePeriodType, avancePeriodCount]);

  const handleSubmit = async () => {
    if (!plantation || montantTotal <= 0) {
      toast({ variant: "destructive", title: "Erreur", description: "Plantation et montant requis" });
      return;
    }
    setLoading(true);
    try {
      const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setCurrentPaiementRef(reference);
      const { data: paiementRow, error: insertError } = await supabase
        .from('paiements')
        .insert({
          souscripteur_id: souscripteur.id,
          plantation_id: plantation.id,
          type_paiement: typePaiement === 'da' ? 'DA' : 'REDEVANCE',
          montant: montantTotal,
          statut: 'en_attente',
          mode_paiement: 'Mobile Money',
          reference,
          metadata: {
            mode_arriere: modeArriere,
            montant_arriere: modeArriere ? montantArriere : null,
            montant_avance: modeArriere === 'avance' ? montantAvance : null,
            avance_periode: modeArriere === 'avance' ? avancePeriodType : null,
            avance_count: modeArriere === 'avance' ? avancePeriodCount : null,
            payment_provider: 'kkiapay'
          }
        })
        .select().single();
      if (insertError) throw insertError;
      const opened = openPayment({
        amount: Math.round(montantTotal),
        email: souscripteur.email || 'client@agricapital.ci',
        phone: souscripteur.telephone,
        name: souscripteur.nom_complet || `${souscripteur.prenoms} ${souscripteur.nom}`,
        data: { reference, paiement_id: paiementRow.id, plantation_id: plantation.id, type: typePaiement }
      });
      if (!opened) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ouvrir la page de paiement." });
        setLoading(false);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      setLoading(false);
    }
  };

  const formatMontant = (m: number) => new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";

  const PERIODE_OPTIONS = [
    { key: 'jour', label: 'Jour', tarif: TARIFS.jour },
    { key: 'semaine', label: 'Semaine', tarif: TARIFS.semaine },
    { key: 'mois', label: 'Mois', tarif: TARIFS.mois },
    { key: 'trimestre', label: 'Trimestre', tarif: TARIFS.trimestre },
    { key: 'semestre', label: 'Semestre', tarif: TARIFS.semestre },
    { key: 'annee', label: 'Année', tarif: TARIFS.annee },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-primary text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4 max-w-lg">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logoWhite} alt="AgriCapital" className="h-8 object-contain" />
          <span className="font-medium">Effectuer un paiement</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 space-y-4 max-w-lg">

        {/* Étape 1: Type */}
        {step === 'type' && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Type de paiement
              </CardTitle>
              <CardDescription>Choisissez le type de paiement à effectuer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup value={typePaiement} onValueChange={(v) => setTypePaiement(v as any)} className="space-y-3">
                {[
                  { val: 'redevance', title: "Redevance mensuelle", desc: "Paiement des contributions mensuelles", badge: `${formatMontant(TARIFS.jour)}/jour` },
                  { val: 'da', title: "Droit d'Accès (DA)", desc: "Activation de nouvelles superficies", badge: `${formatMontant(TARIFS.da_par_hectare)}/ha` },
                ].map(opt => (
                  <div
                    key={opt.val}
                    onClick={() => setTypePaiement(opt.val as any)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${typePaiement === opt.val ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <RadioGroupItem value={opt.val} />
                    <div className="flex-1">
                      <span className="font-semibold block text-sm">{opt.title}</span>
                      <span className="text-xs text-muted-foreground">{opt.desc}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{opt.badge}</Badge>
                  </div>
                ))}
              </RadioGroup>
              <Button onClick={() => setStep('plantation')} className="w-full h-12 mt-2">Continuer</Button>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Sélection plantation */}
        {step === 'plantation' && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('type')}><ArrowLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Sélectionner une plantation
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {plantations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
                  <p>Aucune plantation enregistrée</p>
                </div>
              ) : (
                plantations.map((plant: any) => {
                  const etat = calculerArrieres(plant);
                  const isSelectable = typePaiement === 'da'
                    ? (plant.superficie_ha - (plant.superficie_activee || 0)) > 0
                    : (plant.superficie_activee || 0) > 0;
                  const daRestant = (plant.superficie_ha - (plant.superficie_activee || 0)) * TARIFS.da_par_hectare;
                  return (
                    <div
                      key={plant.id}
                      onClick={() => isSelectable && setSelectedPlantation(plant.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedPlantation === plant.id ? 'border-primary bg-primary/5' :
                        isSelectable ? 'border-border hover:border-primary/50 cursor-pointer' : 'border-border opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm">{plant.nom_plantation || plant.id_unique}</p>
                          <p className="text-xs text-muted-foreground font-mono">{plant.id_unique}</p>
                        </div>
                        {selectedPlantation === plant.id && <Check className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-muted-foreground">Superficie</p>
                          <p className="font-semibold">{plant.superficie_ha} ha</p>
                        </div>
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-muted-foreground">Activée</p>
                          <p className="font-semibold">{plant.superficie_activee || 0} ha</p>
                        </div>
                      </div>
                      {typePaiement === 'da' && (
                        <div className="text-xs">
                          <div className="flex justify-between text-muted-foreground mb-1">
                            <span>DA restant</span>
                            <span className="font-semibold text-primary">{formatMontant(daRestant)}</span>
                          </div>
                          <Progress value={plant.superficie_ha > 0 ? ((plant.superficie_activee || 0) / plant.superficie_ha) * 100 : 0} className="h-1.5" />
                        </div>
                      )}
                      {typePaiement === 'redevance' && plant.date_activation && (
                        <div className={`flex items-center gap-2 text-xs mt-2 p-2 rounded-lg ${etat.enAvance ? 'bg-green-50 text-green-700' : etat.jours > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                          {etat.enAvance ? <Trophy className="h-3.5 w-3.5" /> : etat.jours > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          <span>{etat.enAvance ? `En avance: ${etat.jours}j (${formatMontant(etat.montant)})` : etat.jours > 0 ? `Arriéré: ${etat.jours}j (${formatMontant(etat.montant)})` : 'À jour'}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {selectedPlantation && (
                <Button onClick={() => setStep('details')} className="w-full h-12 mt-2">Continuer</Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Étape 3: Détails */}
        {step === 'details' && plantation && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep(prefillType ? 'plantation' : 'plantation')}><ArrowLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  {typePaiement === 'da' ? "Droit d'Accès" : 'Redevance'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Info plantation */}
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="font-semibold text-sm">{plantation.nom_plantation || plantation.id_unique}</p>
                <p className="text-xs text-muted-foreground">{plantation.superficie_activee || plantation.superficie_ha} ha activés</p>
              </div>

              {typePaiement === 'da' ? (
                <div className="space-y-3 text-sm">
                  {[
                    ['Superficie totale', `${plantation.superficie_ha} ha`],
                    ['Superficie activée', `${plantation.superficie_activee || 0} ha`],
                    ['À activer', `${plantation.superficie_ha - (plantation.superficie_activee || 0)} ha`],
                    ['Tarif DA', `${formatMontant(TARIFS.da_par_hectare)}/ha`],
                  ].map(([l, v], i) => (
                    <div key={i} className="flex justify-between py-2 border-b last:border-0">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Etat arriéré */}
                  {(() => {
                    const etat = calculerArrieres(plantation);
                    if (!etat.jours && !etat.enAvance) return null;
                    return (
                      <div className={`p-3 rounded-xl border ${etat.enAvance ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className={`flex items-center gap-2 font-semibold text-sm mb-1 ${etat.enAvance ? 'text-green-700' : 'text-red-700'}`}>
                          {etat.enAvance ? <Trophy className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          {etat.enAvance ? '🎉 Félicitations !' : '⚠️ Arriéré détecté'}
                        </div>
                        <p className={`text-xs ${etat.enAvance ? 'text-green-600' : 'text-red-600'}`}>
                          {etat.enAvance 
                            ? `En avance de ${etat.jours} jour(s) — ${formatMontant(etat.montant)}`
                            : `Arriéré de ${etat.jours} jour(s) — ${formatMontant(etat.montant)}`}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Mode de paiement arriéré */}
                  {(modeArriere || montantArriere > 0) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Mode de régularisation</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div
                          onClick={() => setModeArriere('only')}
                          className={`p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${modeArriere === 'only' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <Zap className="h-5 w-5 mx-auto mb-1 text-destructive" />
                          <p className="text-xs font-semibold">Arriéré uniquement</p>
                          <p className="text-[10px] text-muted-foreground">{formatMontant(montantArriere)}</p>
                        </div>
                        <div
                          onClick={() => setModeArriere('avance')}
                          className={`p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${modeArriere === 'avance' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <Plus className="h-5 w-5 mx-auto mb-1 text-primary" />
                          <p className="text-xs font-semibold">Arriéré + Avance</p>
                          <p className="text-[10px] text-muted-foreground">Prendre de l'avance</p>
                        </div>
                        <div
                          onClick={() => setModeArriere(null)}
                          className={`p-3 rounded-xl border-2 cursor-pointer text-center transition-all col-span-2 ${modeArriere === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <Target className="h-4 w-4 mx-auto mb-1 text-accent" />
                          <p className="text-xs font-semibold">Paiement classique (choisir période)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Avance de paiement */}
                  {modeArriere === 'avance' && (
                    <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <Label className="text-sm font-semibold text-primary">Choisir une avance supplémentaire</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {PERIODE_OPTIONS.map(opt => (
                          <div
                            key={opt.key}
                            onClick={() => { setAvancePeriodType(opt.key); setAvancePeriodCount(1); }}
                            className={`p-2 rounded-lg border-2 cursor-pointer text-center transition-all ${avancePeriodType === opt.key ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 bg-white'}`}
                          >
                            <p className="text-xs font-semibold">{opt.label}</p>
                            <p className="text-[10px] text-muted-foreground">{formatMontant(opt.tarif * (plantation.superficie_activee || 1))}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs shrink-0">Nombre de {avancePeriodType === 'jour' ? 'jours' : avancePeriodType === 'semaine' ? 'semaines' : avancePeriodType === 'mois' ? 'mois' : avancePeriodType === 'trimestre' ? 'trimestres' : avancePeriodType === 'semestre' ? 'semestres' : 'années'}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          value={avancePeriodCount}
                          onChange={e => setAvancePeriodCount(Math.max(1, Number(e.target.value)))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="flex justify-between text-sm text-primary font-semibold">
                        <span>Montant avance :</span>
                        <span>{formatMontant(montantAvance)}</span>
                      </div>
                    </div>
                  )}

                  {/* Paiement classique */}
                  {modeArriere === null && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Période de paiement</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {PERIODE_OPTIONS.map(opt => (
                          <div
                            key={opt.key}
                            onClick={() => { setPeriodType(opt.key); setPeriodCount(1); }}
                            className={`p-2 rounded-xl border-2 cursor-pointer text-center transition-all ${periodType === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                          >
                            <p className="text-xs font-semibold">{opt.label}</p>
                            <p className="text-[10px] text-muted-foreground">{formatMontant(opt.tarif)}</p>
                          </div>
                        ))}
                        <div
                          onClick={() => setPeriodType('custom')}
                          className={`p-2 rounded-xl border-2 cursor-pointer text-center transition-all col-span-3 ${periodType === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <p className="text-xs font-semibold">Montant personnalisé</p>
                        </div>
                      </div>
                      {periodType !== 'custom' ? (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs shrink-0">Quantité</Label>
                          <Input
                            type="number" min="1" max="36"
                            value={periodCount}
                            onChange={e => setPeriodCount(Math.max(1, Number(e.target.value)))}
                            className="h-9"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-xs">Montant (F CFA)</Label>
                          <Input
                            type="number"
                            value={customAmount}
                            onChange={e => setCustomAmount(e.target.value)}
                            placeholder="Ex: 50000"
                            className="h-12 mt-1"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4">
                {modeArriere === 'avance' && (
                  <div className="space-y-1 mb-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Arriéré :</span>
                      <span className="font-semibold text-destructive">{formatMontant(montantArriere)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avance ({avancePeriodCount} {avancePeriodType}) :</span>
                      <span className="font-semibold text-primary">{formatMontant(montantAvance)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base">Total à payer</span>
                  <span className="text-2xl font-bold text-primary">{formatMontant(montantTotal)}</span>
                </div>
              </div>

              <Button
                onClick={() => setStep('confirm')}
                disabled={montantTotal <= 0}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Confirmer et payer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Étape 4: Confirmation */}
        {step === 'confirm' && plantation && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('details')}><ArrowLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-lg">Confirmation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4 space-y-3 text-sm">
                {[
                  ['Souscripteur', souscripteur.nom_complet],
                  ['Téléphone', souscripteur.telephone],
                  ['Plantation', plantation.nom_plantation || plantation.id_unique],
                  ['Type', typePaiement === 'da' ? "Droit d'accès" : 'Redevance mensuelle'],
                ].map(([l, v], i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
                {modeArriere === 'avance' && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>dont arriéré</span>
                      <span className="text-destructive font-semibold">{formatMontant(montantArriere)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>dont avance ({avancePeriodCount} {avancePeriodType})</span>
                      <span className="text-primary font-semibold">{formatMontant(montantAvance)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold text-base">Total</span>
                  <span className="text-xl font-bold text-primary">{formatMontant(montantTotal)}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-14 text-lg bg-accent hover:bg-accent/90 text-white"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Ouverture du paiement...</>
                ) : (
                  <><CreditCard className="h-5 w-5 mr-2" />Poursuivre le paiement</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Paiement sécurisé — Mobile Money, Wave, Carte</p>
            </CardContent>
          </Card>
        )}

        {/* Contact */}
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Besoin d'aide ?</p>
            <a href="tel:+2250564551717" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm">
              <Phone className="h-4 w-4" />
              +225 05 64 55 17 17
            </a>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-white py-4 mt-4">
        <p className="text-xs text-muted-foreground text-center">© {new Date().getFullYear()} AgriCapital</p>
      </footer>
    </div>
  );
};

export default ClientPayment;
