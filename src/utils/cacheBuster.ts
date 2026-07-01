/**
 * PWA Cache-Busting
 * -----------------
 * Empêche l'app d'afficher une ancienne page quand le client a un cache HTML/JS
 * périmé (notamment dans le preview Lovable, ou après un déploiement Vercel).
 *
 * Stratégie :
 *  1. Un identifiant de build (`__APP_BUILD_ID__`) est injecté par Vite à chaque
 *     build. Il change à chaque déploiement.
 *  2. Au démarrage, on compare l'ID stocké en localStorage à l'ID courant.
 *     S'il diffère, on purge caches + service workers puis on recharge.
 *  3. On repolle `index.html` en `no-store` toutes les 2 min pour détecter un
 *     nouveau déploiement pendant que l'onglet est ouvert, et on recharge dès
 *     qu'un nouveau hash de script principal apparaît.
 *  4. On recharge aussi quand l'onglet redevient visible après > 5 min.
 */

declare const __APP_BUILD_ID__: string;

const STORAGE_KEY = 'agc_app_build_id';
const LAST_CHECK_KEY = 'agc_app_last_check';
const POLL_INTERVAL_MS = 2 * 60 * 1000;
const VISIBILITY_STALE_MS = 5 * 60 * 1000;

const currentBuildId =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

async function purgeAllCachesAndWorkers() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(regs.map((r) => r.unregister()));
    }
  } catch { /* ignore */ }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } catch { /* ignore */ }
}

function forceReload() {
  const url = new URL(window.location.href);
  url.searchParams.set('_v', String(Date.now()));
  window.location.replace(url.toString());
}

async function fetchRemoteBuildFingerprint(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Extrait le hash du bundle principal (/assets/index-XXXX.js)
    const match = html.match(/\/assets\/[^"']*\.js/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

let initialFingerprint: string | null = null;

async function checkForUpdate() {
  const remote = await fetchRemoteBuildFingerprint();
  if (!remote) return;
  if (initialFingerprint === null) {
    initialFingerprint = remote;
    return;
  }
  if (remote !== initialFingerprint) {
    await purgeAllCachesAndWorkers();
    forceReload();
  }
}

export async function initCacheBuster() {
  // 1) Comparaison build ID entre sessions
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== currentBuildId) {
      localStorage.setItem(STORAGE_KEY, currentBuildId);
      await purgeAllCachesAndWorkers();
      forceReload();
      return;
    }
    localStorage.setItem(STORAGE_KEY, currentBuildId);
  } catch { /* ignore */ }

  // 2) Empreinte initiale
  initialFingerprint = await fetchRemoteBuildFingerprint();

  // 3) Polling périodique
  setInterval(() => {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    void checkForUpdate();
  }, POLL_INTERVAL_MS);

  // 4) Onglet redevenu visible après une longue absence
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (Date.now() - last > VISIBILITY_STALE_MS) {
      void checkForUpdate();
    }
  });
}

export const APP_BUILD_ID = currentBuildId;
