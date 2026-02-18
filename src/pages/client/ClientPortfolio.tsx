import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoWhite from "@/assets/logo-white.png";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Sprout, 
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Home,
  Briefcase,
  MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClientPortfolioProps {
  souscripteur: any;
  plantations: any[];
  paiements: any[];
  onBack: () => void;
}

const ClientPortfolio = ({ souscripteur, plantations, paiements, onBack }: ClientPortfolioProps) => {
  const formatMontant = (m: number) => {
    return new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";
  };

  const getStatutBadge = (statut: string) => {
    const config: any = {
      'en_attente_da': { variant: 'secondary', label: 'En attente DA', icon: Clock },
      'da_valide': { variant: 'default', label: 'DA Validé', icon: CheckCircle },
      'en_cours': { variant: 'default', label: 'En cours', icon: Clock },
      'en_production': { variant: 'default', label: 'En production', icon: Sprout },
      'actif': { variant: 'default', label: 'Actif', icon: CheckCircle },
      'inactif': { variant: 'secondary', label: 'Inactif', icon: Clock },
      'valide': { variant: 'default', label: 'Validé', icon: CheckCircle },
      'en_attente': { variant: 'secondary', label: 'En attente', icon: Clock },
      'rejete': { variant: 'destructive', label: 'Rejeté', icon: AlertTriangle }
    };
    const cfg = config[statut] || { variant: 'secondary', label: statut, icon: Clock };
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  // Statistiques
  const stats = {
    totalPlantations: plantations.length,
    totalHectares: plantations.reduce((sum, p) => sum + (p.superficie_ha || 0), 0),
    hectaresActifs: plantations.reduce((sum, p) => sum + (p.superficie_activee || 0), 0),
    totalDAVerse: souscripteur.total_da_verse || 0,
    totalContributions: paiements.filter(p => p.statut === 'valide' && p.type_paiement === 'REDEVANCE').reduce((sum, p) => sum + (p.montant_paye || 0), 0),
    paiementsValides: paiements.filter(p => p.statut === 'valide').length,
    paiementsEnAttente: paiements.filter(p => p.statut === 'en_attente').length
  };

  const handleWhatsAppTC = () => {
    if (souscripteur.technico_commercial?.telephone) {
      const message = encodeURIComponent(`Bonjour ${souscripteur.technico_commercial.nom_complet}, je suis ${souscripteur.nom_complet} (${souscripteur.telephone}). Je souhaite vous contacter concernant mon compte.`);
      window.open(`https://wa.me/225${souscripteur.technico_commercial.telephone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
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
            <span className="font-medium">Mon portefeuille</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Profil Partenaire Souscripteur */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Photo avec bordure stylisée */}
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-white/30 to-accent/50 p-1">
                  <div className="h-full w-full rounded-full overflow-hidden bg-white">
                    {souscripteur.photo_profil_url ? (
                      <img 
                        src={souscripteur.photo_profil_url} 
                        alt={souscripteur.nom_complet}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                        <User className="h-10 w-10 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-xl"></div>
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold">{souscripteur.nom_complet}</h2>
                <p className="text-sm opacity-90">ID: {souscripteur.id_unique}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{souscripteur.telephone}</span>
                  </div>
                  {souscripteur.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{souscripteur.email}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Partenaire depuis</p>
                <p className="font-semibold">
                  {souscripteur.created_at 
                    ? format(new Date(souscripteur.created_at), "dd MMMM yyyy", { locale: fr })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold">{souscripteur.regions?.nom || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Région</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Home className="h-6 w-6 mx-auto mb-2 text-accent" />
                <p className="text-lg font-bold">{souscripteur.departements?.nom || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Département</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Briefcase className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-lg font-bold">{souscripteur.sous_prefectures?.nom || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Sous-préfecture</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-lg font-bold">{souscripteur.villages?.nom || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Village</p>
              </div>
            </div>

            {/* Technico-Commercial */}
            {souscripteur.technico_commercial && (
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground mb-2">Votre Technico-Commercial</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{souscripteur.technico_commercial.nom_complet}</p>
                      <p className="text-sm text-muted-foreground">{souscripteur.technico_commercial.telephone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={`tel:${souscripteur.technico_commercial.telephone}`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
                    >
                      <Phone className="h-4 w-4" />
                      Appeler
                    </a>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleWhatsAppTC}
                      className="gap-1 border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Sprout className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.totalPlantations}</p>
              <p className="text-xs text-muted-foreground">Plantations</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{stats.totalHectares}</p>
              <p className="text-xs text-muted-foreground">Hectares total</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.hectaresActifs}</p>
              <p className="text-xs text-muted-foreground">Ha. actifs</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.paiementsValides}</p>
              <p className="text-xs text-muted-foreground">Paiements</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="plantations" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="plantations">Plantations</TabsTrigger>
            <TabsTrigger value="paiements">Paiements</TabsTrigger>
            <TabsTrigger value="financier">Résumé</TabsTrigger>
          </TabsList>

          {/* Plantations */}
          <TabsContent value="plantations" className="space-y-4 mt-4">
            {plantations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Sprout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune plantation enregistrée</p>
                </CardContent>
              </Card>
            ) : (
              plantations.map((plantation) => (
                <Card key={plantation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">{plantation.nom_plantation || plantation.id_unique}</p>
                        <p className="text-xs text-muted-foreground">{plantation.id_unique}</p>
                      </div>
                      {getStatutBadge(plantation.statut_global)}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Superficie totale</p>
                        <p className="font-medium">{plantation.superficie_ha} ha</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Superficie active</p>
                        <p className="font-medium">{plantation.superficie_activee || 0} ha</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Région</p>
                        <p className="font-medium">{plantation.regions?.nom || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Type</p>
                        <p className="font-medium">{plantation.type_culture || 'Hévéa'}</p>
                      </div>
                    </div>

                    {plantation.date_activation && (
                      <div className="mt-3 pt-3 border-t text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Activée le {format(new Date(plantation.date_activation), "dd MMMM yyyy", { locale: fr })}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Paiements */}
          <TabsContent value="paiements" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Historique des paiements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paiements.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun paiement enregistré</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paiements.map((paiement) => (
                          <TableRow key={paiement.id}>
                            <TableCell className="text-sm">
                              {format(new Date(paiement.created_at), "dd/MM/yyyy", { locale: fr })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {paiement.type_paiement === 'droit_acces' || paiement.type_paiement === 'DA' ? 'Droit d\'accès' : 'Redevance mensuel'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatMontant(paiement.montant_paye || paiement.montant_theorique)}
                            </TableCell>
                            <TableCell>{getStatutBadge(paiement.statut)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Résumé financier */}
          <TabsContent value="financier" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résumé financier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Total Droit d'Accès versé</span>
                    <span className="font-bold text-primary">{formatMontant(stats.totalDAVerse)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Total Redevances versées</span>
                    <span className="font-bold text-green-600">{formatMontant(stats.totalContributions)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Nombre de paiements validés</span>
                    <span className="font-bold">{stats.paiementsValides}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Paiements en attente</span>
                    <span className="font-bold text-yellow-600">{stats.paiementsEnAttente}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-primary/5 rounded-lg px-3">
                    <span className="font-semibold">Total versé</span>
                    <span className="text-xl font-bold text-primary">
                      {formatMontant(stats.totalDAVerse + stats.totalContributions)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
            © 2025 AgriCapital - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortfolio;
