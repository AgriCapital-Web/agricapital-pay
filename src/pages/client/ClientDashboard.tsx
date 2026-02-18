import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logoWhite from "@/assets/logo-white.png";
import { 
  User, MapPin, Phone, Calendar, Sprout, CreditCard, Wallet,
  ArrowRight, LogOut, CheckCircle, AlertTriangle, Clock, History, BarChart2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  onPayment, onPortfolio, onHistory, onStatistics, onLogout 
}: ClientDashboardProps) => {
  const [souscripteur] = useState(initialSouscripteur);
  const [plantations] = useState(initialPlantations);
  const [paiements] = useState(initialPaiements);

  const formatMontant = (m: number) => new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";

  const totalHectares = plantations.reduce((sum: number, p: any) => sum + (p.superficie_ha || 0), 0);
  const hectaresActifs = plantations.reduce((sum: number, p: any) => sum + (p.superficie_activee || 0), 0);
  const totalDAVerse = souscripteur.total_da_verse || 0;
  const totalRedevances = paiements
    .filter((p: any) => (p.type_paiement === 'REDEVANCE' || p.type_paiement === 'contribution') && p.statut === 'valide')
    .reduce((sum: number, p: any) => sum + (p.montant_paye || p.montant || 0), 0);
  
  // Arriérés
  const calculateArrieres = () => {
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
  };

  const { totalArrieres, joursRetard } = calculateArrieres();
  const hasArrieres = totalArrieres > 0;

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AC';
  
  const offreNom = souscripteur.offres?.nom || 'Standard';
  const offreCouleur = souscripteur.offres?.couleur || '#00643C';

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-muted/50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="AgriCapital" className="h-8 sm:h-10 object-contain" />
            <span className="text-sm font-medium hidden sm:block">Portail Souscripteur</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-primary-foreground hover:bg-white/20 gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 space-y-4 max-w-lg overflow-y-auto">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-xl overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-br from-white via-transparent to-accent rounded-full"></div>
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-4 border-white/30">
                  {souscripteur.photo_profil_url ? (
                    <img src={souscripteur.photo_profil_url} alt={souscripteur.nom_complet} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-white/20 flex items-center justify-center">
                      <span className="text-xl sm:text-2xl font-bold">{getInitials(souscripteur.nom_complet)}</span>
                    </div>
                  )}
                </div>
                <div className="absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 border-t-[3px] border-l-[3px] border-white rounded-tl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 border-b-[3px] border-r-[3px] border-accent rounded-br-xl"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm opacity-90">Bienvenue,</p>
                <h2 className="text-base sm:text-lg md:text-xl font-bold truncate">{souscripteur.nom_complet}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm opacity-90">
                  <Phone className="h-3 w-3" />
                  <span>{souscripteur.telephone}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="text-[10px] px-2 py-0" style={{ backgroundColor: offreCouleur }}>
                    {offreNom}
                  </Badge>
                  <span className="text-[10px] opacity-70">ID: {souscripteur.id_unique || '—'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert arriérés */}
        {hasArrieres && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-destructive text-sm sm:text-base">⚠️ Arriéré de paiement</p>
                  <p className="text-xs sm:text-sm text-destructive/80">
                    {joursRetard} jour(s) de retard • {formatMontant(totalArrieres)}
                  </p>
                </div>
              </div>
              <Button onClick={onPayment} className="w-full mt-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 h-10" size="sm">
                <CreditCard className="h-4 w-4" />
                Rattraper mes arriérés
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-3 text-center">
              <Sprout className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-primary">{plantations.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Plantation(s)</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-3 text-center">
              <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-accent mx-auto mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-accent">{totalHectares}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Hectare(s)</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-primary">{hectaresActifs}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Ha. actifs</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={onPayment} className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold bg-accent hover:bg-accent/90 text-white gap-3 shadow-lg">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
            Effectuer un paiement
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>

          <Button onClick={onPortfolio} variant="outline" className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground gap-3">
            <Wallet className="h-5 w-5" />
            Mon portefeuille
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>

          <Button onClick={onHistory} variant="outline" className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted gap-3">
            <History className="h-5 w-5" />
            Historique des paiements
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>

          <Button onClick={onStatistics} variant="outline" className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold border-2 border-blue-500/30 text-blue-600 hover:bg-blue-50 gap-3">
            <BarChart2 className="h-5 w-5" />
            Mes statistiques
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">DA Versé</span>
              </div>
              <p className="text-sm font-bold">{formatMontant(totalDAVerse)}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Redevances</span>
              </div>
              <p className="text-sm font-bold">{formatMontant(totalRedevances)}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">Membre depuis</span>
              </div>
              <p className="text-sm font-medium">
                {souscripteur.created_at ? format(new Date(souscripteur.created_at), "MMM yyyy", { locale: fr }) : 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">Paiements validés</span>
              </div>
              <p className="text-sm font-bold">{paiements.filter((p: any) => p.statut === 'valide').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Besoin d'aide ?</p>
            <a href="tel:+2250564551717" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
              <Phone className="h-4 w-4" />
              +225 05 64 55 17 17
            </a>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-background py-3 mt-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AgriCapital - Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
};

export default ClientDashboard;
