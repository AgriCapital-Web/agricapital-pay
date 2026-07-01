import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initCacheBuster } from "./utils/cacheBuster";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => undefined);
}

// Cache-busting PWA : détecte les nouveaux déploiements et force le reload
// pour éviter tout affichage d'une ancienne page depuis un cache périmé.
void initCacheBuster();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
