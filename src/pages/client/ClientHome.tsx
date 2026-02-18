import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.png";
import { Phone, Loader2, ArrowRight, MessageCircle, Shield, Sprout, CreditCard } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface ClientHomeProps {
  onLogin: (souscripteur: any, plantations: any[], paiements: any[]) => void;
}

const ClientHome = ({ onLogin }: ClientHomeProps) => {
  const { toast } = useToast();
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Portail Souscripteur | AgriCapital";
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) manifestLink.setAttribute('href', '/manifest-client.json');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', '#00643C');
  }, []);

  const handleSearch = async () => {
    const cleanPhone = telephone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez saisir un numéro de téléphone valide (10 chiffres)" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscriber-lookup", {
        body: { telephone: cleanPhone }
      });

      if (error) throw new Error(error.message || "Erreur de connexion");
      
      if (!data?.success) {
        toast({
          variant: "destructive",
          title: "Compte non trouvé",
          description: "Aucun compte trouvé avec ce numéro. Contactez AgriCapital au 05 64 55 17 17."
        });
        return;
      }

      // Store in sessionStorage for persistence
      sessionStorage.setItem('agri_souscripteur', JSON.stringify(data.souscripteur));
      sessionStorage.setItem('agri_plantations', JSON.stringify(data.plantations));
      sessionStorage.setItem('agri_paiements', JSON.stringify(data.paiements));

      onLogin(data.souscripteur, data.plantations, data.paiements);
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de se connecter" });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bonjour AgriCapital,\n\nJe souhaite créer mon compte partenaire souscripteur.\n\nMerci.");
    window.open(`https://wa.me/2250564551717?text=${message}`, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Portail Souscripteur | AgriCapital - Paiement et suivi de vos plantations</title>
        <meta name="description" content="Accédez à votre espace souscripteur AgriCapital. Consultez vos plantations de palmier à huile, effectuez vos paiements de redevance et suivez votre portefeuille en temps réel en Côte d'Ivoire." />
        <meta name="keywords" content="AgriCapital, portail souscripteur, paiement plantation, palmier à huile, Côte d'Ivoire, redevance mensuelle, droit d'accès, agriculture" />
        <meta property="og:title" content="Portail Souscripteur | AgriCapital" />
        <meta property="og:description" content="Consultez vos plantations et effectuez vos paiements de redevance AgriCapital en ligne." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pay.agricapital.ci" />
        <meta property="og:image" content="https://pay.agricapital.ci/logo-agricapital.png" />
        <meta property="og:locale" content="fr_CI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Portail Souscripteur | AgriCapital" />
        <meta name="twitter:description" content="Paiement et suivi de vos plantations AgriCapital" />
        <link rel="canonical" href="https://pay.agricapital.ci" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/85 flex flex-col overflow-x-hidden">
        {/* Header */}
        <header className="py-4 sm:py-6 px-3 sm:px-4">
          <div className="container mx-auto flex flex-col items-center justify-center">
            <img 
              src={logoWhite} 
              alt="AgriCapital - Portail Souscripteur" 
              className="h-14 sm:h-20 md:h-28 object-contain drop-shadow-lg"
            />
            <h1 className="text-white text-base sm:text-xl md:text-2xl font-bold mt-2 sm:mt-3 tracking-wide">
              Portail Souscripteur
            </h1>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-6">
          <Card className="w-full max-w-[95vw] sm:max-w-md shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-white/95">
            {/* Gold header */}
            <div className="bg-gradient-to-r from-accent via-accent/90 to-accent/80 py-5 sm:py-8 px-4 sm:px-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-white rounded-full -translate-x-12 sm:-translate-x-16 -translate-y-12 sm:-translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-white rounded-full translate-x-8 sm:translate-x-12 translate-y-8 sm:translate-y-12"></div>
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full mb-3 shadow-xl p-3">
                  <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Bienvenue</h2>
                <p className="text-white/90 text-xs sm:text-sm mt-1">Accédez à votre espace souscripteur</p>
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
              <p className="text-sm text-center text-muted-foreground">
                Saisissez votre numéro de téléphone
              </p>

              <div className="space-y-3">
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
                  className="w-full h-14 text-lg font-semibold gap-2 shadow-lg transition-all hover:shadow-xl"
                >
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Recherche...</>
                  ) : (
                    <>Accéder à mon compte <ArrowRight className="h-5 w-5" /></>
                  )}
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="flex flex-col items-center text-center p-2">
                  <Shield className="h-5 w-5 text-primary mb-1" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Sécurisé</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <CreditCard className="h-5 w-5 text-accent mb-1" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Mobile Money</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <Sprout className="h-5 w-5 text-primary mb-1" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Suivi temps réel</span>
                </div>
              </div>

              <div className="pt-3 border-t space-y-3">
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-foreground">Pas encore de compte ?</p>
                  <p className="text-xs text-muted-foreground">
                    Contactez l'équipe au <strong className="text-primary">05 64 55 17 17</strong>
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={handleWhatsApp}
                  className="w-full h-12 gap-2 border-2 border-green-500 text-green-600 hover:bg-green-50 font-semibold"
                >
                  <MessageCircle className="h-5 w-5" />
                  Contacter via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="py-4 sm:py-6 text-center text-white/90 text-sm space-y-1">
          <p className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            Support: +225 05 64 55 17 17
          </p>
          <p className="text-xs text-white/70">© {new Date().getFullYear()} AgriCapital - Tous droits réservés</p>
        </footer>
      </div>
    </>
  );
};

export default ClientHome;
