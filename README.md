# Tsuki Scans

> Ta prochaine lecture, trouvée dans le noir.

Une PWA premium de découverte et de lecture de mangas. Le manga est le héros ;
l'interface s'efface. Noir infini, lumière de lune, grilles strictes — pensée
comme Netflix / Spotify / Apple TV, pas comme un site de scans.

## Démarrer

```bash
npm install
npm run dev        # serveur de dev
npm run build      # build de production (TS + Vite + service worker PWA)
npm run preview    # sert le build
npm run icons      # régénère les icônes PWA (public/icons)
```

Ouvre l'URL affichée. Sur mobile, « Ajouter à l'écran d'accueil » installe l'app.

## Ce qui est construit

- **Onboarding** — accès immédiat (Google / Discord / Invité, non bloquant) puis
  sélection de 5 mangas qui amorce le profil de goûts.
- **Accueil dynamique** — héros, « Continuer la lecture » avec reprise exacte, et
  des rails personnalisés (Recommandé, Parce que vous avez aimé…, Tendances,
  Nouveautés, Pépites cachées, + rails par genre ordonnés selon vos goûts).
- **Feed de découverte** — scroll vertical plein écran façon TikTok, score de
  compatibilité, lecture immédiate.
- **Lecteur immersif** — modes vertical / page à page / double page, auto-scroll
  (0.5×→2×) avec vitesse intelligente selon la densité de la page, mode
  immersion, reprise au pixel près (chapitre + page + scroll).
- **Bibliothèque** — favoris, en cours, hors-ligne, terminés.
- **Recherche** — par titre / auteur / thème / genre, triée par compatibilité.
- **Profil** — empreinte de lecture et gestion des sources.

## Architecture

```
src/
  data/catalog.ts        Catalogue local (source de contenu active, hors-ligne)
  lib/
    types.ts             Modèle de domaine + interface MangaSource
    sources.ts           Système de sources modulaire (local + dépôts Keiyoushi)
    recommend.ts         Moteur de recommandations (vecteur de goûts, compatibilité)
  store/useStore.ts      État persistant (zustand + localStorage)
  components/            CoverArt, PageArt, Rail, CompatRing, BottomNav, icônes…
  screens/               Onboarding, Home, Discover, Detail, Reader, Library, Search, Profile
  styles/                tokens.css (OKLCH) + ui.css + global.css
```

### Sources modulaires

Aucune source n'est codée en dur dans l'architecture. L'app dialogue avec
l'interface `MangaSource`. Les dépôts sont des données : on peut en ajouter,
les activer/désactiver ou les remplacer depuis l'écran **Profil → Sources &
dépôts**. Le dépôt Keiyoushi (`index.min.json`) est analysé en direct pour
lister les sources disponibles ; l'exécution du scraping d'une source distante
nécessite un pont natif, d'où une architecture prête à évoluer vers le natif
(Capacitor).

### Visuels

Les couvertures et les pages sont générées procéduralement (déterministe par
œuvre / chapitre / page) : zéro image cassée, zéro dépendance externe, un rendu
art-directed cohérent. Le système est conçu pour brancher de vraies images
quand une source de contenu réelle est connectée.

### PWA & hors-ligne

`vite-plugin-pwa` (Workbox) précache le shell applicatif et met en cache les
polices/icônes. Le catalogue local et les chapitres « téléchargés » restent
lisibles sans connexion.
