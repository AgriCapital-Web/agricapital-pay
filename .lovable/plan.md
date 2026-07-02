## Refonte pay.agricapital.ci → client.agricapital.ci

Portée : préserver 100% de l'existant (auth OTP, paiements KKiaPay, historique, portefeuille) et ajouter un espace "Ma Plantation" complet avec les 12 nouveaux modules, sans casser le tunnel de paiement.

Décision architecture : nouvel écran `ClientPlantationHub` à onglets, accessible depuis le dashboard via un CTA "Ma Plantation". Le dashboard existant reste la page d'accueil et garde le paiement en priorité visuelle.

### Phase 1 — Fondations + navigation (livrée maintenant)

**A. Rebranding domaine → client.agricapital.ci**
- `index.html` : canonical, og:url, twitter:url, JSON-LD, apple-mobile-web-app-title
- `public/sitemap.xml`, `public/robots.txt`, `public/llms.txt`
- `public/manifest-client.json` : id, start_url, name
- Vercel : ajout `client.agricapital.ci` comme hostname alias (via `vercel.json`), redirection 301 depuis `pay.agricapital.ci`
- Google Search Console : token META déjà présent, ajout de la nouvelle propriété `client.agricapital.ci` via l'API

**B. Nouveau hub "Ma Plantation" avec 8 onglets**
```text
┌─────────────────────────────────────────────┐
│ Dashboard (existant) → CTA "Ma Plantation"  │
└────────────────┬────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│  Ma Plantation — [Sélecteur plantation]     │
├──┬──┬──┬──┬──┬──┬──┬──────────────────────┤
│Vue│Prog│Tech│Médias│Docs│Carte│Rapp│Msg │
└──┴──┴──┴──┴──┴──┴──┴──────────────────────┘
```
- `ClientPlantationHub.tsx` : layout responsive avec onglets shadcn (sidebar desktop, tabs mobiles)
- Sélecteur multi-plantations en haut (une seule = auto)
- Route interne via state (pas de react-router pour rester dans le portail existant)

### Phase 2 — Contenu des onglets (livrée maintenant, données CRM en attente)

**Vue d'ensemble** : nom client, formule (PalmInvest/+, TerraPalm/+), culture, superficie, localisation, date démarrage, statut plantation (badge coloré : En préparation → Aménagement → Plantation → Croissance → Production → Remise)

**Progression** : stepper vertical 9 étapes (Défrichage → Piquetage → Trouaison → Planting → Remplacement manquants → Entretien → Fertilisation → Mise en production → Remise). Pour PalmInvest / TerraPalm : s'arrête à "Remise au client". Pour PalmInvest+ / TerraPalm+ : continue avec suivi post-remise (Production, Récoltes, Revenus). Chaque étape : date, statut, badge, empty state "En attente de mise à jour par votre technicien".

**Données techniques** : cartes stats (plants prévus, mis en terre, taux réussite, remplacés, surface plantée), timeline "Dernière intervention" / "Prochaine intervention"

**Médias** : grille photos/vidéos filtrable par opération. Empty state avec icône appareil photo.

**Documents** : liste (Contrat, Annexes, Plans topographiques, Plans plantation) avec bouton téléchargement (utilise buckets `documents` / `documents-fonciers` existants via signed URL).

**Carte** : composant Leaflet (déjà envisageable) ou embed OpenStreetMap avec marker sur les coords GPS de la plantation (`latitude`, `longitude` déjà en DB), bouton "Ouvrir dans Google Maps".

**Rapports** : liste mensuel/trimestriel/annuel avec preview + download.

**Messagerie** : UI de conversation (Client / Support / Technicien / Commercial) — placeholder connecté à une future table `messages_plantation`, avec notifications non-lues.

### Phase 3 — Modules avancés PalmInvest+ / TerraPalm+ (livrée maintenant, empty states)

Nouveaux onglets conditionnels affichés uniquement si `offres.code` se termine par `+` :
- **Production** : production annuelle/cumulée, tonnage, historique récoltes, prix bord champ, valeur brute
- **Entretien** : nettoyages, fertilisations, traitements + historique
- **Intrants** : recommandés, quantités, coût, statut appro/application
- **Paiement intrants** : nouveau tunnel (comptant / échelonné / retenue sur revenus) — UI seulement, backend en attente CRM
- **Revenus** : répartition 70/30 avec graphique donut, historique versements
- **Suivi long terme** : timeline 28 ans (récoltes, tonnages, revenus, prix marché)

### Section technique

**Nouveaux composants (13)** :
- `src/pages/client/ClientPlantationHub.tsx`
- `src/components/plantation/PlantationSelector.tsx`
- `src/components/plantation/tabs/OverviewTab.tsx`
- `src/components/plantation/tabs/ProgressionTab.tsx` (stepper 9 étapes + logique CAS 1/CAS 2)
- `src/components/plantation/tabs/TechniqueTab.tsx`
- `src/components/plantation/tabs/MediasTab.tsx`
- `src/components/plantation/tabs/DocumentsTab.tsx`
- `src/components/plantation/tabs/MapTab.tsx` (Leaflet + lien Google Maps)
- `src/components/plantation/tabs/RapportsTab.tsx`
- `src/components/plantation/tabs/MessagerieTab.tsx`
- `src/components/plantation/tabs/ProductionTab.tsx` (conditionnel +)
- `src/components/plantation/tabs/IntrantsTab.tsx` (conditionnel +)
- `src/components/plantation/tabs/RevenusTab.tsx` (conditionnel +)

**Composant partagé** :
- `src/components/plantation/EmptyState.tsx` avec message "En attente de mise à jour par votre équipe AgriCapital"
- `src/components/plantation/StatusBadge.tsx` (mapping statut → couleur/icône)

**Intégration ClientPortal** : nouveau state `view: 'plantation-hub'`, CTA depuis dashboard, bouton retour.

**Edge function `subscriber-lookup`** : étendue pour retourner (quand disponibles côté CRM) `etapes`, `medias`, `documents`, `rapports`, `messages`, `productions`, `intrants`, `revenus`. Pour l'instant retourne `[]` proprement.

**SEO** : llms.txt réécrit pour lister tous les modules (Progression, Médias, Rapports, etc.) afin d'être bien référencé par les IA. sitemap.xml pointe vers client.agricapital.ci. Trigger scan SEO à la fin.

**Vercel + DNS** : ajout `vercel.json` avec redirections 301 pay → client. L'utilisateur pointe ses DNS.

**Cache-buster** : déjà en place, incrémenté automatiquement à chaque build.

### Ce qui n'est PAS livré ce turn (nécessite le CRM)

- Tables Supabase pour étapes, médias terrain, rapports, messages, production, intrants, revenus (l'utilisateur a demandé "attendre le CRM")
- Real-time messagerie et notifications sur nouveaux médias
- Push notifications pour nouveau rapport / photo
- Bord champ auto-updaté (nécessite source prix)

Ces éléments seront branchés dès que le CRM aura livré ses schémas — l'UI est prête à consommer.

### Prochaines actions demandées

Confirme "OK go" pour que je lance l'exécution (≈ 13 nouveaux fichiers, 4 fichiers modifiés, 1 trigger SEO scan).