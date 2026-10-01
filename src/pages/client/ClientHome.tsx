import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logoWhiteBg from "@/assets/logo-white-bg.png";
import { Loader2, ArrowRight, MessageCircle, ShieldCheck, KeyRound, ArrowLeft, Lock, Sparkles, CheckCircle2, Copy } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PortalAccessSupportDialog from "@/components/client/PortalAccessSupportDialog";

interface ClientHomeProps { onLogin: (client: any, plantations: any[], paiements: any[]) => void; }
type Step = "phone" | "setup" | "login" | "demo";

const ClientHome = ({ onLogin }: ClientHomeProps) => {
  const { toast } = useToast();
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [accessCode, setAccessCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => { document.title = "Portail Client | AgriCapital"; }, []);

  const cleanPhone = () => telephone.replace(/\D/g, "").slice(0, 10);
  const formatPhoneDisplay = (value: string) => value.replace(/\D/g, "").slice(0, 10).replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelephone(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const saveSession = (data: any, token?: string, demo = false) => {
    const client = data.client || data.souscripteur;
    sessionStorage.setItem("agri_client", JSON.stringify(client));
    sessionStorage.setItem("agri_souscripteur", JSON.stringify(client));
    sessionStorage.setItem("agri_plantations", JSON.stringify(data.plantations || []));
    sessionStorage.setItem("agri_paiements", JSON.stringify(data.paiements || []));
    if (token) sessionStorage.setItem("agri_portal_access_token", token);
    if (demoToken) sessionStorage.setItem("agri_demo_token", demoToken);
    if (demo && demoCode) sessionStorage.setItem("agri_demo_code", demoCode);
    sessionStorage.setItem("agri_demo", demo ? "1" : "0");
    onLogin(client, data.plantations || [], data.paiements || []);
  };

  const loadRealClient = async (token: string) => {
    const { data, error } = await supabase.functions.invoke("client-portal-data", { body: { access_token: token } });
    if (error || !data?.success) throw new Error(data?.error || error?.message || "Impossible de charger votre espace client.");
    saveSession(data, token, false);
  };

  const loadDemo = async () => {
    const { data, error } = await supabase.functions.invoke("subscriber-lookup", {
      body: { telephone: cleanPhone(), silent: true, demo_token: demoToken, demo_code: demoCode },
    });
    if (error || !data?.success) throw new Error(data?.error || error?.message || "Impossible de charger la démonstration.");
    saveSession(data, undefined, true);
  };

  const handlePhoneContinue = async () => {
    const phone = cleanPhone();
    if (phone.length < 8) { toast({ variant: "destructive", title: "Numéro incomplet", description: "Veuillez saisir un numéro valide." }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-access", { body: { action: "inspect", telephone: phone } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Vérification impossible.");
      if (data.demo) { setDemoCode(data.access_code); setDemoToken(data.demo_token); setClientName(""); setStep("demo"); }
      else if (data.needs_access_code_setup) { setAccessCode(""); setConfirmCode(""); setClientName(data.nom_complet || ""); setStep("setup"); }
      else { setAccessCode(""); setClientName(data.nom_complet || ""); setStep("login"); }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message || "Connexion impossible." });
    } finally { setLoading(false); }
  };

  const handleSetup = async () => {
    if (!/^\d{4}$/.test(accessCode) || accessCode !== confirmCode) { toast({ variant: "destructive", title: "Code invalide", description: "Les deux champs doivent contenir le même code à 4 chiffres." }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-access", { body: { action: "setup", telephone: cleanPhone(), code: accessCode, confirm_code: confirmCode } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Enregistrement impossible.");
      await new Promise((resolve) => setTimeout(resolve, 250));
      await loadRealClient(data.access_token);
      sessionStorage.setItem("agri_access_code_saved", "1");
    } catch (e: any) { toast({ variant: "destructive", title: "Erreur", description: e.message || "Impossible d'enregistrer le code." }); }
    finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!/^\d{4}$/.test(accessCode)) { toast({ variant: "destructive", title: "Code requis", description: "Veuillez saisir votre code d'accès à 4 chiffres." }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-access", { body: { action: "login", telephone: cleanPhone(), code: accessCode } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Code incorrect.");
      await loadRealClient(data.access_token);
    } catch (e: any) { toast({ variant: "destructive", title: "Connexion refusée", description: e.message || "Code incorrect." }); }
    finally { setLoading(false); }
  };

  const handleDemo = async () => { if (!demoCode || !demoToken) return; setLoading(true); try { await loadDemo(); } catch (e:any) { toast({variant:"destructive",title:"Erreur",description:e.message}); } finally {setLoading(false);} };
  const handleWhatsApp = () => window.open("https://wa.me/2250564551717?text="+encodeURIComponent("Bonjour AgriCapital, je souhaite créer mon compte client."), "_blank");

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
                { icon: ShieldCheck, label: "Connexion par code d'accès personnel à 4 chiffres" },
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
                      Saisissez votre numéro de téléphone pour accéder à votre espace client.
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
                          onKeyDown={(e) => e.key === 'Enter' && handlePhoneContinue()}
                          autoFocus
                          className="h-14 pl-[110px] pr-12 text-base font-medium tracking-wide bg-white border-[#E5E7E3] focus-visible:border-[#00643C] focus-visible:ring-2 focus-visible:ring-[#00643C]/15 rounded-xl"
                        />
                        {telephone.replace(/\D/g, "").length >= 8 && (
                          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#00643C]" />
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handlePhoneContinue}
                      disabled={loading || telephone.replace(/\D/g, "").length < 8}
                      className="w-full h-14 text-[15px] font-semibold gap-2 rounded-xl bg-[#00643C] hover:bg-[#004D2E] text-white shadow-lg shadow-[#00643C]/15 transition-all"
                    >
                      {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Vérification…</> : <>Continuer <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#E5E7E3]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#9CA3A0] font-medium">ou</span>
                    <div className="flex-1 h-px bg-[#E5E7E3]" />
                  </div>

                  <button
                    onClick={() => setSupportOpen(true)}
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

              {(step === "login" || step === "demo") && (
                <div className="space-y-7">
                  <div>
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#00643C]/8 border border-[#00643C]/15 mb-5">
                      <KeyRound className="h-5 w-5 text-[#00643C]" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F1B17]">
                      {step === "setup" ? "Créer votre code d'accès" : step === "login" ? "Votre code d'accès" : "Mode découverte"}
                    </h2>
                    <p className="text-[#5A6660] mt-2 text-[15px] leading-relaxed">
                      {step === "setup"
                        ? "Lors de votre première connexion, choisissez un code personnel à 4 chiffres. Il servira désormais à accéder à votre espace client."
                        : step === "login"
                          ? "Saisissez le code personnel à 4 chiffres enregistré lors de votre première connexion."
                          : "Ce numéro n'est pas enregistré comme client AgriCapital. Un espace de démonstration est disponible automatiquement."}
                    </p>
                  </div>

                  {step === "demo" && demoCode && (
                    <div className="rounded-xl border border-dashed border-[#E89C31]/50 bg-[#FFF8EC] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#B97A0E]">Code d'accès démo</span>
                        <button onClick={() => navigator.clipboard.writeText(demoCode)} className="text-[#B97A0E]" title="Copier"><Copy className="h-4 w-4" /></button>
                      </div>
                      <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-[#0F1B17]">{demoCode}</p>
                      <p className="text-[10px] text-[#8A6A1A] mt-2">Code valable pour cette session de démonstration. Aucune donnée réelle n'est modifiée.</p>
                    </div>
                  )}

                  {step === "login" && clientName && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">Client</label>
                      <Input value={clientName} readOnly className="h-12 bg-[#F5F7F5] text-[#1A1A1A] font-semibold rounded-xl border-[#DDE4DE]" />
                    </div>
                  )}

                  {step !== "demo" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                          Code d'accès à 4 chiffres
                        </label>
                        <Input type="password" inputMode="numeric" maxLength={4} value={accessCode} onChange={(e)=>setAccessCode(e.target.value.replace(/\D/g,"").slice(0,4))} className="h-14 text-center text-2xl tracking-[0.5em] rounded-xl" autoFocus />
                      </div>
                      {step === "setup" && (
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">Confirmer le code</label>
                          <Input type="password" inputMode="numeric" maxLength={4} value={confirmCode} onChange={(e)=>setConfirmCode(e.target.value.replace(/\D/g,"").slice(0,4))} className="h-14 text-center text-2xl tracking-[0.5em] rounded-xl" />
                        </div>
                      )}
                    </div>
                  )}

                  {false && step === "setup" && <div className="rounded-xl bg-[#00643C]/5 border border-[#00643C]/10 p-4 text-sm text-[#315248]"><strong>Important :</strong> votre code d'accès a été enregistré de façon sécurisée. Merci de le noter et de le conserver dans un lieu sûr. AgriCapital ne vous demandera jamais de le communiquer à un tiers.</div>}

                  <Button onClick={step === "setup" ? handleSetup : step === "login" ? handleLogin : handleDemo} disabled={loading || (step !== "demo" && accessCode.length !== 4)} className="w-full h-14 rounded-xl bg-[#00643C] hover:bg-[#004D2E] text-white font-semibold">
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Connexion…</> : step === "demo" ? <>Utiliser et ouvrir la démo <ArrowRight className="h-4 w-4" /></> : <>Accéder <ArrowRight className="h-4 w-4" /></>}
                  </Button>

                  <button onClick={()=>{setStep("phone");setAccessCode("");setConfirmCode("");setDemoCode(null);setDemoToken(null);setClientName("");}} className="flex items-center gap-1.5 text-[#5A6660] hover:text-[#00643C] font-medium text-sm">
                    <ArrowLeft className="h-3.5 w-3.5" /> Modifier le numéro
                  </button>
                </div>
              )}

            </div>
          </div>

          {step === "setup" && (
            <Dialog open onOpenChange={() => undefined}>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <KeyRound className="h-5 w-5 text-[#00643C]" />
                    Créer votre code d'accès
                  </DialogTitle>
                  <p className="text-sm text-[#5A6660]">
                    Première connexion pour {clientName || "votre compte"}. Choisissez un code personnel à 4 chiffres.
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Code d'accès</label>
                    <Input type="password" inputMode="numeric" maxLength={4} autoFocus value={accessCode}
                      onChange={(e)=>setAccessCode(e.target.value.replace(/\D/g,"").slice(0,4))}
                      className="h-14 text-center text-2xl tracking-[0.5em] rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Confirmer le code</label>
                    <Input type="password" inputMode="numeric" maxLength={4} value={confirmCode}
                      onChange={(e)=>setConfirmCode(e.target.value.replace(/\D/g,"").slice(0,4))}
                      className="h-14 text-center text-2xl tracking-[0.5em] rounded-xl" />
                  </div>
                  <div className="rounded-xl bg-[#00643C]/5 border border-[#00643C]/10 p-3 text-xs text-[#315248]">
                    Merci de conserver ce code dans un lieu sûr. AgriCapital ne vous demandera jamais de le communiquer à un tiers.
                  </div>
                  <Button onClick={handleSetup} disabled={loading || accessCode.length !== 4 || confirmCode.length !== 4}
                    className="w-full h-12 rounded-xl bg-[#00643C] hover:bg-[#004D2E] text-white font-semibold">
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement…</> : <>Enregistrer et accéder <ArrowRight className="h-4 w-4 ml-2" /></>}
                  </Button>
                  <button onClick={()=>{setStep("phone");setAccessCode("");setConfirmCode("");setClientName("");}}
                    className="w-full text-sm text-[#5A6660] hover:text-[#00643C]">Modifier le numéro</button>
                </div>
              </DialogContent>
            </Dialog>
          )}

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
