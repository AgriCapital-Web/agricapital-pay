import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useKkiapay } from "@/hooks/useKkiapay";
import logoWhite from "@/assets/logo-white.png";
import { 
  ArrowLeft, 
  CreditCard, 
  MapPin,
  Check,
  AlertTriangle,
  Calculator,
  Loader2,
  Sparkles,
  Calendar,
  Phone,
  Trophy,
  TrendingUp
} from "lucide-react";

interface ClientPaymentProps {
  souscripteur: any;
  plantations: any[];
  paiements: any[];
  onBack: () => void;
}

// Tarifs par offre - PalmElite par défaut
const TARIFS_PALMELITE = {
  jour: 65,
  mois: 1900,
  trimestre: 5500,
  annee: 20000,
  da_par_hectare: 20000
};

const TARIFS_PALMINVEST = {
  jour: 120,
  mois: 3400,
  trimestre: 9500,
  annee: 35400,
  da_par_hectare: 30000
};

// TerraPalm est entièrement gratuit
const TARIFS_TERRAPALM = {
  jour: 0,
  mois: 0,
  trimestre: 0,
  annee: 0,
  da_par_hectare: 0
};

const ClientPayment = ({ souscripteur, plantations, paiements, onBack }: ClientPaymentProps) => {
  const { toast } = useToast();
  const { openPayment, onSuccess, onFailed, onClose } = useKkiapay();
  const [step, setStep] = useState<'type' | 'plantation' | 'details' | 'confirm'>('type');
  const [typePaiement, setTypePaiement] = useState<'da' | 'redevance'>('da');
  const [selectedPlantation, setSelectedPlantation] = useState<string>('');
  const [periodType, setPeriodType] = useState<'jour' | 'mois' | 'trimestre' | 'annee' | 'custom'>('mois');
  const [periodCount, setPeriodCount] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentPaiementRef, setCurrentPaiementRef] = useState<string | null>(null);

  // Obtenir les infos de la plantation sélectionnée
  const plantation = useMemo(() => {
    return plantations.find(p => p.id === selectedPlantation);
  }, [selectedPlantation, plantations]);

  // Déterminer les tarifs en fonction de l'offre du souscripteur
  const TARIFS = useMemo(() => {
    const offreCode = souscripteur?.offres?.code || 'PALMELITE';
    switch (offreCode) {
      case 'PALMINVEST':
        return TARIFS_PALMINVEST;
      case 'TERRAPALM':
        return TARIFS_TERRAPALM;
      default:
        return TARIFS_PALMELITE;
    }
  }, [souscripteur]);

  // Setup KKiaPay listeners
  useEffect(() => {
    onSuccess(async (response) => {
      console.log('KKiaPay payment success:', response);
      
      if (currentPaiementRef) {
        // Récupérer le paiement pour avoir l'ID de plantation
        const { data: paiementData } = await supabase
          .from('paiements')
          .select('*, plantations(*)')
          .eq('reference', currentPaiementRef)
          .maybeSingle();

        // Mettre à jour le paiement en base
        const { error } = await supabase
          .from('paiements')
          .update({
            statut: 'valide',
            fedapay_transaction_id: response.transactionId, // réutilise la colonne existante pour stocker l'ID KKiaPay
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

        if (error) {
          console.error('Error updating payment:', error);
        } else {
          // Si c'est un paiement DA, activer la plantation
          if (paiementData && paiementData.type_paiement === 'DA' && paiementData.plantation_id) {
            const plantation = paiementData.plantations;
            if (plantation) {
              await supabase
                .from('plantations')
                .update({
                  superficie_activee: plantation.superficie_ha,
                  date_activation: new Date().toISOString(),
                  statut: 'active',
                  statut_global: 'actif'
                })
                .eq('id', paiementData.plantation_id);
              console.log('Plantation activated after DA payment');
            }
          }
          
          // Mettre à jour le total DA versé du souscripteur
          if (paiementData && paiementData.type_paiement === 'DA' && paiementData.souscripteur_id) {
            const { data: allDAPaiements } = await supabase
              .from('paiements')
              .select('montant_paye')
              .eq('souscripteur_id', paiementData.souscripteur_id)
              .eq('type_paiement', 'DA')
              .eq('statut', 'valide');
            
            const totalDA = allDAPaiements?.reduce((sum, p) => sum + (p.montant_paye || 0), 0) || 0;
            
            await supabase
              .from('souscripteurs')
              .update({ total_da_verse: totalDA })
              .eq('id', paiementData.souscripteur_id);
          }
        }
      }

      toast({
        title: "Paiement réussi !",
        description: `Transaction ${response.transactionId} validée avec succès.`
      });
      
      // Retour à l'accueil après succès
      setTimeout(() => onBack(), 2000);
    });

    onFailed((error) => {
      console.log('KKiaPay payment failed:', error);
      toast({
        variant: "destructive",
        title: "Paiement échoué",
        description: error.reason || "Le paiement n'a pas pu être effectué."
      });
      setLoading(false);
    });

    onClose(() => {
      console.log('KKiaPay widget closed');
      setLoading(false);
    });
  }, [currentPaiementRef]);

  // Calculer le montant du DA
  const calculerMontantDA = () => {
    if (!plantation) return 0;
    const superficieRestante = (plantation.superficie_ha || 0) - (plantation.superficie_activee || 0);
    return superficieRestante * TARIFS.da_par_hectare;
  };

  // Calculer les arriérés pour une plantation
  const calculerArrieres = (plant: any) => {
    if (!plant.date_activation || plant.statut_global === 'en_attente_da') return { montant: 0, jours: 0, enAvance: false };
    
    const dateActivation = new Date(plant.date_activation);
    const joursDepuisActivation = Math.floor((new Date().getTime() - dateActivation.getTime()) / (1000 * 60 * 60 * 24));
    const montantAttendu = joursDepuisActivation * TARIFS.jour * (plant.superficie_activee || 0);
    
    const paiementsContrib = paiements.filter(
      p => p.plantation_id === plant.id && p.type_paiement === 'REDEVANCE' && p.statut === 'valide'
    );
    const montantPaye = paiementsContrib.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    
    const difference = montantAttendu - montantPaye;
    
    if (difference > 0) {
      const joursArrieres = Math.floor(difference / (TARIFS.jour * (plant.superficie_activee || 1)));
      return { montant: difference, jours: joursArrieres, enAvance: false };
    } else {
      const joursAvance = Math.floor(Math.abs(difference) / (TARIFS.jour * (plant.superficie_activee || 1)));
      return { montant: Math.abs(difference), jours: joursAvance, enAvance: true };
    }
  };

  // Calculer le montant de la redevance
  const calculerMontantRedevance = () => {
    if (!plantation) return 0;
    const superficie = plantation.superficie_activee || plantation.superficie_ha || 1;
    
    if (periodType === 'custom') {
      return Number(customAmount) || 0;
    }
    
    const tarifUnitaire = TARIFS[periodType];
    return tarifUnitaire * periodCount * superficie;
  };

  // Montant total
  const montantTotal = typePaiement === 'da' ? calculerMontantDA() : calculerMontantRedevance();

  // Soumettre le paiement via KKiaPay
  const handleSubmit = async () => {
    if (!plantation || montantTotal <= 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner une plantation et un montant valide"
      });
      return;
    }

    setLoading(true);
    try {
      // Générer une référence unique
      const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setCurrentPaiementRef(reference);
      
      // Créer le paiement en attente
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
            nombre_mois: periodType === 'mois' ? periodCount : (periodType === 'trimestre' ? periodCount * 3 : periodType === 'annee' ? periodCount * 12 : null),
            trimestre: periodType === 'trimestre' ? periodCount : null,
            annee: new Date().getFullYear(),
            payment_provider: 'kkiapay'
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Ouvrir le widget KKiaPay
      const opened = openPayment({
        amount: Math.round(montantTotal),
        email: souscripteur.email || 'client@agricapital.ci',
        phone: souscripteur.telephone,
        name: souscripteur.nom_complet || `${souscripteur.prenoms} ${souscripteur.nom}`,
        data: {
          reference,
          paiement_id: paiementRow.id,
          plantation_id: plantation.id,
          type: typePaiement,
          description: typePaiement === 'da'
            ? `Droit d'accès - ${plantation.nom_plantation || 'Plantation'}`
            : `Redevance - ${plantation.nom_plantation || 'Plantation'}`
        }
      });

      if (!opened) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible d'ouvrir la page de paiement. Veuillez réessayer."
        });
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Erreur de paiement",
        description: error.message || "Une erreur s'est produite. Veuillez réessayer."
      });
      setLoading(false);
    }
  };

  const formatMontant = (m: number) => {
    return new Intl.NumberFormat("fr-FR").format(m) + " F CFA";
  };

  // Générer les options de période
  const generatePeriodOptions = () => {
    const max = periodType === 'jour' ? 1095 : periodType === 'mois' ? 36 : periodType === 'trimestre' ? 12 : 3;
    return Array.from({ length: max }, (_, i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-primary text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="AgriCapital" className="h-8 object-contain" />
            <span className="font-medium">Effectuer un paiement</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 max-w-lg">
        {/* Étape 1: Type de paiement */}
        {step === 'type' && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Type de paiement
              </CardTitle>
              <CardDescription>Choisissez le type de paiement à effectuer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={typePaiement} 
                onValueChange={(v) => setTypePaiement(v as 'da' | 'redevance')}
                className="space-y-3"
              >
                <div className={`flex items-center space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${typePaiement === 'da' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <RadioGroupItem value="da" id="da" />
                  <Label htmlFor="da" className="flex-1 cursor-pointer">
                    <span className="font-semibold block">Droit d'Accès (DA)</span>
                    <span className="text-sm text-muted-foreground">Activation de nouvelles superficies</span>
                  </Label>
                  <Badge variant="secondary">{formatMontant(TARIFS.da_par_hectare)}/ha</Badge>
                </div>
                
                <div className={`flex items-center space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${typePaiement === 'redevance' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <RadioGroupItem value="redevance" id="redevance" />
                  <Label htmlFor="redevance" className="flex-1 cursor-pointer">
                    <span className="font-semibold block">Redevance mensuelle</span>
                    <span className="text-sm text-muted-foreground">Paiement des redevances mensuelles</span>
                  </Label>
                  <Badge variant="secondary">{formatMontant(TARIFS.jour)}/jour</Badge>
                </div>
              </RadioGroup>

              <Button 
                onClick={() => setStep('plantation')} 
                className="w-full h-12 mt-4"
              >
                Continuer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Sélection plantation */}
        {step === 'plantation' && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('type')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Sélectionner une plantation
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {plantations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                  <p>Aucune plantation enregistrée</p>
                </div>
              ) : (
                plantations.map((plant) => {
                  const etatPaiement = calculerArrieres(plant);
                  const isDAPlant = typePaiement === 'da' && (plant.superficie_ha - (plant.superficie_activee || 0)) > 0;
                  const isRedevancePlant = typePaiement === 'redevance' && (plant.superficie_activee || 0) > 0;
                  const isSelectable = isDAPlant || isRedevancePlant;

                  return (
                    <div 
                      key={plant.id}
                      onClick={() => isSelectable && setSelectedPlantation(plant.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPlantation === plant.id 
                          ? 'border-primary bg-primary/5' 
                          : isSelectable 
                            ? 'border-border hover:border-primary/50' 
                            : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{plant.nom_plantation || plant.id_unique}</p>
                          <p className="text-xs text-muted-foreground">{plant.id_unique}</p>
                        </div>
                        {selectedPlantation === plant.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-muted-foreground">Superficie: </span>
                          <span className="font-medium">{plant.superficie_ha} ha</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Activée: </span>
                          <span className="font-medium">{plant.superficie_activee || 0} ha</span>
                        </div>
                      </div>

                      {/* Statut de paiement */}
                      {typePaiement === 'redevance' && plant.date_activation && (
                        <div className={`flex items-center gap-2 text-sm mt-2 p-2 rounded ${
                          etatPaiement.enAvance 
                            ? 'bg-green-50 text-green-700' 
                            : etatPaiement.jours > 0 
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-50 text-gray-700'
                        }`}>
                          {etatPaiement.enAvance ? (
                            <>
                              <Trophy className="h-4 w-4" />
                              <span>🎉 En avance: {etatPaiement.jours} jour(s) ({formatMontant(etatPaiement.montant)})</span>
                            </>
                          ) : etatPaiement.jours > 0 ? (
                            <>
                              <AlertTriangle className="h-4 w-4" />
                              <span>⚠️ Arriéré: {etatPaiement.jours} jour(s) ({formatMontant(etatPaiement.montant)})</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              <span>À jour</span>
                            </>
                          )}
                        </div>
                      )}

                      {!isSelectable && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {typePaiement === 'da' 
                            ? 'Toute la superficie est déjà activée' 
                            : 'Aucune superficie activée'}
                        </p>
                      )}
                    </div>
                  );
                })
              )}

              {selectedPlantation && (
                <Button 
                  onClick={() => setStep('details')} 
                  className="w-full h-12 mt-4"
                >
                  Continuer
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Étape 3: Détails du paiement */}
        {step === 'details' && plantation && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('plantation')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    {typePaiement === 'da' ? 'Droit d\'accès' : 'Redevance mensuelle'}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Infos plantation */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-semibold">{plantation.nom_plantation || plantation.id_unique}</p>
                <p className="text-sm text-muted-foreground">{plantation.regions?.nom}</p>
              </div>

              {typePaiement === 'da' ? (
                /* Paiement DA */
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Superficie totale</span>
                    <span className="font-medium">{plantation.superficie_ha} ha</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Superficie activée</span>
                    <span className="font-medium">{plantation.superficie_activee || 0} ha</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Superficie à activer</span>
                    <span className="font-medium text-primary">{plantation.superficie_ha - (plantation.superficie_activee || 0)} ha</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tarif DA</span>
                    <span className="font-medium">{formatMontant(TARIFS.da_par_hectare)}/ha</span>
                  </div>
                </div>
              ) : (
                /* Paiement redevance */
                <div className="space-y-4">
                  {/* Afficher l'état actuel */}
                  {(() => {
                    const etat = calculerArrieres(plantation);
                    return etat.jours > 0 || etat.enAvance ? (
                      <div className={`p-4 rounded-lg ${etat.enAvance ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {etat.enAvance ? (
                          <>
                            <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                              <Trophy className="h-5 w-5" />
                              <span>🎉 Félicitations !</span>
                            </div>
                            <p className="text-green-600 text-sm">
                              Vous êtes en avance de {etat.jours} jour(s), soit {formatMontant(etat.montant)}.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                              <AlertTriangle className="h-5 w-5" />
                              <span>⚠️ Attention !</span>
                            </div>
                            <p className="text-red-600 text-sm">
                              Vous avez un arriéré de {etat.jours} jour(s), soit {formatMontant(etat.montant)}.
                            </p>
                          </>
                        )}
                      </div>
                    ) : null;
                  })()}

                  <div>
                    <Label className="text-base font-semibold">Période de paiement</Label>
                    <RadioGroup 
                      value={periodType}
                      onValueChange={(v) => {
                        setPeriodType(v as any);
                        setPeriodCount(1);
                      }}
                      className="grid grid-cols-2 gap-2 mt-3"
                    >
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${periodType === 'jour' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="jour" id="jour" />
                        <Label htmlFor="jour" className="cursor-pointer">
                          <span className="block text-sm font-medium">Jour</span>
                          <span className="text-xs text-muted-foreground">{TARIFS.jour} F/jour</span>
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${periodType === 'mois' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="mois" id="mois" />
                        <Label htmlFor="mois" className="cursor-pointer">
                          <span className="block text-sm font-medium">Mois</span>
                          <span className="text-xs text-muted-foreground">{formatMontant(TARIFS.mois)}</span>
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${periodType === 'trimestre' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="trimestre" id="trimestre" />
                        <Label htmlFor="trimestre" className="cursor-pointer">
                          <span className="block text-sm font-medium">Trimestre</span>
                          <span className="text-xs text-muted-foreground">{formatMontant(TARIFS.trimestre)}</span>
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${periodType === 'annee' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="annee" id="annee" />
                        <Label htmlFor="annee" className="cursor-pointer">
                          <span className="block text-sm font-medium">Année</span>
                          <span className="text-xs text-muted-foreground">{formatMontant(TARIFS.annee)}</span>
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all col-span-2 ${periodType === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="cursor-pointer">
                          <span className="block text-sm font-medium">Saisir un montant</span>
                          <span className="text-xs text-muted-foreground">Montant personnalisé</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {periodType !== 'custom' ? (
                    <div className="space-y-2">
                      <Label>Nombre de {periodType === 'jour' ? 'jours' : periodType === 'mois' ? 'mois' : periodType === 'trimestre' ? 'trimestres' : 'années'}</Label>
                      <Select value={periodCount.toString()} onValueChange={(v) => setPeriodCount(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {generatePeriodOptions().map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Montant à payer (F CFA)</Label>
                      <Input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Ex: 50000"
                        className="h-12 text-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Montant total */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total à payer</span>
                  <span className="text-2xl font-bold text-primary">{formatMontant(montantTotal)}</span>
                </div>
              </div>

              <Button 
                onClick={() => setStep('confirm')} 
                disabled={montantTotal <= 0}
                className="w-full h-12 mt-4 bg-accent hover:bg-accent/90"
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
                <Button variant="ghost" size="icon" onClick={() => setStep('details')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">Confirmation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Partenaire souscripteur</span>
                  <span className="font-medium">{souscripteur.nom_complet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plantation</span>
                  <span className="font-medium">{plantation.nom_plantation || plantation.id_unique}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{typePaiement === 'da' ? 'Droit d\'accès' : 'Redevance mensuelle'}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold text-lg">Montant</span>
                  <span className="text-xl font-bold text-primary">{formatMontant(montantTotal)}</span>
                </div>
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-14 text-lg bg-accent hover:bg-accent/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Ouverture du paiement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Poursuivre le paiement
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Paiement sécurisé - Mobile Money, Wallet, Compte bancaire
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Besoin d'aide ?</p>
            <a 
              href="tel:+2250564551717" 
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              <Phone className="h-4 w-4" />
              +225 05 64 55 17 17
            </a>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4 mt-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 AgriCapital - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPayment;
