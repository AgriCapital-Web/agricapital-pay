import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.png";
import { Phone, Loader2, ArrowRight, MessageCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface ClientHomeProps {
  onLogin: (souscripteur: any, plantations: any[], paiements: any[]) => void;
}

const ClientHome = ({ onLogin }: ClientHomeProps) => {
  const { toast } = useToast();
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mettre à jour le manifest et SEO pour le portail souscripteur
  useEffect(() => {
    document.title = "Portail Souscripteur | AgriCapital - Accédez à votre espace partenaire";
    
    // Changer le manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifest-client.json');
    }
    
    // Changer le theme-color
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', '#00643C');
    }
  }, []);

  const handleSearch = async () => {
    const cleanPhone = telephone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez saisir un numéro de téléphone valide (10 chiffres)"
      });
      return;
    }

    setLoading(true);
    try {
      // Rechercher le partenaire souscripteur
      const { data: sousData, error: sousError } = await supabase
        .from("souscripteurs")
        .select(`
          *,
          regions (nom),
          departements (nom),
          districts (nom),
          sous_prefectures (nom),
          villages (nom),
          technico_commercial:profiles!souscripteurs_technico_commercial_id_fkey (nom_complet, telephone, email)
        `)
        .eq("telephone", cleanPhone)
        .maybeSingle();

      if (sousError) throw sousError;

      if (!sousData) {
        toast({
          variant: "destructive",
          title: "Non trouvé",
          description: "Aucun compte trouvé avec ce numéro de téléphone. Veuillez contacter l'équipe AgriCapital au 05 64 55 17 17."
        });
        return;
      }

      // Récupérer les plantations
      const { data: plantData } = await supabase
        .from("plantations")
        .select(`
          *,
          regions (nom),
          departements (nom),
          districts (nom),
          sous_prefectures (nom),
          villages (nom)
        `)
        .eq("souscripteur_id", sousData.id)
        .order("created_at", { ascending: false });

      // Récupérer les paiements
      let paiementsData: any[] = [];
      if (plantData && plantData.length > 0) {
        const plantationIds = plantData.map((p: any) => p.id);
        const { data: paiments } = await supabase
          .from("paiements")
          .select("*")
          .in("plantation_id", plantationIds)
          .order("created_at", { ascending: false });
        paiementsData = paiments || [];
      }

      onLogin(sousData, plantData || [], paiementsData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bonjour AgriCapital,\n\nJe souhaite créer mon compte partenaire souscripteur pour accéder au portail.\n\nMerci de m'accompagner dans cette démarche.");
    window.open(`https://wa.me/2250564551717?text=${message}`, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Portail Souscripteur | AgriCapital - Accédez à votre espace partenaire</title>
        <meta name="description" content="Portail de paiement et de gestion pour les souscripteurs AgriCapital. Consultez vos plantations, effectuez vos paiements de redevance mensuel et suivez votre portefeuille en temps réel." />
        <meta name="keywords" content="AgriCapital, portail souscripteur, partenaire, plantations, paiement, Côte d'Ivoire, palmier à huile, agriculture, redevance mensuel" />
        <meta property="og:title" content="Portail Souscripteur | AgriCapital" />
        <meta property="og:description" content="Portail de paiement et de gestion pour les souscripteurs AgriCapital. Consultez vos plantations et effectuez vos paiements." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Portail Souscripteur | AgriCapital" />
        <meta name="twitter:description" content="Portail de paiement pour les souscripteurs AgriCapital" />
        <link rel="canonical" href="https://pay.agricapital.ci" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/85 flex flex-col overflow-x-hidden">
        {/* Header avec Logo centré */}
        <header className="py-4 sm:py-8 px-3 sm:px-4">
          <div className="container mx-auto flex flex-col items-center justify-center">
            <img 
              src={logoWhite} 
              alt="AgriCapital - Portail Souscripteur" 
              className="h-16 sm:h-24 md:h-32 object-contain drop-shadow-lg"
            />
            <h1 className="text-white text-lg sm:text-xl md:text-2xl font-bold mt-2 sm:mt-4 tracking-wide">
              Portail Souscripteur
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-6">
          <Card className="w-full max-w-[95vw] sm:max-w-md shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-white/95">
            {/* Decorative Header */}
            <div className="bg-gradient-to-r from-accent via-accent/90 to-accent/80 py-4 sm:py-8 px-4 sm:px-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-white rounded-full -translate-x-12 sm:-translate-x-16 -translate-y-12 sm:-translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-white rounded-full translate-x-8 sm:translate-x-12 translate-y-8 sm:translate-y-12"></div>
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-18 sm:h-18 bg-white rounded-full mb-3 sm:mb-4 shadow-xl p-3 sm:p-4">
                  <Phone className="h-6 w-6 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Bienvenue</h2>
                <p className="text-white/90 text-xs sm:text-sm mt-1 sm:mt-2">
                  Accédez à votre espace souscripteur
                </p>
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Saisissez votre numéro de téléphone pour accéder à votre compte
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Ex: 07 59 56 60 87"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-12 h-14 text-lg text-center font-medium tracking-wider border-2 focus:border-primary transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    autoFocus
                  />
                </div>

                <Button 
                  onClick={handleSearch} 
                  disabled={loading || telephone.length < 10} 
                  className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 gap-2 shadow-lg transition-all hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Recherche...
                    </>
                  ) : (
                    <>
                      Accéder à mon compte
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-4 border-t space-y-4">
              <div className="text-center space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Nouveau sur AgriCapital ?
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Contactez l'équipe AgriCapital au <strong className="text-primary">05 64 55 17 17</strong> pour créer votre compte souscripteur.
                  </p>
                  <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    Numéro WhatsApp disponible
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={handleWhatsApp}
                  className="w-full h-12 gap-2 border-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 font-semibold"
                >
                  <MessageCircle className="h-5 w-5" />
                  Contacter via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-white/90 text-sm space-y-2">
          <p className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            Support: +225 05 64 55 17 17
          </p>
          <p className="text-xs text-white/70">© 2025 AgriCapital - Tous droits réservés</p>
        </footer>
      </div>
    </>
  );
};

export default ClientHome;
