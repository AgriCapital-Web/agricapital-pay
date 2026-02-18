import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    openKkiapayWidget: (config: KkiapayConfig) => void;
    addKkiapayListener: (event: string, callback: (data: any) => void) => void;
    removeKkiapayListener: (event: string, callback: (data: any) => void) => void;
  }
}

export interface KkiapayConfig {
  amount: number;
  key: string;
  sandbox?: boolean;
  email?: string;
  phone?: string;
  name?: string;
  callback?: string;
  data?: Record<string, any>;
  theme?: string;
  countries?: string[];
  paymentMethods?: string[];
}

export interface KkiapayResponse {
  transactionId: string;
  isPaymentSucces?: boolean;
  account?: string;
  label?: string;
  method?: string;
  amount?: number;
  fees?: number;
  partnerId?: string;
  performedAt?: string;
  stateData?: Record<string, any>;
  event?: string;
}

export interface KkiapayError {
  reason: string;
  error?: string;
}

// KKiaPay public key - à récupérer depuis les secrets en production
const KKIAPAY_PUBLIC_KEY = '193bbb7e7387d1c3ac16ced9d47fe52fad2b228e';

export const useKkiapay = () => {
  const scriptLoaded = useRef(false);
  const successCallback = useRef<((response: KkiapayResponse) => void) | null>(null);
  const failedCallback = useRef<((error: KkiapayError) => void) | null>(null);
  const closeCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Éviter le double chargement
    if (scriptLoaded.current) return;
    
    // Vérifier si le script est déjà chargé
    const existingScript = document.querySelector('script[src="https://cdn.kkiapay.me/k.js"]');
    if (existingScript) {
      scriptLoaded.current = true;
      return;
    }

    // Charger le SDK KKiaPay
    const script = document.createElement('script');
    script.src = 'https://cdn.kkiapay.me/k.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
      console.log('KKiaPay SDK chargé avec succès');
      
      // Configurer les listeners globaux
      if (window.addKkiapayListener) {
        window.addKkiapayListener('success', (response: KkiapayResponse) => {
          console.log('KKiaPay Success Event:', response);
          if (successCallback.current) {
            successCallback.current(response);
          }
        });

        window.addKkiapayListener('failed', (error: KkiapayError) => {
          console.log('KKiaPay Failed Event:', error);
          if (failedCallback.current) {
            failedCallback.current(error);
          }
        });

        window.addKkiapayListener('close', () => {
          console.log('KKiaPay Widget fermé');
          if (closeCallback.current) {
            closeCallback.current();
          }
        });
      }
    };
    script.onerror = () => {
      console.error('Erreur lors du chargement du SDK KKiaPay');
    };
    document.body.appendChild(script);
  }, []);

  const openPayment = useCallback((config: Omit<KkiapayConfig, 'key'>) => {
    if (!window.openKkiapayWidget) {
      console.error('KKiaPay SDK non chargé');
      return false;
    }

    try {
      window.openKkiapayWidget({
        ...config,
        key: KKIAPAY_PUBLIC_KEY,
        sandbox: false, // Mode production
        countries: ['CI'], // Côte d'Ivoire uniquement
        paymentMethods: ['momo', 'wave', 'card'], // Mobile Money, Wave, Carte
        theme: '#00643C' // Couleur AgriCapital
      });
      return true;
    } catch (error) {
      console.error('Erreur ouverture widget KKiaPay:', error);
      return false;
    }
  }, []);

  const onSuccess = useCallback((callback: (response: KkiapayResponse) => void) => {
    successCallback.current = callback;
  }, []);

  const onFailed = useCallback((callback: (error: KkiapayError) => void) => {
    failedCallback.current = callback;
  }, []);

  const onClose = useCallback((callback: () => void) => {
    closeCallback.current = callback;
  }, []);

  return {
    openPayment,
    onSuccess,
    onFailed,
    onClose,
    isLoaded: scriptLoaded.current
  };
};

export default useKkiapay;
