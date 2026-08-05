/**
 * PWA Cache-Busting
 * -----------------
 * Détecte les nouveaux déploiements et propose immédiatement à l'utilisateur
 * de charger la nouvelle version, via une bannière visible en bas d'écran.
 *
 * - Un identifiant de build (`__APP_BUILD_ID__`) est injecté par Vite à chaque build.
 * - Au démarrage, le service worker réseau-d'abord prend immédiatement le contrôle.
 * - Toutes les 20 s on repolle `index.html` (no-store) pour détecter un nouveau
 *   bundle sans attendre la prochaine ouverture. Dès qu'un nouveau hash apparaît,
 *   on affiche une bannière « Nouvelle version disponible — Recharger ».
 * - Le rechargement effectif purge caches + service workers.
 */

declare const __APP_BUILD_ID__: string;

const STORAGE_KEY = 'agc_app_build_id';
const LAST_CHECK_KEY = 'agc_app_last_check';
const POLL_INTERVAL_MS = 20 * 1000;
const VISIBILITY_STALE_MS = 30 * 1000;

const currentBuildId =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

async function purgeAllCaches() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } catch { /* ignore */ }
}

async function forceReload() {
  await purgeAllCaches();
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
    const match = html.match(/\/assets\/[^"']*\.js/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

let initialFingerprint: string | null = null;
let bannerShown = false;

function showUpdateBanner() {
  if (bannerShown) return;
  bannerShown = true;
  if (typeof document === 'undefined') return;

  const wrap = document.createElement('div');
  wrap.setAttribute('role', 'alert');
  wrap.setAttribute('aria-live', 'polite');
  wrap.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%)',
    'z-index:2147483647', 'max-width:calc(100vw - 24px)',
    'background:linear-gradient(135deg,#00643C,#003320)',
    'color:#fff', 'padding:12px 16px', 'border-radius:14px',
    'box-shadow:0 10px 30px -8px rgba(0,0,0,0.35)',
    'display:flex', 'align-items:center', 'gap:12px',
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
    'font-size:14px', 'font-weight:500',
    'border:1.5px solid #E89C31',
  ].join(';');

  const label = document.createElement('span');
  label.textContent = 'Nouvelle version disponible';
  wrap.appendChild(label);

  const btn = document.createElement('button');
  btn.textContent = 'Recharger';
  btn.style.cssText = [
    'background:#E89C31', 'color:#1a1a1a', 'border:0',
    'padding:8px 14px', 'border-radius:10px', 'font-weight:700',
    'cursor:pointer', 'font-size:13px',
  ].join(';');
  btn.onclick = () => { void forceReload(); };
  wrap.appendChild(btn);

  document.body.appendChild(wrap);
}

async function checkForUpdate() {
  const remote = await fetchRemoteBuildFingerprint();
  if (!remote) return;
  if (initialFingerprint === null) {
    initialFingerprint = remote;
    return;
  }
  if (remote !== initialFingerprint) {
    showUpdateBanner();
  }
}

export async function initCacheBuster() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${currentBuildId}`, { updateViaCache: 'none' });
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
            showUpdateBanner();
          }
        });
      });
      await registration.update();
    } catch { /* polling remains available as fallback */ }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== currentBuildId) {
      localStorage.setItem(STORAGE_KEY, currentBuildId);
      await forceReload();
      return;
    }
    localStorage.setItem(STORAGE_KEY, currentBuildId);
  } catch { /* ignore */ }

  initialFingerprint = await fetchRemoteBuildFingerprint();

  setInterval(() => {
    try { localStorage.setItem(LAST_CHECK_KEY, String(Date.now())); } catch { /* ignore */ }
    void checkForUpdate();
  }, POLL_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (Date.now() - last > VISIBILITY_STALE_MS) {
      void checkForUpdate();
    }
  });
}

export const APP_BUILD_ID = currentBuildId;
