import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logoWhite from "@/assets/logo-white.png";
import { 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Sprout, 
  CreditCard,
  Wallet,
  ArrowRight,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Clock,
  History,
  BarChart2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";

interface ClientDashboardProps {
  souscripteur: any;
  plantations: any[];
  paiements: any[];
  onPayment: () => void;
  onPortfolio: () => void;
  onHistory: () => void;
  onStatistics: () => void;
  onLogout: () => void;
}

const ClientDashboard = ({ 
  souscripteur: initialSouscripteur, 
  plantations: initialPlantations, 
  paiements: initialPaiements, 
  onPayment, 
  onPortfolio,
  onHistory,
  onStatistics,
  onLogout 
}: ClientDashboardProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [souscripteur, setSouscripteur] = useState(initialSouscripteur);
  const [plantations, setPlantations] = useState(initialPlantations);
  const [paiements, setPaiements] = useState(initialPaiements);

  // Realtime updates pour les paiements
  useRealtime({
    table: 'paiements',
    filter: `souscripteur_id=eq.${souscripteur?.id}`,
    onInsert: (newPaiement) => {
      setPaiements(prev => [newPaiement, ...prev]);
    },
    onUpdate: (updatedPaiement) => {
      setPaiements(prev => prev.map(p => p.id === updatedPaiement.id ? updatedPaiement : p));
    }
  });

  // Realtime updates pour le souscripteur (statut)
  useRealtime({
    table: 'souscripteurs',
    filter: `id=eq.${souscripteur?.id}`,
    onUpdate: (updatedSouscripteur) => {
      setSouscripteur(prev => ({ ...prev, ...updatedSouscripteur }));
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatMontant = (m: number) => {
    return new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";
  };

  // Calculer les statistiques
  const totalHectares = plantations.reduce((sum, p) => sum + (p.superficie_ha || 0), 0);
  const totalDAVerse = souscripteur.total_da_verse || 0;
  const totalRedevances = paiements
    .filter(p => p.statut === 'valide' && p.type_paiement === 'REDEVANCE')
    .reduce((sum, p) => sum + (p.montant_paye || 0), 0);
  
  // Calculer les arriérés (simplifié - 65F/jour)
  const calculateArrieres = () => {
    let totalArrieres = 0;
    let joursRetard = 0;
    
    plantations.forEach(plantation => {
      if (plantation.statut_global === 'en_cours' || plantation.statut_global === 'da_valide') {
        const dateActivation = plantation.date_activation ? new Date(plantation.date_activation) : null;
        if (dateActivation) {
          const joursDepuisActivation = Math.floor((new Date().getTime() - dateActivation.getTime()) / (1000 * 60 * 60 * 24));
          const montantAttendu = joursDepuisActivation * 65 * plantation.superficie_activee;
          const montantPaye = paiements
            .filter(p => p.plantation_id === plantation.id && (p.type_paiement === 'contribution' || p.type_paiement === 'REDEVANCE') && p.statut === 'valide')
            .reduce((sum, p) => sum + (p.montant_paye || 0), 0);
          
          if (montantAttendu > montantPaye) {
            const retard = montantAttendu - montantPaye;
            totalArrieres += retard;
            joursRetard = Math.max(joursRetard, Math.floor(retard / (65 * plantation.superficie_activee)));
          }
        }
      }
    });
    
    return { totalArrieres, joursRetard };
  };

  const { totalArrieres, joursRetard } = calculateArrieres();
  const hasArrieres = totalArrieres > 0;

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AC';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="AgriCapital" className="h-10 object-contain" />
            <span className="text-sm font-medium hidden sm:block">Portail Souscripteur</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-white hover:bg-white/20 gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 space-y-4 max-w-lg overflow-y-auto">
        {/* Welcome Card with Photo */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-0 shadow-xl overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Photo avec bordure stylisée vert-doré */}
              <div className="relative flex-shrink-0">
                <div className="relative">
                  {/* Border gradient effect */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-white via-transparent to-accent rounded-full"></div>
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-4 border-white/30">
                    {souscripteur.photo_url ? (
                      <img 
                        src={souscripteur.photo_url} 
                        alt={souscripteur.nom_complet}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/20 flex items-center justify-center">
                        <span className="text-xl sm:text-2xl font-bold text-white">
                          {getInitials(souscripteur.nom_complet)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Decorative corner borders - vert/doré */}
                <div className="absolute -top-1 -left-1 w-4 h-4 sm:w-6 sm:h-6 border-t-[3px] border-l-[3px] border-white rounded-tl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 border-b-[3px] border-r-[3px] border-accent rounded-br-xl"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm opacity-90">Bienvenue,</p>
                <h2 className="text-base sm:text-lg md:text-xl font-bold truncate">{souscripteur.nom_complet}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm opacity-90">
                  <Phone className="h-3 w-3" />
                  <span>{souscripteur.telephone}</span>
                </div>
                <p className="text-xs opacity-80 mt-1 font-mono">
                  {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert if arriérés avec bouton rattraper */}
        {hasArrieres && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-red-800 text-sm sm:text-base">⚠️ Arriéré de paiement</p>
                  <p className="text-xs sm:text-sm text-red-600">
                    {joursRetard} jour(s) de retard • {formatMontant(totalArrieres)}
                  </p>
                </div>
              </div>
              <Button 
                onClick={onPayment}
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white gap-2 h-10"
                size="sm"
              >
                <CreditCard className="h-4 w-4" />
                Rattraper mes arriérés
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <Sprout className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{plantations.length}</p>
              <p className="text-xs text-muted-foreground">Plantation(s)</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-accent">{totalHectares}</p>
              <p className="text-xs text-muted-foreground">Hectare(s)</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={onPayment}
            className="w-full h-16 text-lg font-semibold bg-accent hover:bg-accent/90 text-white gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <CreditCard className="h-6 w-6" />
            Effectuer un paiement
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>

          <Button 
            onClick={onPortfolio}
            variant="outline"
            className="w-full h-14 text-base font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-white gap-3 transition-all"
          >
            <Wallet className="h-5 w-5" />
            Mon portefeuille
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>

          <Button 
            onClick={onHistory}
            variant="outline"
            className="w-full h-14 text-base font-semibold border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted gap-3 transition-all"
          >
            <History className="h-5 w-5" />
            Historique des paiements
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>

          <Button 
            onClick={onStatistics}
            variant="outline"
            className="w-full h-14 text-base font-semibold border-2 border-blue-500/30 text-blue-600 hover:bg-blue-50 gap-3 transition-all"
          >
            <BarChart2 className="h-5 w-5" />
            Mes statistiques
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">DA Versé</span>
              </div>
              <p className="text-sm font-bold">{formatMontant(totalDAVerse)}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Redevances mensuelles</span>
              </div>
              <p className="text-sm font-bold">{formatMontant(totalRedevances)}</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-muted-foreground">Membre depuis</span>
              </div>
              <p className="text-sm font-medium">
                {souscripteur.created_at 
                  ? format(new Date(souscripteur.created_at), "MMM yyyy", { locale: fr })
                  : 'N/A'
                }
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">Paiements</span>
              </div>
              <p className="text-sm font-bold">{paiements.filter(p => p.statut === 'valide').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
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
            © 2025 AgriCapital - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientDashboard;
