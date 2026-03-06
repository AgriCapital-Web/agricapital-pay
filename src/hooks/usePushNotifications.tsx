import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
}

export const usePushNotifications = () => {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées sur cet appareil"
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des alertes pour vos paiements"
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Notifications refusées",
          description: "Vous pouvez les activer dans les paramètres de votre navigateur"
        });
        return false;
      }
    } catch (error) {
      console.error('Erreur permission notification:', error);
      return false;
    }
  }, [isSupported, toast]);

  const showNotification = useCallback(async (payload: NotificationPayload) => {
    if (permission !== 'granted') {
      // Fallback: show as toast
      toast({ title: payload.title, description: payload.body });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/logo-agricapital.png',
        badge: payload.badge || '/icons/icon-192x192.png',
        tag: payload.tag,
        data: payload.data,
        vibrate: [200, 100, 200],
      } as NotificationOptions);
    } catch {
      // Fallback: classic notification or toast
      try {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/logo-agricapital.png',
          tag: payload.tag
        });
      } catch {
        toast({ title: payload.title, description: payload.body });
      }
    }
  }, [permission, toast]);

  const notifyPaymentSuccess = useCallback((montant: number, reference: string) => {
    const formatted = new Intl.NumberFormat('fr-FR').format(montant);
    showNotification({
      title: '✅ Paiement validé',
      body: `Votre paiement de ${formatted} F CFA a été validé. Réf: ${reference}`,
      tag: `payment-success-${reference}`,
      data: { type: 'payment_success', reference }
    });
  }, [showNotification]);

  const notifyPaymentFailed = useCallback((reference: string, reason?: string) => {
    showNotification({
      title: '❌ Paiement échoué',
      body: reason || `Le paiement ${reference} n'a pas pu être effectué. Veuillez réessayer.`,
      tag: `payment-failed-${reference}`,
      data: { type: 'payment_failed', reference }
    });
  }, [showNotification]);

  const notifyArrears = useCallback((montant: number, jours: number) => {
    const formatted = new Intl.NumberFormat('fr-FR').format(montant);
    showNotification({
      title: '⚠️ Rappel de paiement',
      body: `Vous avez ${jours} jour(s) d'arriérés pour un montant de ${formatted} F CFA.`,
      tag: 'arrears-reminder',
      data: { type: 'arrears_reminder', montant, jours }
    });
  }, [showNotification]);

  const notifyDeadline = useCallback((plantation: string, joursRestants: number, montant: number) => {
    const formatted = new Intl.NumberFormat('fr-FR').format(montant);
    showNotification({
      title: '📅 Échéance de paiement',
      body: `Plantation ${plantation}: ${formatted} F CFA à payer dans ${joursRestants} jour(s).`,
      tag: `deadline-${plantation}`,
      data: { type: 'payment_deadline', plantation, joursRestants }
    });
  }, [showNotification]);

  // Check arrears and send notifications
  const checkAndNotifyArrears = useCallback((plantations: any[], souscripteur: any) => {
    if (permission !== 'granted') return;

    const tarifJour = souscripteur?.offres?.contribution_mensuelle_par_ha
      ? (souscripteur.offres.contribution_mensuelle_par_ha / 30) : 65;

    let totalArrears = 0;
    let maxJoursRetard = 0;

    plantations.forEach((p: any) => {
      const arriere = p._arriere || 0;
      const jours = p._jours_retard || 0;
      totalArrears += arriere;
      if (jours > maxJoursRetard) maxJoursRetard = jours;
    });

    if (totalArrears > 1000) {
      // Only notify once per session
      const lastNotif = sessionStorage.getItem('last_arrears_notif');
      const now = Date.now();
      if (!lastNotif || now - parseInt(lastNotif) > 3600000) {
        notifyArrears(totalArrears, maxJoursRetard);
        sessionStorage.setItem('last_arrears_notif', now.toString());
      }
    }
  }, [permission, notifyArrears]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    notifyPaymentSuccess,
    notifyPaymentFailed,
    notifyArrears,
    notifyDeadline,
    checkAndNotifyArrears
  };
};

export default usePushNotifications;
