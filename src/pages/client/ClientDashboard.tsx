import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import logoWhite from "@/assets/logo-white.png";
import { 
  MapPin, Phone, Sprout, CreditCard, Wallet, Bell,
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

  const fmt = (m: number) => new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";

  const totalHectares = plantations.reduce((s: number, p: any) => s + (p.superficie_ha || 0), 0);
  const hectaresActifs = plantations.reduce((s: number, p: any) => s + (p.superficie_activee || 0), 0);

  const arriereData = useMemo(() => {
    let totalArrieres = 0;
    let joursRetard = 0;
    const tarifJour = souscripteur.offres?.contribution_mensuelle_par_ha 
      ? (souscripteur.offres.contribution_mensuelle_par_ha / 30) : 65;
    plantations.forEach((p: any) => {
      if (p.date_activation && p.superficie_activee > 0) {
        const jours = Math.floor((Date.now() - new Date(p.date_activation).getTime()) / 86400000);
        const attendu = jours * tarifJour * (p.superficie_activee || 0);
        const paye = paiements
          .filter((pay: any) => pay.plantation_id === p.id && (pay.type_paiement === 'REDEVANCE' || pay.type_paiement === 'contribution') && pay.statut === 'valide')
          .reduce((s: number, pay: any) => s + (pay.montant_paye || pay.montant || 0), 0);
        if (attendu > paye) {
          const retard = attendu - paye;
          totalArrieres += retard;
          joursRetard = Math.max(joursRetard, Math.floor(retard / (tarifJour * (p.superficie_activee || 1))));
        }
      }
    });
    return { totalArrieres, joursRetard };
  }, [plantations, paiements, souscripteur]);

  const { totalArrieres, joursRetard } = arriereData;

  const daProgress = useMemo(() => {
    const tarifDA = souscripteur.offres?.montant_da_par_ha || 0;
    const totalDA = plantations.reduce((s: number, p: any) => s + ((p.superficie_ha || 0) * tarifDA), 0);
    const totalDAVerse = paiements
      .filter((p: any) => p.type_paiement === 'DA' && p.statut === 'valide')
      .reduce((s: number, p: any) => s + (p.montant_paye || p.montant || 0), 0);
    const pct = totalDA > 0 ? Math.min(100, Math.round((totalDAVerse / totalDA) * 100)) : 0;
    return { totalDA, totalDAVerse, pct };
  }, [plantations, paiements, souscripteur]);

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
    .reduce((s: number, p: any) => s + (p.montant_paye || p.montant || 0), 0);

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
        toast({ title: "Données actualisées" });
      }
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'actualiser." });
    } finally {
      setRefreshing(false);
    }
  }, [souscripteur.telephone, toast]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #00643C 0%, #004d2e 35%, #f5f5f0 35.1%, #f5f5f0 100%)' }}>
      {/* Header */}
      <header className="px-4 pt-4 pb-2 sticky top-0 z-50" style={{ background: 'linear-gradient(180deg, #00643C 0%, #004d2e 100%)' }}>
        <div className="container mx-auto flex items-center justify-between max-w-lg">
          <img src={logoWhite} alt="AgriCapital" className="h-8 object-contain" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="text-white hover:bg-white/15 h-9 w-9">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} className="text-white hover:bg-white/15 h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 space-y-3 max-w-lg pb-8" style={{ marginTop: '-1rem' }}>
        
        {/* Profile Card - Glassmorphism */}
        <Card className="border-0 shadow-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0">
                {souscripteur.photo_profil_url ? (
                  <img src={souscripteur.photo_profil_url} alt={souscripteur.nom_complet} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{getInitials(souscripteur.nom_complet)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60">Bienvenue,</p>
                <h2 className="text-base font-bold text-white truncate">{souscripteur.nom_complet}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="text-[10px] px-2 py-0 bg-white/20 border-0 text-white">{offreNom}</Badge>
                  <span className="text-[10px] text-white/40">{souscripteur.id_unique || '—'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats - Glassmorphism on green */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Sprout, value: plantations.length, label: "Plantation(s)", color: "#4ade80" },
            { icon: MapPin, value: totalHectares, label: "Hectare(s)", color: "#fbbf24" },
            { icon: CheckCircle, value: hectaresActifs, label: "Ha. actifs", color: "#60a5fa" }
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-lg" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
              <CardContent className="p-3 text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-1" style={{ color: stat.color }} />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/60">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerte arriérés */}
        {totalArrieres > 0 && (
          <Card className="border-2 border-destructive/30 bg-destructive/5 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-destructive text-sm">Arriéré de paiement</p>
                  <p className="text-xs text-destructive/70 mt-0.5">
                    {joursRetard} jour(s) de retard — <span className="font-bold">{fmt(totalArrieres)}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => onPayment({ prefillAmount: totalArrieres, prefillType: 'arriere' })}
                  className="h-10 text-xs bg-destructive hover:bg-destructive/90 text-white gap-1.5 rounded-xl"
                  size="sm"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Rattraper
                </Button>
                <Button 
                  onClick={() => onPayment({ prefillAmount: totalArrieres, prefillType: 'avance' })}
                  variant="outline"
                  className="h-10 text-xs border-destructive/30 text-destructive gap-1.5 rounded-xl"
                  size="sm"
                >
                  <Target className="h-3.5 w-3.5" />
                  Arriéré + avance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DA Progress */}
        {daProgress.totalDA > 0 && (
          <Card className="border-0 shadow-md bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Droit d'Accès</span>
                </div>
                <span className="text-lg font-bold text-primary">{daProgress.pct}%</span>
              </div>
              <Progress value={daProgress.pct} className="h-3 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Versé : <span className="font-bold text-primary">{fmt(daProgress.totalDAVerse)}</span></span>
                <span>Total : {fmt(daProgress.totalDA)}</span>
              </div>
              {daProgress.pct < 100 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Reste à payer : <span className="font-bold text-foreground">{fmt(daProgress.totalDA - daProgress.totalDAVerse)}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Prochaines échéances */}
        {prochaines.length > 0 && (
          <Card className="border-0 shadow-md bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-semibold">Prochaines échéances</span>
              </div>
              <div className="space-y-2">
                {prochaines.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-muted/30 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{e.nom}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(e.prochaine, "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-accent ml-2 shrink-0">{fmt(e.montant)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Paiement */}
        <Button 
          onClick={() => onPayment()} 
          className="w-full h-14 text-base font-bold gap-3 shadow-xl rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #E89C31, #d4872a)', color: '#fff' }}
        >
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="flex-1 text-left">Effectuer un paiement</span>
          <ArrowRight className="h-5 w-5" />
        </Button>

        {/* Navigation */}
        <div className="space-y-2">
          {[
            { action: onPortfolio, icon: Wallet, label: "Mon portefeuille", desc: "Plantations & profil" },
            { action: onHistory, icon: History, label: "Historique paiements", desc: "Toutes vos transactions" },
            { action: onStatistics, icon: BarChart2, label: "Mes statistiques", desc: "Graphiques & analyses" }
          ].map((btn, i) => (
            <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card" onClick={btn.action}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <btn.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{btn.label}</p>
                  <p className="text-[10px] text-muted-foreground">{btn.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: CheckCircle, label: "DA versé", value: fmt(daProgress.totalDAVerse), color: "text-primary" },
            { icon: CreditCard, label: "Redevances", value: fmt(totalRedevances), color: "text-accent" },
            { icon: TrendingUp, label: "Paiements validés", value: String(paiements.filter((p: any) => p.statut === 'valide').length), color: "text-primary" },
            { icon: Leaf, label: "Offre", value: offreNom, color: "text-primary" }
          ].map((card, i) => (
            <Card key={i} className="border-0 shadow-sm bg-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                  <span className="text-[10px] text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-sm font-bold truncate">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact */}
        <Card className="bg-primary/5 border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1.5">Besoin d'aide ?</p>
            <a href="tel:+2250564551717" className="inline-flex items-center gap-2 text-primary font-bold hover:underline text-sm">
              <Phone className="h-4 w-4" />
              +225 05 64 55 17 17
            </a>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-card py-3">
        <p className="text-xs text-muted-foreground text-center">© {new Date().getFullYear()} AgriCapital</p>
      </footer>
    </div>
  );
};

export default ClientDashboard;
