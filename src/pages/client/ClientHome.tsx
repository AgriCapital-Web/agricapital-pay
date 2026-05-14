import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logoWhiteBg from "@/assets/logo-white-bg.png";
import {
  Phone, Loader2, ArrowRight, MessageCircle, ShieldCheck,
  KeyRound, ArrowLeft, RefreshCw, Lock, Sparkles, CheckCircle2, Copy
} from "lucide-react";
import { Helmet } from "react-helmet-async";

interface ClientHomeProps {
  onLogin: (souscripteur: any, plantations: any[], paiements: any[]) => void;
}

type Step = 'phone' | 'otp';

const ClientHome = ({ onLogin }: ClientHomeProps) => {
  const { toast } = useToast();
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
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
  }, []);

  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  const formatPhoneDisplay = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 10);
    return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelephone(e.target.value.replace(/\D/g, '').slice(0, 10));
  };

  const handleSendOTP = async () => {
    const cleanPhone = telephone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast({ variant: "destructive", title: "Numéro incomplet", description: "Veuillez saisir vos 10 chiffres." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { telephone: cleanPhone, action: 'send' } });
      if (error) throw new Error(error.message);
      if (!data?.success) { toast({ variant: "destructive", title: "Erreur", description: data?.error || "Impossible d'envoyer le code" }); return; }
      setDevCode(data?.devMode && data?.devCode ? data.devCode : null);
      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpTimer(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
      toast({
        title: data?.devMode ? "Code de test généré" : "Code envoyé",
        description: data?.devMode ? "Le code s'affiche à l'écran." : "Un SMS a été envoyé."
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur d'envoi" });
    } finally { setLoading(false); }
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && newDigits.every(d => d !== '')) handleVerifyOTP(fullCode);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) { setOtpDigits(paste.split('')); handleVerifyOTP(paste); }
  };

  const fillDevCode = () => {
    if (!devCode) return;
    setOtpDigits(devCode.split(''));
    handleVerifyOTP(devCode);
  };

  const handleVerifyOTP = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { telephone, action: 'verify', code } });
      if (error) throw new Error(error.message);
      if (!data?.success) {
        toast({ variant: "destructive", title: "Code incorrect", description: data?.error || "Vérification échouée" });
        setOtpDigits(['', '', '', '', '', '']); inputRefs.current[0]?.focus(); setLoading(false); return;
      }
      const { data: subData, error: subError } = await supabase.functions.invoke("subscriber-lookup", { body: { telephone } });
      if (subError) throw new Error(subError.message);
      if (!subData?.success) {
        toast({ variant: "destructive", title: "Compte introuvable", description: "Aucun compte n'est associé à ce numéro." });
        setStep('phone'); setLoading(false); return;
      }
      sessionStorage.setItem('agri_souscripteur', JSON.stringify(subData.souscripteur));
      sessionStorage.setItem('agri_plantations', JSON.stringify(subData.plantations));
      sessionStorage.setItem('agri_paiements', JSON.stringify(subData.paiements));
      onLogin(subData.souscripteur, subData.plantations, subData.paiements);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur de connexion" });
    } finally { setLoading(false); }
  };

  const handleResendOTP = async () => { if (otpTimer > 0) return; await handleSendOTP(); };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bonjour AgriCapital, je souhaite créer mon compte client.");
    window.open(`https://wa.me/2250564551717?text=${message}`, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Portail Client | AgriCapital — Paiement & suivi de plantations</title>
        <meta name="description" content="Espace sécurisé pour gérer vos plantations, mensualités et dépôts AgriCapital." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pay.agricapital.ci" />
      </Helmet>

      <div className="min-h-screen w-full bg-[#FAFAF7] text-[#1A1A1A] flex flex-col lg:flex-row">

        {/* === PANNEAU GAUCHE — Branding (desktop) === */}
        <aside className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative overflow-hidden flex-col justify-between p-12 xl:p-16"
          style={{ background: 'linear-gradient(165deg, #00643C 0%, #004D2E 55%, #002E1B 100%)' }}>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 25% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 70%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#E89C31]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#22C55E]/10 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center bg-white rounded-xl p-3 shadow-2xl">
              <img src={logoWhiteBg} alt="AgriCapital" className="h-12 xl:h-14 object-contain" />
            </div>
          </div>

          <div className="relative z-10 space-y-8">
            <div>
              <p className="text-[#E89C31] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Portail Client</p>
              <h1 className="text-white text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                Investir la terre.<br />
                <span className="text-[#E89C31]">Cultiver l'avenir.</span>
              </h1>
              <p className="text-white/70 text-base xl:text-lg mt-6 leading-relaxed max-w-md">
                Gérez vos plantations, suivez vos mensualités et effectuez vos paiements en toute simplicité, depuis un espace 100 % sécurisé.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-md">
              {[
                { icon: ShieldCheck, label: "Authentification SMS sécurisée" },
                { icon: Sparkles, label: "Paiement Mobile Money intégré" },
                { icon: CheckCircle2, label: "Suivi en temps réel de vos parcelles" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-white/85 text-sm">
                  <div className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                    <f.icon className="h-4 w-4 text-[#E89C31]" />
                  </div>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-white/50 text-xs">
            © {new Date().getFullYear()} AgriCapital SARL · Côte d'Ivoire
          </div>
        </aside>

        {/* === PANNEAU DROIT — Formulaire === */}
        <main className="flex-1 flex flex-col">
          {/* Header mobile */}
          <header className="lg:hidden px-5 pt-6 pb-2 flex items-center justify-between">
            <div className="bg-white rounded-lg p-1.5 shadow-sm border border-black/5">
              <img src={logoWhiteBg} alt="AgriCapital" className="h-9 object-contain" />
            </div>
            <span className="text-[10px] font-semibold tracking-widest text-[#00643C] uppercase">Portail Client</span>
          </header>

          <div className="flex-1 flex items-center justify-center px-5 py-8 sm:px-8 lg:px-16">
            <div className="w-full max-w-md">

              {step === 'phone' && (
                <div className="space-y-7">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00643C]/8 border border-[#00643C]/15 mb-5">
                      <Lock className="h-3 w-3 text-[#00643C]" />
                      <span className="text-[11px] font-medium text-[#00643C]">Connexion sécurisée</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F1B17]">
                      Bienvenue
                    </h2>
                    <p className="text-[#5A6660] mt-2 text-[15px]">
                      Saisissez votre numéro de téléphone pour recevoir un code de vérification.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                        Numéro de téléphone
                      </label>
                      <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 pr-3 border-r border-[#E5E7E3]">
                          <span className="text-[#5A6660] text-sm font-medium">🇨🇮 +225</span>
                        </div>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="07 59 56 60 87"
                          value={formatPhoneDisplay(telephone)}
                          onChange={handlePhoneChange}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                          autoFocus
                          className="h-14 pl-[110px] pr-12 text-base font-medium tracking-wide bg-white border-[#E5E7E3] focus-visible:border-[#00643C] focus-visible:ring-2 focus-visible:ring-[#00643C]/15 rounded-xl"
                        />
                        {telephone.length === 10 && (
                          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#00643C]" />
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleSendOTP}
                      disabled={loading || telephone.length < 10}
                      className="w-full h-14 text-[15px] font-semibold gap-2 rounded-xl bg-[#00643C] hover:bg-[#004D2E] text-white shadow-lg shadow-[#00643C]/15 transition-all"
                    >
                      {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Envoi en cours…</> : <>Continuer <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#E5E7E3]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#9CA3A0] font-medium">ou</span>
                    <div className="flex-1 h-px bg-[#E5E7E3]" />
                  </div>

                  <button
                    onClick={handleWhatsApp}
                    className="w-full h-12 rounded-xl border border-[#E5E7E3] bg-white hover:bg-[#FAFAF7] hover:border-[#00643C]/30 transition-all flex items-center justify-center gap-2.5 text-sm font-medium text-[#1A1A1A]"
                  >
                    <MessageCircle className="h-4 w-4 text-[#22C55E]" />
                    Pas de compte ? Contactez-nous
                  </button>

                  <p className="text-center text-[11px] text-[#9CA3A0]">
                    En continuant, vous acceptez nos conditions d'utilisation.
                    <br />
                    Assistance : <span className="font-semibold text-[#00643C]">05 64 55 17 17</span>
                  </p>
                </div>
              )}

              {step === 'otp' && (
                <div className="space-y-7">
                  <div>
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#00643C]/8 border border-[#00643C]/15 mb-5">
                      <KeyRound className="h-5 w-5 text-[#00643C]" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F1B17]">
                      Vérification
                    </h2>
                    <p className="text-[#5A6660] mt-2 text-[15px]">
                      Entrez le code à 6 chiffres envoyé au<br />
                      <span className="font-semibold text-[#1A1A1A]">+225 {formatPhoneDisplay(telephone)}</span>
                    </p>
                  </div>

                  {devCode && (
                    <div className="rounded-xl border border-dashed border-[#E89C31]/50 bg-[#FFF8EC] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#B97A0E]" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B97A0E]">
                            Mode test — code visible
                          </span>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(devCode)}
                          className="text-[#B97A0E] hover:text-[#8A5A0A]"
                          title="Copier"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between gap-3">
                        <span className="font-mono text-3xl font-bold tracking-[0.3em] text-[#0F1B17]">{devCode}</span>
                        <button
                          onClick={fillDevCode}
                          className="text-xs font-semibold text-[#00643C] hover:underline whitespace-nowrap"
                        >
                          Utiliser →
                        </button>
                      </div>
                      <p className="text-[10px] text-[#8A6A1A] mt-2">
                        Affichage temporaire pendant le développement. Sera désactivé en production.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                      Code de vérification
                    </label>
                    <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
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
                          className="aspect-square w-full max-w-[52px] h-14 text-center text-2xl font-bold border-[#E5E7E3] bg-white rounded-xl focus-visible:border-[#00643C] focus-visible:ring-2 focus-visible:ring-[#00643C]/15"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-[#5A6660]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Vérification du code…
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <button
                      onClick={() => { setStep('phone'); setOtpDigits(['', '', '', '', '', '']); setDevCode(null); }}
                      className="flex items-center gap-1.5 text-[#5A6660] hover:text-[#00643C] font-medium"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Modifier le numéro
                    </button>

                    {otpTimer > 0 ? (
                      <span className="text-[#9CA3A0] text-xs">Renvoi dans <span className="font-bold text-[#1A1A1A]">{otpTimer}s</span></span>
                    ) : (
                      <button
                        onClick={handleResendOTP}
                        className="flex items-center gap-1.5 text-[#00643C] font-semibold hover:underline"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Renvoyer
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Footer mobile */}
          <footer className="lg:hidden px-5 pb-6 text-center">
            <p className="text-[10px] text-[#9CA3A0]">
              © {new Date().getFullYear()} AgriCapital · Investir la terre. Cultiver l'avenir.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
};

export default ClientHome;
