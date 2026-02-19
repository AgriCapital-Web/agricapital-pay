import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.png";
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
      
      {/* Full green background */}
      <div className="min-h-screen flex flex-col overflow-x-hidden relative" style={{ background: 'linear-gradient(160deg, #00643C 0%, #004d2e 60%, #003320 100%)' }}>
        
        {/* Decorative leaf shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Leaf className="absolute top-10 right-8 h-32 w-32 text-white/5 rotate-45" />
          <Leaf className="absolute top-1/3 left-4 h-20 w-20 text-white/5 -rotate-12" />
          <Leaf className="absolute bottom-20 right-12 h-24 w-24 text-white/5 rotate-90" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        </div>

        {/* Header */}
        <header className={`pt-10 pb-6 px-4 relative z-10 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
          <div className="container mx-auto flex flex-col items-center justify-center">
            <img 
              src={logoWhite} 
              alt="AgriCapital - Le partenaire idéal des producteurs agricoles" 
              className="h-20 sm:h-24 md:h-28 object-contain drop-shadow-lg"
            />
            <h1 className="text-white text-xl sm:text-2xl font-bold mt-4 tracking-wide drop-shadow">
              Portail Souscripteur
            </h1>
            <p className="text-white/75 text-sm mt-1">
              Votre espace palmier à huile en ligne
            </p>
          </div>
        </header>

        {/* Main card */}
        <main className="flex-1 flex items-start justify-center px-4 py-4 relative z-10">
          <Card className={`w-full max-w-[95vw] sm:max-w-md shadow-2xl border-0 overflow-hidden transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
            
            {/* Gold accent header - orange-amber gradient */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 py-5 sm:py-6 px-4 sm:px-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full mb-2 shadow-lg">
                  <Phone className="h-6 w-6 sm:h-7 sm:w-7 text-[#00643C]" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white drop-shadow">Bienvenue</h2>
                <p className="text-white/90 text-sm mt-0.5">Accédez à votre espace souscripteur</p>
              </div>
            </div>

            <CardContent className="p-5 sm:p-6 md:p-8 space-y-4 bg-white">
              <p className="text-sm text-center text-gray-500">
                Saisissez votre numéro de téléphone enregistré
              </p>

              <div className="space-y-3">
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#00643C] transition-colors" />
                  <Input
                    type="tel"
                    placeholder="07 59 56 60 87"
                    value={formatPhoneDisplay(telephone)}
                    onChange={handlePhoneChange}
                    className="pl-12 h-14 text-lg text-center font-medium tracking-wider border-2 focus:border-[#00643C] focus:ring-2 focus:ring-[#00643C]/20 transition-all rounded-xl"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    autoFocus
                    inputMode="numeric"
                  />
                  {telephone.length === 10 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-6 w-6 rounded-full bg-[#00643C]/10 flex items-center justify-center">
                        <svg className="h-4 w-4 text-[#00643C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSearch} 
                  disabled={loading || telephone.length < 10} 
                  className="w-full h-14 text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-all rounded-xl"
                  style={{ background: '#00643C' }}
                >
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Recherche en cours...</>
                  ) : (
                    <>Accéder à mon compte <ArrowRight className="h-5 w-5" /></>
                  )}
                </Button>
              </div>

              {/* Features badges */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { icon: Shield, label: "Sécurisé", color: "text-[#00643C]", bg: "bg-green-50" },
                  { icon: CreditCard, label: "Mobile Money", color: "text-amber-600", bg: "bg-amber-50" },
                  { icon: Sprout, label: "Suivi direct", color: "text-[#00643C]", bg: "bg-green-50" }
                ].map((feat, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`h-10 w-10 rounded-full ${feat.bg} flex items-center justify-center mb-1.5`}>
                      <feat.icon className={`h-5 w-5 ${feat.color}`} />
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-500 font-medium">{feat.label}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t space-y-3">
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-gray-700">Pas encore de compte ?</p>
                  <p className="text-xs text-gray-500">
                    Contactez l'équipe au <strong className="text-[#00643C]">05 64 55 17 17</strong>
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

        {/* Footer */}
        <footer className={`py-6 text-center space-y-1 relative z-10 transition-all duration-700 delay-400 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
          <p className="flex items-center justify-center gap-2 text-sm text-white/80">
            <Phone className="h-4 w-4 text-yellow-400" />
            Support : +225 05 64 55 17 17
          </p>
          <p className="text-xs text-white/50">© {new Date().getFullYear()} AgriCapital — Tous droits réservés</p>
        </footer>
      </div>
    </>
  );
};

export default ClientHome;
