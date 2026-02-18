import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoGreen from "@/assets/logo-green.png";
import { Phone, Loader2, ArrowRight, MessageCircle, Shield, Sprout, CreditCard, Leaf } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface ClientHomeProps {
  onLogin: (souscripteur: any, plantations: any[], paiements: any[]) => void;
}

const ClientHome = ({ onLogin }: ClientHomeProps) => {
  const { toast } = useToast();
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    document.title = "Portail Souscripteur | AgriCapital";
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) manifestLink.setAttribute('href', '/manifest-client.json');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', '#00643C');
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setTelephone(raw);
  };

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
      
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden relative">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-primary/5 to-transparent" />
          <Leaf className="absolute top-32 right-6 h-20 w-20 text-primary/5 rotate-45" />
          <Leaf className="absolute bottom-40 left-4 h-14 w-14 text-primary/5 -rotate-12" />
        </div>

        {/* Header */}
        <header className={`py-6 sm:py-10 px-3 sm:px-4 relative z-10 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
          <div className="container mx-auto flex flex-col items-center justify-center">
            <img 
              src={logoGreen} 
              alt="AgriCapital - Le partenaire idéal des producteurs agricoles" 
              className="h-20 sm:h-24 md:h-32 object-contain"
            />
            <h1 className="text-primary text-lg sm:text-xl md:text-2xl font-bold mt-3 tracking-wide">
              Portail Souscripteur
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">Votre espace palmier à huile en ligne</p>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-start justify-center px-3 sm:px-4 py-2 sm:py-4 relative z-10">
          <Card className={`w-full max-w-[95vw] sm:max-w-md shadow-xl border border-border/50 overflow-hidden transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
            {/* Gold accent header */}
            <div className="bg-gradient-to-r from-accent via-accent/90 to-accent/80 py-5 sm:py-6 px-4 sm:px-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full mb-2 shadow-lg">
                  <Phone className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Bienvenue</h2>
                <p className="text-white/90 text-sm mt-0.5">Accédez à votre espace souscripteur</p>
              </div>
            </div>

            <CardContent className="p-5 sm:p-6 md:p-8 space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Saisissez votre numéro de téléphone
              </p>

              <div className="space-y-3">
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="tel"
                    placeholder="07 59 56 60 87"
                    value={formatPhoneDisplay(telephone)}
                    onChange={handlePhoneChange}
                    className="pl-12 h-14 text-lg text-center font-medium tracking-wider border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    autoFocus
                    inputMode="numeric"
                  />
                  {telephone.length === 10 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSearch} 
                  disabled={loading || telephone.length < 10} 
                  className="w-full h-14 text-lg font-semibold gap-2 shadow-lg hover:shadow-xl transition-all rounded-xl bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Recherche...</>
                  ) : (
                    <>Accéder à mon compte <ArrowRight className="h-5 w-5" /></>
                  )}
                </Button>
              </div>

              {/* Features badges */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { icon: Shield, label: "Sécurisé", color: "text-primary" },
                  { icon: CreditCard, label: "Mobile Money", color: "text-accent" },
                  { icon: Sprout, label: "Suivi en direct", color: "text-primary" }
                ].map((feat, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mb-1.5">
                      <feat.icon className={`h-5 w-5 ${feat.color}`} />
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{feat.label}</span>
                  </div>
                ))}
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
                  className="w-full h-12 gap-2 border-2 border-green-500 text-green-600 hover:bg-green-50 font-semibold rounded-xl"
                >
                  <MessageCircle className="h-5 w-5" />
                  Contacter via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className={`py-4 sm:py-6 text-center space-y-1 relative z-10 transition-all duration-700 delay-400 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
          <p className="flex items-center justify-center gap-2 text-sm text-foreground">
            <Phone className="h-4 w-4 text-primary" />
            Support: +225 05 64 55 17 17
          </p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AgriCapital - Tous droits réservés</p>
        </footer>
      </div>
    </>
  );
};

export default ClientHome;
