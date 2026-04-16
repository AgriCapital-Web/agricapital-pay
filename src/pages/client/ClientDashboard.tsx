import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import logoWhiteBg from "@/assets/logo-white-bg.png";
import { getCurrentRate, getFullTariffGrid, formatCFA } from "@/utils/pricing";
import { 
  MapPin, Phone, Sprout, CreditCard, Wallet, Bell,
  ArrowRight, LogOut, CheckCircle, AlertTriangle, Clock, History, BarChart2,
  RefreshCw, TrendingUp, Leaf, ChevronRight, Zap, Target, Calendar
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
  const { permission, isSupported, requestPermission, checkAndNotifyArrears } = usePushNotifications();
  const [souscripteur, setSouscripteur] = useState(initialSouscripteur);
  const [plantations, setPlantations] = useState(initialPlantations);
  const [paiements, setPaiements] = useState(initialPaiements);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (permission === 'granted') checkAndNotifyArrears(plantations, souscripteur);
  }, [permission, plantations, souscripteur, checkAndNotifyArrears]);

  const fmt = (m: number) => formatCFA(m);
  const totalHectares = plantations.reduce((s: number, p: any) => s + (p.superficie_ha || 0), 0);
  const hectaresActifs = plantations.reduce((s: number, p: any) => s + (p.superficie_activee || 0), 0);

  // Get current rate based on first active plantation's activation date
  const firstActivePlantation = plantations.find((p: any) => p.date_activation);
  const currentRate = useMemo(() => getCurrentRate(
    souscripteur.offres?.code,
    firstActivePlantation?.date_activation,
    souscripteur.offres?.contribution_mensuelle_par_ha || 0,
    souscripteur.offres?.montant_da_par_ha || 0,
  ), [souscripteur, firstActivePlantation]);

  const tariffGrid = useMemo(() => getFullTariffGrid(souscripteur.offres?.code), [souscripteur]);

  const arriereData = useMemo(() => {
    let totalArrieres = 0, joursRetard = 0;
    plantations.forEach((p: any) => {
      if (p.date_activation && p.superficie_activee > 0) {
        const plantRate = getCurrentRate(souscripteur.offres?.code, p.date_activation, souscripteur.offres?.contribution_mensuelle_par_ha || 0);
        const tarifJour = plantRate?.jour_par_ha || 65;
        const jours = Math.floor((Date.now() - new Date(p.date_activation).getTime()) / 86400000);
        const attendu = jours * tarifJour * (p.superficie_activee || 0);
        const paye = paiements.filter((pay: any) => pay.plantation_id === p.id && (pay.type_paiement === 'REDEVANCE' || pay.type_paiement === 'contribution') && pay.statut === 'valide')
          .reduce((s: number, pay: any) => s + (pay.montant_paye || pay.montant || 0), 0);
        if (attendu > paye) { totalArrieres += attendu - paye; joursRetard = Math.max(joursRetard, Math.floor((attendu - paye) / (tarifJour * (p.superficie_activee || 1)))); }
      }
    });
    return { totalArrieres, joursRetard };
  }, [plantations, paiements, souscripteur]);

  const { totalArrieres, joursRetard } = arriereData;

  const daProgress = useMemo(() => {
    const tarifDA = currentRate?.schedule.depot_initial || souscripteur.offres?.montant_da_par_ha || 0;
    const totalDA = plantations.reduce((s: number, p: any) => s + ((p.superficie_ha || 0) * tarifDA), 0);
    const totalDAVerse = paiements.filter((p: any) => p.type_paiement === 'DA' && p.statut === 'valide')
      .reduce((s: number, p: any) => s + (p.montant_paye || p.montant || 0), 0);
    return { totalDA, totalDAVerse, pct: totalDA > 0 ? Math.min(100, Math.round((totalDAVerse / totalDA) * 100)) : 0 };
  }, [plantations, paiements, souscripteur, currentRate]);

  const prochaines = useMemo(() => {
    return plantations.filter((p: any) => p.superficie_activee > 0 && p.date_activation).slice(0, 3).map((p: any) => {
      const rate = getCurrentRate(souscripteur.offres?.code, p.date_activation, souscripteur.offres?.contribution_mensuelle_par_ha || 0);
      return {
        nom: p.nom_plantation || p.id_unique,
        montant: (rate?.mensuel_par_ha || 0) * (p.superficie_activee || 0),
        annee: rate?.label || '',
        prochaine: addDays(new Date(), 30),
      };
    });
  }, [plantations, souscripteur]);

  const totalRedevances = paiements.filter((p: any) => (p.type_paiement === 'REDEVANCE' || p.type_paiement === 'contribution') && p.statut === 'valide')
    .reduce((s: number, p: any) => s + (p.montant_paye || p.montant || 0), 0);

  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AC';
  const offreNom = souscripteur.offres?.nom || 'Standard';

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscriber-lookup", { body: { telephone: souscripteur.telephone } });
      if (error) throw error;
      if (data?.success) {
        setSouscripteur(data.souscripteur); setPlantations(data.plantations); setPaiements(data.paiements);
        sessionStorage.setItem('agri_souscripteur', JSON.stringify(data.souscripteur));
        sessionStorage.setItem('agri_plantations', JSON.stringify(data.plantations));
        sessionStorage.setItem('agri_paiements', JSON.stringify(data.paiements));
        toast({ title: "✅ Données actualisées" });
      }
    } catch { toast({ variant: "destructive", title: "Erreur", description: "Impossible d'actualiser." }); }
    finally { setRefreshing(false); }
  }, [souscripteur.telephone, toast]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #00643C 0%, #004d2e 35%, #f8f7f4 35.1%, #f8f7f4 100%)' }}>
      {/* Header */}
      <header className="px-4 pt-4 pb-2 sticky top-0 z-50" style={{ background: 'linear-gradient(180deg, #00643C 0%, #004d2e 100%)' }}>
        <div className="container mx-auto flex items-center justify-between max-w-lg lg:max-w-4xl">
          <img src={logoWhiteBg} alt="AgriCapital" className="h-8 object-contain rounded" />
          <div className="flex items-center gap-1">
            {isSupported && permission !== 'granted' && (
              <Button variant="ghost" size="icon" onClick={requestPermission} className="text-white hover:bg-white/15 h-9 w-9 relative">
                <Bell className="h-4 w-4" /><span className="absolute top-1 right-1 h-2 w-2 bg-gold rounded-full animate-pulse" />
              </Button>
            )}
            {permission === 'granted' && <div className="text-white/60 h-9 w-9 flex items-center justify-center"><Bell className="h-4 w-4" /></div>}
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="text-white hover:bg-white/15 h-9 w-9">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} className="text-white hover:bg-white/15 h-9 w-9"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 lg:px-6 space-y-3 max-w-lg lg:max-w-4xl pb-8" style={{ marginTop: '-1rem' }}>
        
        {/* Profile Card */}
        <Card className="border-0 shadow-xl overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-gold/40 shadow-lg flex-shrink-0">
                {souscripteur.photo_profil_url ? (
                  <img src={souscripteur.photo_profil_url} alt={souscripteur.nom_complet} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{getInitials(souscripteur.nom_complet)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Bienvenue,</p>
                <h2 className="text-base font-bold text-white truncate">{souscripteur.nom_complet}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className="text-[10px] px-2 py-0 bg-gold/20 border-gold/30 text-white">{offreNom}</Badge>
                  {currentRate && <Badge className="text-[10px] px-2 py-0 bg-white/10 border-white/20 text-white/80">{currentRate.label}</Badge>}
                  <span className="text-[10px] text-white/40">{souscripteur.id_unique || '—'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Sprout, value: plantations.length, label: "Plantation(s)", color: "text-green-400" },
            { icon: MapPin, value: totalHectares, label: "Hectare(s)", color: "text-gold" },
            { icon: CheckCircle, value: hectaresActifs, label: "Ha. actifs", color: "text-blue-400" }
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-lg rounded-2xl" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
              <CardContent className="p-3 text-center">
                <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/60">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progressive Tarifs */}
        {currentRate && (
          <Card className="card-brand-gold rounded-2xl shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-gold/10 flex items-center justify-center"><Leaf className="h-3.5 w-3.5 text-gold" /></div>
                <span className="text-xs font-bold text-foreground">Tarifs {offreNom} — {currentRate.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-muted/40 rounded-xl p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Dépôt initial / ha</p>
                  <p className="text-sm font-black text-gold-dark">{fmt(currentRate.schedule.depot_initial)}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Mensuel actuel / ha</p>
                  <p className="text-sm font-black text-primary">{fmt(currentRate.mensuel_par_ha)}</p>
                </div>
              </div>
              {/* Tariff grid - all years */}
              {tariffGrid && (
                <div className="space-y-1 mt-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Grille tarifaire par hectare</p>
                  {tariffGrid.map((row, i) => (
                    <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${currentRate.annee === i + 1 ? 'bg-primary/10 font-bold' : 'bg-muted/20'}`}>
                      <span className={currentRate.annee === i + 1 ? 'text-primary' : 'text-muted-foreground'}>{row.label}</span>
                      <div className="flex gap-3">
                        <span className="text-muted-foreground">{fmt(row.mensuel)}/mois</span>
                        <span className="font-bold">{fmt(row.total)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gold/10 text-xs font-bold">
                    <span className="text-gold-dark">TOTAL ({currentRate.schedule.duree_totale_mois} mois)</span>
                    <span className="text-gold-dark">{fmt(currentRate.schedule.total_par_ha)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alerte arriérés */}
        {totalArrieres > 0 && (
          <Card className="card-brand rounded-2xl shadow-lg border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-destructive text-sm">Arriéré de paiement</p>
                  <p className="text-xs text-destructive/70 mt-0.5">{joursRetard} jour(s) de retard — <span className="font-bold">{fmt(totalArrieres)}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => onPayment({ prefillAmount: totalArrieres, prefillType: 'arriere' })} className="h-10 text-xs gap-1.5 rounded-xl btn-brand">
                  <Zap className="h-3.5 w-3.5" /> Rattraper
                </Button>
                <Button onClick={() => onPayment({ prefillAmount: totalArrieres, prefillType: 'avance' })} variant="outline" className="h-10 text-xs border-gold/40 text-gold-dark gap-1.5 rounded-xl hover:bg-gold/5" size="sm">
                  <Target className="h-3.5 w-3.5" /> Arriéré + avance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DA Progress */}
        {daProgress.totalDA > 0 && (
          <Card className="card-brand-subtle rounded-2xl shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center"><Target className="h-4 w-4 text-primary" /></div>
                  <span className="text-sm font-semibold">Dépôt Initial</span>
                </div>
                <span className="text-lg font-bold text-primary">{daProgress.pct}%</span>
              </div>
              <Progress value={daProgress.pct} className="h-3 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Versé : <span className="font-bold text-primary">{fmt(daProgress.totalDAVerse)}</span></span>
                <span>Total : {fmt(daProgress.totalDA)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prochaines échéances */}
        {prochaines.length > 0 && (
          <Card className="card-brand-subtle rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-xl bg-gold/10 flex items-center justify-center"><Clock className="h-4 w-4 text-gold" /></div>
                <span className="text-sm font-semibold">Prochaines échéances</span>
              </div>
              <div className="space-y-2">
                {prochaines.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-muted/30 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{e.nom}</p>
                      <p className="text-[10px] text-muted-foreground">{format(e.prochaine, "dd MMM yyyy", { locale: fr })} · {e.annee}</p>
                    </div>
                    <span className="text-xs font-bold text-gold-dark ml-2 shrink-0">{fmt(e.montant)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Paiement */}
        <Button onClick={() => onPayment()} className="w-full h-14 text-base font-bold gap-3 shadow-xl rounded-2xl btn-brand">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center"><CreditCard className="h-5 w-5" /></div>
          <span className="flex-1 text-left">Effectuer un paiement</span>
          <ArrowRight className="h-5 w-5" />
        </Button>

        {/* Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3">
          {[
            { action: onPortfolio, icon: Wallet, label: "Mon portefeuille", desc: "Plantations & parcelles" },
            { action: onHistory, icon: History, label: "Historique paiements", desc: "Toutes vos transactions" },
            { action: onStatistics, icon: BarChart2, label: "Mes statistiques", desc: "Graphiques & analyses" }
          ].map((btn, i) => (
            <Card key={i} className="card-brand-subtle rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={btn.action}>
              <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <btn.icon className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm lg:text-base font-semibold">{btn.label}</p>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">{btn.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gold/40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          {[
            { icon: CheckCircle, label: "DI versé", value: fmt(daProgress.totalDAVerse), color: "text-primary" },
            { icon: CreditCard, label: "Redevances", value: fmt(totalRedevances), color: "text-gold-dark" },
            { icon: TrendingUp, label: "Validés", value: String(paiements.filter((p: any) => p.statut === 'valide').length), color: "text-primary" },
            { icon: Leaf, label: "Offre", value: offreNom, color: "text-gold-dark" }
          ].map((card, i) => (
            <Card key={i} className="card-brand-subtle rounded-2xl shadow-sm">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <card.icon className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${card.color}`} />
                  <span className="text-[10px] lg:text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-sm lg:text-base font-bold truncate">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact */}
        <Card className="card-brand-green rounded-2xl shadow-none">
          <CardContent className="p-4 text-center">
            <img src={logoWhiteBg} alt="AgriCapital" className="h-10 mx-auto mb-2 object-contain" />
            <p className="text-xs text-muted-foreground mb-1.5">Besoin d'aide ?</p>
            <a href="tel:+2250564551717" className="inline-flex items-center gap-2 text-primary font-bold hover:underline text-sm">
              <Phone className="h-4 w-4" /> +225 05 64 55 17 17
            </a>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-card py-3">
        <p className="text-[10px] text-muted-foreground text-center">© {new Date().getFullYear()} AgriCapital · Portail Client</p>
      </footer>
    </div>
  );
};

export default ClientDashboard;
