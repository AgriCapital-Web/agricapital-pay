import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, X, Smartphone } from 'lucide-react';
import { isOnClientPortal } from '@/hooks/useClientPortal';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const isClientPortal = isOnClientPortal();

  useEffect(() => {
    // Détecter iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(isIOSDevice);

    // Ne pas afficher si déjà installé
    if (isInStandaloneMode) return;

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Vérifier si l'utilisateur n'a pas déjà refusé
      const dismissedKey = isClientPortal ? 'pwa-install-dismissed-portail' : 'pwa-install-dismissed-crm';
      const dismissed = localStorage.getItem(dismissedKey);
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Afficher le prompt iOS après un délai
    if (isIOSDevice && !isInStandaloneMode) {
      const dismissedKey = isClientPortal ? 'pwa-install-dismissed-portail' : 'pwa-install-dismissed-crm';
      const dismissed = localStorage.getItem(dismissedKey);
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [isClientPortal]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installée');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    const dismissedKey = isClientPortal ? 'pwa-install-dismissed-portail' : 'pwa-install-dismissed-crm';
    localStorage.setItem(dismissedKey, 'true');
  };

  const appName = isClientPortal ? "Portail Souscripteur" : "CRM AgriCapital";
  const appDescription = isClientPortal 
    ? "Accédez rapidement à votre espace souscripteur depuis l'écran d'accueil" 
    : "Gérez votre plateforme AgriCapital directement depuis l'écran d'accueil";

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="max-w-md mx-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <span>Installer {appName}</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            {isIOS ? (
              <div className="space-y-3 mt-4">
                <p className="text-foreground font-medium">Pour installer l'application sur iOS :</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block px-2 py-1 bg-muted rounded">⬆️</span></li>
                  <li>Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
                  <li>Appuyez sur <strong>Ajouter</strong> en haut à droite</li>
                </ol>
              </div>
            ) : (
              <p className="mt-4">{appDescription}</p>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          {!isIOS && deferredPrompt && (
            <Button 
              onClick={handleInstall}
              size="lg"
              className="w-full gap-2"
            >
              <Download className="h-5 w-5" />
              Installer l'application
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={handleDismiss}
            className="w-full"
          >
            Plus tard
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground mt-4">
          L'installation est gratuite et ne prend que quelques secondes
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPrompt;