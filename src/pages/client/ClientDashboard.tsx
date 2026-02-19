import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.png";
import { 
  User, MapPin, Phone, Calendar, Sprout, CreditCard, Wallet,
  ArrowRight, LogOut, CheckCircle, AlertTriangle, Clock, History, BarChart2,
  RefreshCw, TrendingUp, Leaf, ChevronRight, Zap, Target
} from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ClientDashboardProps {
  souscripteur: any;
  plantations: any[];
  paiements: any[];
  onPayment: (options?: { prefillAmount?: number; prefillType?: 'arriere' | 'avance' }) => void;
  onPortfolio: () => void;
  onHistory: () => void;
  onStatistics: () => void;
  onLogout: () => void;
}

const ClientDashboard = ({ 
  souscripteur: initialSouscripteur, 
  plantations: initialPlantations, 
  paiements: initialPaiements, 
  onPayment, onPortfolio, onHistory, onStatistics, onLogout 
}: ClientDashboardProps) => {
  const { toast } = useToast();
  const [souscripteur, setSouscripteur] = useState(initialSouscripteur);
  const [plantations, setPlantations] = useState(initialPlantations);
  const [paiements, setPaiements] = useState(initialPaiements);
  const [refreshing, setRefreshing] = useState(false);

  const formatMontant = (m: number) => new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";

  const totalHectares = plantations.reduce((sum: number, p: any) => sum + (p.superficie_ha || 0), 0);
  const hectaresActifs = plantations.reduce((sum: number, p: any) => sum + (p.superficie_activee || 0), 0);

  // Calcul des arriérés
  const arriereData = useMemo(() => {
    let totalArrieres = 0;
    let joursRetard = 0;
    const tarifJour = souscripteur.offres?.contribution_mensuelle_par_ha 
      ? (souscripteur.offres.contribution_mensuelle_par_ha / 30) 
      : 65;
    
    plantations.forEach((plantation: any) => {
      if (plantation.date_activation && plantation.superficie_activee > 0) {
        const dateActivation = new Date(plantation.date_activation);
        const jours = Math.floor((Date.now() - dateActivation.getTime()) / (1000 * 60 * 60 * 24));
        const montantAttendu = jours * tarifJour * (plantation.superficie_activee || 0);
        const montantPaye = paiements
          .filter((p: any) => p.plantation_id === plantation.id && (p.type_paiement === 'REDEVANCE' || p.type_paiement === 'contribution') && p.statut === 'valide')
          .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);
        
        if (montantAttendu > montantPaye) {
          const retard = montantAttendu - montantPaye;
          totalArrieres += retard;
          joursRetard = Math.max(joursRetard, Math.floor(retard / (tarifJour * (plantation.superficie_activee || 1))));
        }
      }
    });
    return { totalArrieres, joursRetard };
  }, [plantations, paiements, souscripteur]);

  const { totalArrieres, joursRetard } = arriereData;
  const hasArrieres = totalArrieres > 0;

  // Calcul progression DA
  const daProgress = useMemo(() => {
    const tarifDA = souscripteur.offres?.montant_da_par_ha || 0;
    const totalDA = plantations.reduce((sum: number, p: any) => sum + ((p.superficie_ha || 0) * tarifDA), 0);
    const totalDAVerse = paiements
      .filter((p: any) => p.type_paiement === 'DA' && p.statut === 'valide')
      .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);
    const pct = totalDA > 0 ? Math.min(100, Math.round((totalDAVerse / totalDA) * 100)) : 0;
    return { totalDA, totalDAVerse, pct };
  }, [plantations, paiements, souscripteur]);

  // Prochaines échéances (estimer la prochaine date de paiement mensuelle)
  const prochaines = useMemo(() => {
    const actives = plantations.filter((p: any) => p.superficie_activee > 0 && p.date_activation);
    return actives.slice(0, 3).map((p: any) => {
      const tarifMois = souscripteur.offres?.contribution_mensuelle_par_ha || 0;
      return {
        nom: p.nom_plantation || p.id_unique,
        montant: tarifMois * (p.superficie_activee || 0),
        prochaine: addDays(new Date(), 30),
      };
    });
  }, [plantations, souscripteur]);

  const totalRedevances = paiements
    .filter((p: any) => (p.type_paiement === 'REDEVANCE' || p.type_paiement === 'contribution') && p.statut === 'valide')
    .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);

  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AC';
  const offreNom = souscripteur.offres?.nom || 'Standard';

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscriber-lookup", {
        body: { telephone: souscripteur.telephone }
      });
      if (error) throw error;
      if (data?.success) {
        setSouscripteur(data.souscripteur);
        setPlantations(data.plantations);
        setPaiements(data.paiements);
        sessionStorage.setItem('agri_souscripteur', JSON.stringify(data.souscripteur));
        sessionStorage.setItem('agri_plantations', JSON.stringify(data.plantations));
        sessionStorage.setItem('agri_paiements', JSON.stringify(data.paiements));
        toast({ title: "Données actualisées", description: "Vos informations ont été mises à jour." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'actualiser." });
    } finally {
      setRefreshing(false);
    }
  }, [souscripteur.telephone, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between max-w-lg">
          <img src={logoWhite} alt="AgriCapital" className="h-8 sm:h-10 object-contain" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="text-primary-foreground hover:bg-white/20 h-9 w-9">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} className="text-primary-foreground hover:bg-white/20 h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 space-y-3 max-w-lg overflow-y-auto pb-8">
        
        {/* Welcome Card */}
        <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground border-0 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 opacity-5">
            <Leaf className="h-32 w-32 -rotate-12 translate-x-8 -translate-y-4" />
          </div>
          <CardContent className="p-4 sm:p-5 relative z-10">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
                  {souscripteur.photo_profil_url ? (
                    <img src={souscripteur.photo_profil_url} alt={souscripteur.nom_complet} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-white/20 flex items-center justify-center">
                      <span className="text-lg sm:text-xl font-bold">{getInitials(souscripteur.nom_complet)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs opacity-75">Bienvenue,</p>
                <h2 className="text-base sm:text-lg font-bold truncate">{souscripteur.nom_complet}</h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs opacity-75">
                  <Phone className="h-3 w-3" />
                  <span>{souscripteur.telephone}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="text-[10px] px-2 py-0 bg-white/20 border-0">{offreNom}</Badge>
                  <span className="text-[10px] opacity-50">{souscripteur.id_unique || '—'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === ALERTE ARRIÉRÉS === */}
        {hasArrieres && (
          <Card className="border-2 border-destructive/40 bg-destructive/5 animate-in slide-in-from-top duration-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-destructive text-sm">Arriéré de paiement détecté</p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    {joursRetard} jour(s) de retard — <span className="font-semibold">{formatMontant(totalArrieres)}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => onPayment({ prefillAmount: totalArrieres, prefillType: 'arriere' })}
                  className="h-10 text-xs bg-destructive hover:bg-destructive/90 text-white gap-1.5"
                  size="sm"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Rattraper l'arriéré
                </Button>
                <Button 
                  onClick={() => onPayment({ prefillAmount: totalArrieres, prefillType: 'avance' })}
                  variant="outline"
                  className="h-10 text-xs border-destructive/40 text-destructive gap-1.5"
                  size="sm"
                >
                  <Target className="h-3.5 w-3.5" />
                  Payer + avance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Sprout, value: plantations.length, label: "Plantation(s)", color: "text-primary", bg: "bg-primary/10" },
            { icon: MapPin, value: totalHectares, label: "Hectare(s)", color: "text-accent", bg: "bg-accent/10" },
            { icon: CheckCircle, value: hectaresActifs, label: "Ha. actifs", color: "text-primary", bg: "bg-primary/10" }
          ].map((stat, i) => (
            <Card key={i} className="shadow-sm border-0 bg-background">
              <CardContent className="p-3 text-center">
                <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* === JAUGE PROGRESSION DA === */}
        {daProgress.totalDA > 0 && (
          <Card className="border-0 shadow-sm bg-background">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Droit d'Accès (DA)</span>
                </div>
                <span className="text-sm font-bold text-primary">{daProgress.pct}%</span>
              </div>
              <Progress value={daProgress.pct} className="h-2.5 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Versé : <span className="font-semibold text-primary">{formatMontant(daProgress.totalDAVerse)}</span></span>
                <span>Total : {formatMontant(daProgress.totalDA)}</span>
              </div>
              {daProgress.pct < 100 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reste : <span className="font-semibold text-foreground">{formatMontant(daProgress.totalDA - daProgress.totalDAVerse)}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* === PROCHAINES ÉCHÉANCES === */}
        {prochaines.length > 0 && (
          <Card className="border-0 shadow-sm bg-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-semibold">Prochaines échéances</span>
              </div>
              <div className="space-y-2">
                {prochaines.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{e.nom}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(e.prochaine, "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-accent ml-2 shrink-0">{formatMontant(e.montant)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={() => onPayment()} 
            className="w-full h-14 text-base font-semibold bg-accent hover:bg-accent/90 text-white gap-3 shadow-lg rounded-xl"
          >
            <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="flex-1 text-left">Effectuer un paiement</span>
            <ArrowRight className="h-5 w-5" />
          </Button>

          {[
            { action: onPortfolio, icon: Wallet, label: "Mon portefeuille" },
            { action: onHistory, icon: History, label: "Historique des paiements" },
            { action: onStatistics, icon: BarChart2, label: "Mes statistiques" }
          ].map((btn, i) => (
            <Button 
              key={i}
              onClick={btn.action} 
              variant="outline" 
              className="w-full h-12 text-sm font-medium gap-3 rounded-xl"
            >
              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <btn.icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-left">{btn.label}</span>
              <ChevronRight className="h-4 w-4 opacity-40" />
            </Button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: CheckCircle, label: "DA Versé", value: formatMontant(daProgress.totalDAVerse), iconColor: "text-primary" },
            { icon: CreditCard, label: "Redevances", value: formatMontant(totalRedevances), iconColor: "text-accent" },
            { icon: Calendar, label: "Membre depuis", value: souscripteur.created_at ? format(new Date(souscripteur.created_at), "MMM yyyy", { locale: fr }) : 'N/A', iconColor: "text-muted-foreground" },
            { icon: TrendingUp, label: "Paiements validés", value: String(paiements.filter((p: any) => p.statut === 'valide').length), iconColor: "text-primary" }
          ].map((card, i) => (
            <Card key={i} className="border-0 shadow-sm bg-background">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-sm font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact */}
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Besoin d'aide ?</p>
            <a href="tel:+2250564551717" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
              <Phone className="h-4 w-4" />
              +225 05 64 55 17 17
            </a>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-background py-3">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AgriCapital - Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
};

export default ClientDashboard;
