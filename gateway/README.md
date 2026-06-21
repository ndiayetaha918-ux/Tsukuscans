# Tsuku — Passerelle de lecture

Un mini-proxy qui tourne sur un **serveur à réseau ouvert**. Il récupère les
scans (MangaDex/Comick) côté serveur et les renvoie à l'app avec les bons
en-têtes CORS. C'est ce qui rend la lecture **fiable** quand ton réseau bloque
les sources directement.

Fichier unique : [`worker.mjs`](./worker.mjs). Aucune dépendance.

Une fois déployé, copie l'URL obtenue dans **Tsuku → Profil → Passerelle de
lecture → Tester & enregistrer**.

---

## Option A — Deno Deploy Playground (le plus simple, ~1 min, gratuit)

Aucun CLI, aucune carte : tu colles un fichier, tu obtiens une URL.

1. Ouvre https://dash.deno.com/new_playground et connecte-toi avec GitHub.
2. Efface le code d'exemple et colle tout le contenu de
   [`worker.mjs`](./worker.mjs)
   ([version brute à copier](https://raw.githubusercontent.com/ndiayetaha918-ux/Tsukuscans/claude/tsuki-scans-pwa-nirbqo/gateway/worker.mjs)).
3. Clique **Deploy**. Copie l'URL `https://<nom>.deno.dev` affichée.
4. Colle-la dans Tsuku → Profil → Passerelle → **Tester & enregistrer**.

## Option B — Cloudflare Workers (gratuit)

1. Crée un compte gratuit sur https://dash.cloudflare.com (sans carte).
2. **Workers & Pages → Create → Worker** → donne un nom (ex. `tsuku-gateway`) →
   **Deploy** (un worker « hello world » est créé).
3. **Edit code** : remplace tout le contenu par celui de `gateway/worker.mjs`,
   puis **Deploy**.
4. Ton URL est `https://tsuku-gateway.<ton-sous-domaine>.workers.dev`.
5. Colle-la dans Tsuku (Profil → Passerelle) et teste.

## Test rapide

Ouvre `https://<ton-url>/` → tu dois voir `{"ok":true,"service":"tsuku-gateway"}`.
Puis `https://<ton-url>/md/manga?title=Chainsaw%20Man&limit=1` doit renvoyer du JSON.

---

## Vérifié

Le handler est testé **contre le vrai MangaDex** dans le workflow
`.github/workflows/probe.yml` (job *Gateway test*) : il prouve qu'un chapitre FR
réel (pages JPEG) passe bien par la passerelle, CORS inclus. Regarde les logs du
job pour la preuve, pas une promesse.

> Note : la passerelle se contente de relayer des requêtes à la demande (comme
> Tachiyomi/Mihon) ; elle ne ré-héberge ni ne stocke aucun contenu.
