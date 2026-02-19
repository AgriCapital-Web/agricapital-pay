import { useState, useEffect } from "react";
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
  MessageCircle,
  TrendingUp
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 80);
  }, []);

  const formatMontant = (m: number) => {
    return new Intl.NumberFormat("fr-FR").format(m || 0) + " F CFA";
  };

  const getStatutConfig = (statut: string) => {
    const config: any = {
      'en_attente_da': { label: 'En attente DA', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'da_valide':     { label: 'DA Validé',     icon: CheckCircle, color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'en_cours':      { label: 'En cours',       icon: Clock, color: 'bg-blue-100 text-blue-800 border-blue-200' },
      'en_production': { label: 'En production',  icon: Sprout, color: 'bg-green-100 text-green-800 border-green-200' },
      'actif':         { label: 'Actif',          icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
      'inactif':       { label: 'Inactif',        icon: Clock, color: 'bg-gray-100 text-gray-600 border-gray-200' },
      'valide':        { label: 'Validé',         icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
      'en_attente':    { label: 'En attente',     icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'rejete':        { label: 'Rejeté',         icon: AlertTriangle, color: 'bg-red-100 text-red-800 border-red-200' }
    };
    return config[statut] || { label: statut, icon: Clock, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  const getStatutBadge = (statut: string) => {
    const cfg = getStatutConfig(statut);
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </span>
    );
  };

  const stats = {
    totalPlantations: plantations.length,
    totalHectares: plantations.reduce((sum, p) => sum + (p.superficie_ha || 0), 0),
    hectaresActifs: plantations.reduce((sum, p) => sum + (p.superficie_activee || 0), 0),
    totalDAVerse: paiements.filter(p => p.statut === 'valide' && p.type_paiement === 'DA').reduce((sum, p) => sum + (p.montant_paye || 0), 0),
    totalContributions: paiements.filter(p => p.statut === 'valide' && p.type_paiement === 'REDEVANCE').reduce((sum, p) => sum + (p.montant_paye || 0), 0),
    paiementsValides: paiements.filter(p => p.statut === 'valide').length,
    paiementsEnAttente: paiements.filter(p => p.statut === 'en_attente').length,
    totalPaye: paiements.filter(p => p.statut === 'valide').reduce((sum, p) => sum + (p.montant_paye || 0), 0),
  };

  const handleWhatsAppTC = () => {
    if (souscripteur.technico_commercial?.telephone) {
      const message = encodeURIComponent(`Bonjour ${souscripteur.technico_commercial.nom_complet}, je suis ${souscripteur.nom_complet} (${souscripteur.telephone}). Je souhaite vous contacter concernant mon compte.`);
      window.open(`https://wa.me/225${souscripteur.technico_commercial.telephone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sticky */}
      <header className="bg-primary text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-3 max-w-4xl">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logoWhite} alt="AgriCapital" className="h-7 object-contain" />
          <span className="font-semibold text-sm sm:text-base">Mon Portefeuille</span>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-5 space-y-5 max-w-4xl">

        {/* === PROFIL === */}
        <Card className={`overflow-hidden shadow-md transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-gradient-to-br from-primary to-primary/80 text-white p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shadow-lg">
                  {souscripteur.photo_profil_url ? (
                    <img src={souscripteur.photo_profil_url} alt={souscripteur.nom_complet} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-white/70" />
                  )}
                </div>
                {/* Gold corner accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-[3px] border-l-[3px] border-yellow-400 rounded-tl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-[3px] border-r-[3px] border-yellow-400 rounded-br-lg"></div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold truncate">{souscripteur.nom_complet}</h2>
                <p className="text-white/70 text-xs font-mono mt-0.5">ID: {souscripteur.id_unique}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {souscripteur.telephone}
                  </span>
                  {souscripteur.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {souscripteur.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-white/60 text-xs">Partenaire depuis</p>
                <p className="font-semibold text-sm">
                  {souscripteur.created_at
                    ? format(new Date(souscripteur.created_at), "MMM yyyy", { locale: fr })
                    : 'N/A'}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-2 py-0.5">
                  <CheckCircle className="h-3 w-3 text-yellow-300" />
                  <span className="text-yellow-200 text-xs font-medium">{souscripteur.statut_global || 'Actif'}</span>
                </div>
              </div>
            </div>

            {/* Localisation bar */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: MapPin, label: "Région", value: souscripteur.regions?.nom },
                { icon: Home, label: "Département", value: souscripteur.departements?.nom },
                { icon: Briefcase, label: "Sous-préfecture", value: souscripteur.sous_prefectures?.nom },
                { icon: MapPin, label: "Village", value: souscripteur.villages?.nom },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 rounded-lg p-2 text-center">
                  <item.icon className="h-3.5 w-3.5 mx-auto mb-1 text-white/60" />
                  <p className="text-white font-semibold text-xs truncate">{item.value || 'N/A'}</p>
                  <p className="text-white/50 text-[10px]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* TC block */}
          {souscripteur.technico_commercial && (
            <CardContent className="p-4 bg-green-50 border-t border-green-100">
              <p className="text-xs text-green-700 font-medium mb-2">Votre Technico-Commercial</p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{souscripteur.technico_commercial.nom_complet}</p>
                    <p className="text-xs text-gray-500">{souscripteur.technico_commercial.telephone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${souscripteur.technico_commercial.telephone}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" /> Appeler
                  </a>
                  <Button variant="outline" size="sm" onClick={handleWhatsAppTC} className="gap-1 border-green-500 text-green-600 hover:bg-green-50 text-xs h-8">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* === STATS RAPIDES === */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-500 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { icon: Sprout,     label: "Plantations",  value: stats.totalPlantations, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
            { icon: MapPin,     label: "Ha. total",    value: `${stats.totalHectares} ha`, color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200" },
            { icon: CheckCircle,label: "Ha. actifs",   value: `${stats.hectaresActifs} ha`, color: "text-primary",  bg: "bg-green-50",  border: "border-green-200" },
            { icon: CreditCard, label: "Paiements",   value: stats.paiementsValides, color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200" },
          ].map((s, i) => (
            <Card key={i} className={`hover:shadow-md transition-all border ${s.border}`}>
              <CardContent className="p-4 text-center">
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-full ${s.bg} mb-2`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* === TABS === */}
        <div className={`transition-all duration-500 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Tabs defaultValue="plantations" className="w-full">
            <TabsList className="w-full grid grid-cols-3 rounded-xl bg-gray-100 p-1">
              <TabsTrigger value="plantations" className="rounded-lg text-xs sm:text-sm">Plantations</TabsTrigger>
              <TabsTrigger value="paiements" className="rounded-lg text-xs sm:text-sm">Paiements</TabsTrigger>
              <TabsTrigger value="financier" className="rounded-lg text-xs sm:text-sm">Résumé</TabsTrigger>
            </TabsList>

            {/* PLANTATIONS */}
            <TabsContent value="plantations" className="space-y-3 mt-4">
              {plantations.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center text-gray-400">
                    <Sprout className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Aucune plantation enregistrée</p>
                    <p className="text-sm mt-1">Contactez votre TC pour créer une plantation</p>
                  </CardContent>
                </Card>
              ) : (
                plantations.map((plantation, idx) => (
                  <Card key={plantation.id} className={`border-l-4 border-l-primary hover:shadow-md transition-all duration-300 delay-${idx * 50}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{plantation.nom_plantation || plantation.id_unique}</p>
                          <p className="text-xs text-gray-400 font-mono">{plantation.id_unique}</p>
                        </div>
                        {getStatutBadge(plantation.statut_global)}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        {[
                          { label: "Superficie", value: `${plantation.superficie_ha || 0} ha` },
                          { label: "Ha. actifs",  value: `${plantation.superficie_activee || 0} ha` },
                          { label: "Région",      value: plantation.regions?.nom || 'N/A' },
                          { label: "Variété",     value: "Palmier à huile" },
                        ].map((item, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-400 text-[10px] uppercase tracking-wide">{item.label}</p>
                            <p className="font-semibold text-gray-700 text-sm truncate">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {plantation.date_activation && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 border-t pt-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>Activée le {format(new Date(plantation.date_activation), "dd MMMM yyyy", { locale: fr })}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* PAIEMENTS */}
            <TabsContent value="paiements" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Historique des paiements
                    <span className="ml-auto text-xs font-normal text-gray-400">{paiements.length} transactions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {paiements.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>Aucun paiement enregistré</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-right text-xs">Montant</TableHead>
                            <TableHead className="text-xs">Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paiements.slice(0, 20).map((paiement) => (
                            <TableRow key={paiement.id} className="hover:bg-gray-50">
                              <TableCell className="text-xs py-2.5">
                                {format(new Date(paiement.created_at), "dd/MM/yyyy", { locale: fr })}
                              </TableCell>
                              <TableCell className="text-xs py-2.5">
                                <Badge variant={paiement.type_paiement === 'DA' ? "default" : "secondary"} className="text-[10px]">
                                  {paiement.type_paiement === 'DA' ? "Droit d'accès" : 'Redevance'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-xs py-2.5">
                                {formatMontant(paiement.montant_paye || paiement.montant)}
                              </TableCell>
                              <TableCell className="py-2.5">{getStatutBadge(paiement.statut)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* RÉSUMÉ FINANCIER */}
            <TabsContent value="financier" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Résumé financier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total Droits d'Accès versés",    value: formatMontant(stats.totalDAVerse),       color: "text-primary", bg: "bg-green-50" },
                    { label: "Total Redevances versées",        value: formatMontant(stats.totalContributions), color: "text-green-600", bg: "bg-green-50" },
                    { label: "Total cumulé",                    value: formatMontant(stats.totalPaye),          color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Paiements validés",               value: stats.paiementsValides,                  color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Paiements en attente",            value: stats.paiementsEnAttente,                color: "text-yellow-600", bg: "bg-yellow-50" },
                  ].map((item, i) => (
                    <div key={i} className={`flex justify-between items-center p-3 rounded-xl ${item.bg}`}>
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                    </div>
                  ))}

                  {souscripteur.offre && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/15">
                      <p className="text-xs text-gray-500 mb-1">Offre souscrite</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-primary">{souscripteur.offre.nom}</span>
                        <Badge className="bg-primary text-white text-xs">{souscripteur.offre.code}</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ClientPortfolio;
