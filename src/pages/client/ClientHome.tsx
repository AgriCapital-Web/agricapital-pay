import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.png";
import { Phone, Loader2, ArrowRight, MessageCircle, Shield, Sprout, CreditCard, Leaf, KeyRound, ArrowLeft, RefreshCw } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface ClientHomeProps {
  onLogin: (souscripteur: any, plantations: any[], paiements: any[]) => void;
}

type Step = 'phone' | 'otp' | 'loading';

const ClientHome = ({ onLogin }: ClientHomeProps) => {
  const { toast } = useToast();
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [step, setStep] = useState<Step>('phone');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    document.title = "Portail Client | AgriCapital";
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) manifestLink.setAttribute('href', '/manifest-client.json');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', '#00643C');
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

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

  const handleSendOTP = async () => {
    const cleanPhone = telephone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast({ variant: "destructive", title: "Erreur", description: "Numéro de téléphone invalide (10 chiffres)" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { telephone: cleanPhone, action: 'send' }
      });

      if (error) throw new Error(error.message);
      if (!data?.success) {
        toast({ variant: "destructive", title: "Erreur", description: data?.error || "Impossible d'envoyer le code" });
        return;
      }

      // Dev mode: show code
      if (data.devCode) {
        setDevCode(data.devCode);
      }

      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpTimer(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
      toast({ title: "Code envoyé", description: "Un code de vérification a été envoyé par SMS" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur d'envoi" });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && newDigits.every(d => d !== '')) {
      handleVerifyOTP(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      const newDigits = paste.split('');
      setOtpDigits(newDigits);
      handleVerifyOTP(paste);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { telephone: telephone, action: 'verify', code }
      });

      if (error) throw new Error(error.message);
      if (!data?.success) {
        toast({ variant: "destructive", title: "Code incorrect", description: data?.error || "Vérification échouée" });
        setOtpDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // OTP verified - now fetch subscriber data
      toast({ title: "✅ Vérifié", description: "Chargement de votre espace..." });
      
      const { data: subData, error: subError } = await supabase.functions.invoke("subscriber-lookup", {
        body: { telephone: telephone }
      });

      if (subError) throw new Error(subError.message);
      if (!subData?.success) {
        toast({ variant: "destructive", title: "Compte non trouvé", description: "Aucun compte avec ce numéro. Contactez le 05 64 55 17 17." });
        setStep('phone');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('agri_souscripteur', JSON.stringify(subData.souscripteur));
      sessionStorage.setItem('agri_plantations', JSON.stringify(subData.plantations));
      sessionStorage.setItem('agri_paiements', JSON.stringify(subData.paiements));

      onLogin(subData.souscripteur, subData.plantations, subData.paiements);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur de connexion" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpTimer > 0) return;
    await handleSendOTP();
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bonjour AgriCapital,\n\nJe souhaite créer mon compte partenaire client.\n\nMerci.");
    window.open(`https://wa.me/2250564551717?text=${message}`, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Portail Client | AgriCapital - Paiement et suivi de vos plantations</title>
        <meta name="description" content="Accédez à votre espace client AgriCapital. Consultez vos plantations, effectuez vos paiements et suivez votre portefeuille en Côte d'Ivoire." />
        <meta name="keywords" content="AgriCapital, portail client, paiement plantation, palmier à huile, Côte d'Ivoire" />
        <meta property="og:title" content="Portail Client | AgriCapital" />
        <meta property="og:description" content="Consultez vos plantations et effectuez vos paiements de redevance AgriCapital en ligne." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pay.agricapital.ci" />
        <meta property="og:image" content="https://pay.agricapital.ci/logo-agricapital.png" />
        <meta property="og:locale" content="fr_CI" />
        <link rel="canonical" href="https://pay.agricapital.ci" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      
      <div className="min-h-screen flex flex-col overflow-x-hidden relative" style={{ background: 'linear-gradient(160deg, #00643C 0%, #004d2e 60%, #003320 100%)' }}>
        
        {/* Decorative */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Leaf className="absolute top-10 right-8 h-32 w-32 text-white/5 rotate-45" />
          <Leaf className="absolute top-1/3 left-4 h-20 w-20 text-white/5 -rotate-12" />
          <Leaf className="absolute bottom-20 right-12 h-24 w-24 text-white/5 rotate-90" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        </div>

        {/* Header */}
        <header className={`pt-8 sm:pt-10 pb-4 sm:pb-6 px-4 relative z-10 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
          <div className="container mx-auto flex flex-col items-center justify-center">
            <img src={logoWhite} alt="AgriCapital" className="h-16 sm:h-20 md:h-24 lg:h-28 object-contain drop-shadow-lg" />
            <h1 className="text-white text-lg sm:text-xl lg:text-2xl font-bold mt-3 sm:mt-4 tracking-wide drop-shadow">
              Portail Client
            </h1>
            <p className="text-white/75 text-xs sm:text-sm mt-1">
              Votre espace palmier à huile en ligne
            </p>
          </div>
        </header>

        {/* Main card */}
        <main className="flex-1 flex items-start justify-center px-3 sm:px-4 py-3 sm:py-4 relative z-10">
          <Card className={`w-full max-w-[95vw] sm:max-w-md lg:max-w-lg shadow-2xl border-0 overflow-hidden transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
            
            {/* Gold accent header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 py-4 sm:py-5 px-4 sm:px-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full mb-2 shadow-lg">
                  {step === 'phone' ? (
                    <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-[#00643C]" />
                  ) : (
                    <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 text-[#00643C]" />
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white drop-shadow">
                  {step === 'phone' ? 'Bienvenue' : 'Vérification'}
                </h2>
                <p className="text-white/90 text-xs sm:text-sm mt-0.5">
                  {step === 'phone' ? 'Accédez à votre espace souscripteur' : `Code envoyé au ${formatPhoneDisplay(telephone)}`}
                </p>
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 bg-white">
              
              {/* === STEP: PHONE === */}
              {step === 'phone' && (
                <>
                  <p className="text-xs sm:text-sm text-center text-gray-500">
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
                        className="pl-12 h-12 sm:h-14 text-base sm:text-lg text-center font-medium tracking-wider border-2 focus:border-[#00643C] focus:ring-2 focus:ring-[#00643C]/20 transition-all rounded-xl"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
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
                      onClick={handleSendOTP} 
                      disabled={loading || telephone.length < 10} 
                      className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-all rounded-xl"
                      style={{ background: '#00643C' }}
                    >
                      {loading ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Envoi du code...</>
                      ) : (
                        <>Recevoir mon code <ArrowRight className="h-5 w-5" /></>
                      )}
                    </Button>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { icon: Shield, label: "Sécurisé", color: "text-[#00643C]", bg: "bg-green-50" },
                      { icon: CreditCard, label: "Mobile Money", color: "text-amber-600", bg: "bg-amber-50" },
                      { icon: Sprout, label: "Suivi direct", color: "text-[#00643C]", bg: "bg-green-50" }
                    ].map((feat, i) => (
                      <div key={i} className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full ${feat.bg} flex items-center justify-center mb-1`}>
                          <feat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${feat.color}`} />
                        </div>
                        <span className="text-[9px] sm:text-xs text-gray-500 font-medium">{feat.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t space-y-3">
                    <div className="text-center space-y-1">
                      <p className="text-xs sm:text-sm font-semibold text-gray-700">Pas encore de compte ?</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        Contactez l'équipe au <strong className="text-[#00643C]">05 64 55 17 17</strong>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleWhatsApp}
                      className="w-full h-10 sm:h-12 gap-2 border-2 border-green-500 text-green-600 hover:bg-green-50 font-semibold rounded-xl text-xs sm:text-sm"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      Contacter via WhatsApp
                    </Button>
                  </div>
                </>
              )}

              {/* === STEP: OTP === */}
              {step === 'otp' && (
                <>
                  <div className="text-center space-y-1">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Entrez le code à 6 chiffres reçu par SMS
                    </p>
                    {devCode && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 inline-block">
                        🧪 Mode test — Code : <strong className="font-mono">{devCode}</strong>
                      </p>
                    )}
                  </div>

                  {/* OTP Input */}
                  <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, i) => (
                      <Input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpInput(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold border-2 rounded-xl focus:border-[#00643C] focus:ring-2 focus:ring-[#00643C]/20 transition-all"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Vérification...
                    </div>
                  )}

                  {/* Resend */}
                  <div className="text-center space-y-2">
                    {otpTimer > 0 ? (
                      <p className="text-xs text-gray-400">
                        Renvoyer dans <span className="font-bold text-gray-600">{otpTimer}s</span>
                      </p>
                    ) : (
                      <Button variant="ghost" onClick={handleResendOTP} disabled={loading} className="text-xs text-[#00643C] hover:text-[#004d2e] gap-1">
                        <RefreshCw className="h-3.5 w-3.5" /> Renvoyer le code
                      </Button>
                    )}
                  </div>

                  {/* Back */}
                  <Button 
                    variant="ghost" 
                    onClick={() => { setStep('phone'); setDevCode(null); }}
                    className="w-full gap-2 text-gray-500 hover:text-gray-700 text-xs sm:text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" /> Changer de numéro
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className={`py-4 sm:py-6 px-4 text-center relative z-10 transition-all duration-700 delay-400 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white/40 text-[10px] sm:text-xs">
            © {new Date().getFullYear()} AgriCapital · Tous droits réservés
          </p>
        </footer>
      </div>
    </>
  );
};

export default ClientHome;
