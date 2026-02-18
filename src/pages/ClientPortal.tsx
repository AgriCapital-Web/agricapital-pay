import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ClientHome from "./client/ClientHome";
import ClientDashboard from "./client/ClientDashboard";
import ClientPayment from "./client/ClientPayment";
import ClientPortfolio from "./client/ClientPortfolio";
import ClientPaymentHistory from "./client/ClientPaymentHistory";
import ClientStatistics from "./client/ClientStatistics";
import PaymentReturn from "./client/PaymentReturn";
import InstallPrompt from "@/components/pwa/InstallPrompt";

type View = 'home' | 'dashboard' | 'payment' | 'portfolio' | 'history' | 'statistics' | 'payment-return';

const ClientPortal = () => {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>('home');
  const [souscripteur, setSouscripteur] = useState<any>(null);
  const [plantations, setPlantations] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);

  // Check if returning from payment
  useEffect(() => {
    const status = searchParams.get('status');
    const reference = searchParams.get('reference') || searchParams.get('ref');
    const transactionId = searchParams.get('id') || searchParams.get('transaction_id');
    
    if (status || reference || transactionId) {
      setView('payment-return');
    }
  }, [searchParams]);

  // Restore session from sessionStorage
  useEffect(() => {
    const savedSouscripteur = sessionStorage.getItem('agri_souscripteur');
    const savedPlantations = sessionStorage.getItem('agri_plantations');
    const savedPaiements = sessionStorage.getItem('agri_paiements');
    
    if (savedSouscripteur && view === 'home') {
      try {
        setSouscripteur(JSON.parse(savedSouscripteur));
        setPlantations(JSON.parse(savedPlantations || '[]'));
        setPaiements(JSON.parse(savedPaiements || '[]'));
        setView('dashboard');
      } catch (e) {
        sessionStorage.removeItem('agri_souscripteur');
      }
    }
  }, []);

  // PWA meta
  useEffect(() => {
    document.title = "Portail Souscripteur | AgriCapital";
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) manifestLink.setAttribute('href', '/manifest-client.json');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', '#00643C');
  }, []);

  const handleLogin = (sous: any, plants: any[], paies: any[]) => {
    setSouscripteur(sous);
    setPlantations(plants);
    setPaiements(paies);
    setView('dashboard');
  };

  const handleLogout = () => {
    setSouscripteur(null);
    setPlantations([]);
    setPaiements([]);
    sessionStorage.removeItem('agri_souscripteur');
    sessionStorage.removeItem('agri_plantations');
    sessionStorage.removeItem('agri_paiements');
    setView('home');
  };

  const handleBackFromPaymentReturn = () => {
    window.history.replaceState({}, '', window.location.pathname);
    if (souscripteur) {
      setView('dashboard');
    } else {
      setView('home');
    }
  };

  return (
    <>
      <InstallPrompt />
      
      {view === 'home' && <ClientHome onLogin={handleLogin} />}
      
      {view === 'dashboard' && (
        <ClientDashboard
          souscripteur={souscripteur}
          plantations={plantations}
          paiements={paiements}
          onPayment={() => setView('payment')}
          onPortfolio={() => setView('portfolio')}
          onHistory={() => setView('history')}
          onStatistics={() => setView('statistics')}
          onLogout={handleLogout}
        />
      )}
      
      {view === 'payment' && (
        <ClientPayment
          souscripteur={souscripteur}
          plantations={plantations}
          paiements={paiements}
          onBack={() => setView('dashboard')}
        />
      )}
      
      {view === 'portfolio' && (
        <ClientPortfolio
          souscripteur={souscripteur}
          plantations={plantations}
          paiements={paiements}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'history' && (
        <ClientPaymentHistory
          souscripteur={souscripteur}
          plantations={plantations}
          paiements={paiements}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'statistics' && (
        <ClientStatistics
          souscripteur={souscripteur}
          plantations={plantations}
          paiements={paiements}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'payment-return' && (
        <PaymentReturn onBack={handleBackFromPaymentReturn} />
      )}
    </>
  );
};

export default ClientPortal;
