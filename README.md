# Trike — application de gestion des livraisons

Application web complète (frontend + backend) pour piloter l'activité : livraisons, produits,
salle de commande, caisse, clients, rapports, utilisateurs et paramètres, avec connexion par
e-mail / mot de passe et deux rôles (directeur, livreur). Interface en français et en anglais.

## Stack technique

- **Framework** : TanStack Start v1 (React 19, SSR/SSG, server functions)
- **Build** : Vite 7
- **Style** : Tailwind CSS v4 + composants shadcn/ui
- **Backend** : Lovable Cloud (base de données, authentification, stockage de fichiers, fonctions)
- **Langue** : TypeScript

## Prérequis

- Node.js 20 ou plus récent
- Bun (recommandé) ou npm

## Installation

```bash
# avec Bun
bun install

# ou avec npm
npm install
```

## Variables d'environnement

Copiez le modèle puis renseignez les valeurs de votre backend :

```bash
cp .env.example .env
```

| Variable | Rôle |
| --- | --- |
| `SUPABASE_PROJECT_ID` | Identifiant du backend (côté serveur) |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publique d'accès (côté serveur) |
| `SUPABASE_URL` | URL du backend (côté serveur) |
| `VITE_SUPABASE_PROJECT_ID` | Identifiant du backend (exposée au navigateur) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique d'accès (exposée au navigateur) |
| `VITE_SUPABASE_URL` | URL du backend (exposée au navigateur) |

Les valeurs sont visibles dans **View Backend** (Lovable Cloud) pour votre projet.

## Lancer en développement

```bash
bun run dev      # ou npm run dev
```

L'application est ensuite disponible sur `http://localhost:8080`.

## Autres commandes

```bash
bun run build      # build de production
bun run preview    # prévisualiser le build
bun run lint       # vérification du code
bun run format     # formatage
```

## Base de données

Le dossier `supabase/migrations/` contient l'historique complet du schéma :
rôles, profils utilisateurs, produits, clients, livraisons, mouvements de caisse,
paramètres entreprise, règles de sécurité (RLS) et déclencheurs automatiques
(stock mis à jour à la création / annulation / retour d'une livraison).

Ces migrations sont déjà appliquées sur le backend Lovable Cloud du projet.
Si vous repartez sur un backend vierge, rejouez-les dans l'ordre.

## Structure

```text
src/
  routes/          pages (auth, dashboard, livraisons, produits, caisse, ...)
  components/      interface partagée + composants ui/
  integrations/    accès au backend (client, types, middleware d'auth)
  lib/             auth, i18n FR/EN, export CSV, helpers
  server/          fonctions côté serveur (création d'utilisateur, etc.)
  styles.css       thème Tailwind v4 (couleurs, ombres, typographie)
supabase/
  migrations/      schéma et données SQL
  config.toml      configuration du backend
```

## Sécurité déjà en place

- Row Level Security sur toutes les tables (un livreur ne voit que ce qui le concerne)
- Rôles dans une table séparée, vérifiés côté serveur (`has_role`)
- Buckets de fichiers non listables, uploads limités en taille et en format
- Fonctions sensibles réservées aux directeurs

## Déploiement

Depuis Lovable, utilisez le bouton **Publish** pour mettre en ligne.
Pour auto-héberger le projet, suivez la documentation de déploiement TanStack Start
(build `bun run build` puis servez le dossier de sortie).
