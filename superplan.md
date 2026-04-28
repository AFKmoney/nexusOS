# SUPERPLAN — Audit Complet, Honnête et Transparent de NexusOS

> **Date** : 2026-04-01  
> **Auditeur** : Kilo (analyse automatisée + revue manuelle)  
> **Portée** : 100% du repo, tous dossiers, tous fichiers  
> **Objectif** : Identifier **tout ce qui est incomplet**, **tout ce qui doit être amélioré**, et **tout ce qui pose risque**.

---

## TABLE DES MATIÈRES

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Verdict Global](#2-verdict-global)
3. [Ce qui est Fonctionnel et Solide](#3-ce-qui-est-fonctionnel-et-solide)
4. [Problèmes Critiques (Bloquants)](#4-problèmes-critiques-bloquants)
5. [Problèmes Majeurs (À Corriger Urgemment)](#5-problèmes-majeurs-à-corriger-urgemment)
6. [Problèmes Moyens (À Corriger)](#6-problèmes-moyens-à-corriger)
7. [Problèmes Mineurs (Améliorations)](#7-problèmes-mineurs-améliorations)
8. [Incohérences et Confusions](#8-incohérences-et-confusions)
9. [Fichiers Vides, Stubs et Doublons](#9-fichiers-vides-stubs-et-doublons)
10. [État Réel des Applications](#10-état-réel-des-applications)
11. [Couverture de Tests — État Réel](#11-couverture-de-tests--état-réel)
12. [Dette Technique Détaillée](#12-dette-technique-détaillée)
13. [Ce qui Manque Absolument](#13-ce-qui-manque-absolument)
14. [Plan d'Action Priorisé](#14-plan-d-action-priorisé)
15. [Recommandations Stratégiques](#15-recommandations-stratégiques)
16. [Conclusion Honnête](#16-conclusion-honnête)

---

## 1. Résumé Exécutif

NexusOS est un projet **ambitieux, visuellement impressionnant et conceptuellement fort**. Il présente :

- ✅ Une vision produit claire et différenciante (OS IA local, souverain)
- ✅ Une architecture globale compréhensible (apps/, components/, kernel/, services/, store/)
- ✅ Un shell desktop-like crédible (taskbar, start menu, fenêtres, context menu)
- ✅ Un VFS fonctionnel avec persistance
- ✅ Un registre d'applications centralisé et bien structuré
- ✅ Un système de permissions déclaratif
- ✅ Des tests noyau de base (fileSystem, permissions, osManifest, errorGuard)
- ✅ Une documentation marketing abondante

**MAIS** :

- ❌ **L'écart entre la promesse produit et la solidité réelle est significatif**
- ❌ **Plusieurs fonctionnalités clés sont des stubs ou des re-exports**
- ❌ **La couverture de tests est insuffisante pour un projet de cette ambition**
- ❌ **Le packaging Electron est historiquement cassé**
- ❌ **La dette technique est importante et non priorisée**
- ❌ **Trop d'apps sont des prototypes non validés**

---

## 2. Verdict Global

| Dimension | Note | Commentaire |
|-----------|------|-------------|
| **Vision produit / branding** | 9/10 | Exceptionnel, identité forte |
| **Architecture de base** | 7/10 | Bonne mais inégalement tenue |
| **Shell UI / UX** | 7/10 | Credible, quelques bugs |
| **Fonctionnalités core** | 5/10 | VFS bon, mais beaucoup de stubs |
| **Qualité du code** | 5/10 | Typage permissif, couplage fort |
| **Tests** | 3/10 | Très insuffisant pour l'ambition |
| **Packaging / Release** | 3/10 | Historiquement cassé, à refaire |
| **Documentation technique** | 4/10 | Marketing fort, engineering faible |
| **Prêt pour production** | 3/10 | Prototype avancé, pas un produit fini |

**Verdict** : NexusOS est aujourd'hui un **prototype spectaculaire / démonstrateur ambitieux** avec une base technique réelle, mais **pas encore un produit industrialisé**. Le vrai chantier n'est pas d'ajouter des features, mais de **solidifier, tester, et terminer proprement les fondamentaux**.

---

## 3. Ce qui est Fonctionnel et Solide

### 3.1 Architecture et Structure
- ✅ Structure top-level claire et lisible
- ✅ Séparation apps/components/kernel/services/store
- ✅ Registre d'applications centralisé ([`appRegistry.ts`](appRegistry.ts))
- ✅ Types TypeScript bien définis ([`types.ts`](types.ts))

### 3.2 VFS (Virtual File System)
- ✅ [`kernel/fileSystem.ts`](kernel/fileSystem.ts) est un composant stratégique solide
- ✅ Fichiers, répertoires, liens symboliques
- ✅ Persistance locale
- ✅ Permissions applicatives
- ✅ Événements VFS
- ✅ Opérations move, copy, delete, stat

### 3.3 Store Global
- ✅ [`store/osStore.ts`](store/osStore.ts) centralise l'état système
- ✅ Zustand avec persistance
- ✅ Slices bien organisées ([`osStoreSlices.ts`](store/osStoreSlices.ts))
- ✅ Boot/login/session/fenêtres/notifications

### 3.4 Permissions
- ✅ [`kernel/permissions.ts`](kernel/permissions.ts) est propre et fonctionnel
- ✅ Déclaratif, grant/revoke, enforce
- ✅ Tests présents

### 3.5 Process Manager
- ✅ [`kernel/processManager.ts`](kernel/processManager.ts) est fonctionnel
- ✅ Spawn, kill, suspend, resume, minimize
- ✅ Métriques mémoire/CPU simulées

### 3.6 Tests Noyau
- ✅ [`kernel/tests/fileSystem.test.ts`](kernel/tests/fileSystem.test.ts) — 7 tests
- ✅ [`kernel/tests/permissions.test.ts`](kernel/tests/permissions.test.ts) — 4 tests
- ✅ [`kernel/tests/osManifest.test.ts`](kernel/tests/osManifest.test.ts) — tests présents
- ✅ [`kernel/tests/errorGuard.test.ts`](kernel/tests/errorGuard.test.ts) — tests présents
- ✅ [`kernel/tests/releaseReadiness.test.ts`](kernel/tests/releaseReadiness.test.ts) — validation branding

---

## 4. Problèmes Critiques (Bloquants)

### 4.1 Packaging Electron Historiquement Cassé
**Fichier** : [`build_log.txt`](build_log.txt)  
**Gravité** : CRITIQUE

**État** :
- Le `build_log.txt` référence un ancien build avec `nxss@0.0.0`
- NSIS a échoué avec `Error: can't write 67108864 bytes to output`
- Le log est marqué comme "historique" mais le problème n'est pas résolu

**Impact** :
- Pas d'installeur Windows fiable
- Release desktop non industrialisée
- Blocage de distribution

**Action requise** :
- Reproduire le build dans le repo courant
- Vérifier l'espace disque et les droits
- Réduire le poids des bundles/assets
- Auditer [`electron-builder.yml`](electron-builder.yml)
- Documenter une procédure de release unique

### 4.2 Bundle Frontend Trop Volumineux
**Fichier** : [`vite.config.ts`](vite.config.ts)  
**Gravité** : CRITIQUE

**État** :
- `manualChunks` est vide (retourne `undefined`)
- Le build log mentionne un chunk > 1 Mo minifié
- Imports dynamiques inefficaces pour [`kernel/fileSystem.ts`](kernel/fileSystem.ts) et [`kernel/memory.ts`](kernel/memory.ts)

**Impact** :
- Temps de chargement lents
- Performance initiale dégradée
- Mémoire plus élevée
- UX fragile sur machines modestes

**Action requise** :
- Implémenter `manualChunks` efficace
- Lazy loader les apps non essentielles
- Séparer shell minimal et apps secondaires
- Éviter les imports mixtes statiques/dynamiques

### 4.3 `App.tsx` Trop Monolithique
**Fichier** : [`App.tsx`](App.tsx) (12 867 chars)  
**Gravité** : CRITIQUE

**État** :
- Le fichier gère : boot, login, lock screen, desktop, widgets, clavier global, context menu, drag/drop, wallpaper procédural, intégration services
- Mélange de responsabilités UI, logique, et services

**Impact** :
- Maintenance coûteuse
- Faible testabilité
- Risque de régression élevé
- Onboarding développeur difficile

**Action requise** :
- Extraire `BootScreen` (déjà partiellement fait)
- Extraire `LoginScreen` (déjà partiellement fait)
- Extraire `DesktopShell`
- Extraire `DesktopIcons`
- Extraire `GlobalShortcuts`
- Extraire `WallpaperLayer`
- Limiter `App.tsx` au rôle d'orchestrateur

### 4.4 Store Global Trop Central
**Fichier** : [`store/osStore.ts`](store/osStore.ts)  
**Gravité** : CRITIQUE

**État** :
- Concentre : session, fenêtres, apps, notifications, autonomie, préférences, clipboard, daemon lock, wallpaper, persistance
- `currentUser` typé comme `any` (ligne 62)

**Impact** :
- Couplage fort
- Évolution risquée
- Logique métier mêlée à UI state

**Action requise** :
- Découper en slices (déjà partiellement fait dans [`osStoreSlices.ts`](store/osStoreSlices.ts))
- Typer correctement `currentUser`
- Isoler les side effects

---

## 5. Problèmes Majeurs (À Corriger Urgemment)

### 5.1 Configuration TypeScript Historiquement Permissive
**Fichier** : [`tsconfig.json`](tsconfig.json)  
**Gravité** : MAJEURE

**État actuel** (BON) :
- `"strict": true` ✅
- `"noImplicitAny": true` ✅
- `"noUncheckedIndexedAccess": true` ✅
- `"exactOptionalPropertyTypes": true` ✅
- `"forceConsistentCasingInFileNames": true` ✅
- `"allowJs": false` ✅

**Note** : Le `tsconfig.json` a été corrigé récemment. C'est un point positif.

### 5.2 Typage `any` Résiduel
**Fichiers** : multiples  
**Gravité** : MAJEURE

**Exemples trouvés** :
- [`store/osStore.ts:62`](store/osStore.ts:62) — `currentUser: ... as any`
- [`types.ts:22`](types.ts:22) — `data?: any` dans `WindowState`
- [`types.ts:8`](types.ts:8) — `AppComponent = (...args: any[]) => unknown`
- [`types.ts:155-157`](types.ts:155-157) — `window.electron` avec `any`

**Impact** :
- Bugs non captés à la compilation
- Refactor risqué
- API interne floue

**Action requise** :
- Remplacer `any` par des unions/types dédiés
- Typer les payloads d'événements
- Typer `window.__OS_STORE__`
- Typer les données de fenêtre par app

### 5.3 IDs Pinned Incohérents
**Fichier** : [`store/osStore.ts`](store/osStore.ts) (via [`osStoreConstants.ts`](store/osStoreConstants.ts))  
**Gravité** : MAJEURE

**État** :
- `pinnedApps` contient `'introduction'`
- Mais [`appRegistry.ts`](appRegistry.ts) définit l'app d'introduction comme `id: 'welcome'`

**Impact** :
- App épinglée potentiellement invalide
- Comportement incohérent dans le taskbar/start menu
- Bug UX silencieux

**Action requise** :
- Remplacer `'introduction'` par `'welcome'`
- Auditer tous les IDs d'apps référencés en dur

### 5.4 Permissions Contournables
**Fichier** : [`kernel/fileSystem.ts`](kernel/fileSystem.ts)  
**Gravité** : MAJEURE

**État** :
- `checkPermission` retourne `true` si `appId` est absent
- Bypass simple si des appels système oublient l'`appId`

**Impact** :
- Modèle de permission peu robuste
- Sécurité plus déclarative qu'imposée

**Action requise** :
- Distinguer appels système internes et appels app
- Introduire un vrai contexte d'exécution
- Journaliser les bypass système
- Rendre impossible l'accès non qualifié depuis les apps

### 5.5 Incohérence Utilisateur par Défaut dans le VFS
**Fichier** : [`kernel/fileSystem.ts`](kernel/fileSystem.ts)  
**Gravité** : MAJEURE

**État** :
- `INITIAL_FS` crée `/home/user/...`
- `getHomeDir()` retourne `/home/${user}` avec fallback `'admin'`
- Confusion entre `user`, `admin`, `daemon`

**Impact** :
- Risque de divergence entre structure initiale et chemins utilisés
- Comportements subtils sur première session

**Action requise** :
- Unifier l'utilisateur par défaut
- Créer une migration VFS versionnée
- Garantir que les profils provisionnent leur home correctement

### 5.6 Persistance de Fenêtres Fragile
**Fichier** : [`store/osStore.ts`](store/osStore.ts)  
**Gravité** : MAJEURE

**État** :
- Le store persiste `windows` dans le local storage
- Pas de versioning/migration de schéma

**Impact** :
- Restauration potentielle d'états obsolètes
- Fenêtres invalides après renommage d'app
- Erreurs silencieuses au reload

**Action requise** :
- Introduire versioning de schéma persistant
- Filtrer/restaurer seulement les fenêtres valides
- Ne pas persister certains états volatils

### 5.7 `openWindow` en Mode Quasi-Singleton Trop Rigide
**Fichier** : [`store/osStoreSlices.ts`](store/osStoreSlices.ts)  
**Gravité** : MAJEURE

**État** :
- `openWindow` empêche plusieurs fenêtres d'une même app
- Limitation UX pour un desktop-like OS

**Impact** :
- Impossibilité d'ouvrir plusieurs documents/instances
- Comportement parfois frustrant

**Action requise** :
- Définir une politique par app : singleton, multi-instance, singleton par document
- Ajouter cette configuration au `AppManifest`

---

## 6. Problèmes Moyens (À Corriger)

### 6.1 Documentation Trop Orientée Marketing
**Fichiers** : [`PROMOTION_PLAN.md`](PROMOTION_PLAN.md), [`PROMOTION_STRATEGY.md`](PROMOTION_STRATEGY.md), [`PARTNERSHIP_STRATEGY.md`](PARTNERSHIP_STRATEGY.md), [`CONTENT_CALENDAR.md`](CONTENT_CALENDAR.md), [`VIRAL_GROWTH_SYSTEM.md`](VIRAL_GROWTH_SYSTEM.md), [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md)  
**Gravité** : MOYENNE

**État** :
- Beaucoup de docs de croissance/marketing
- Documentation d'ingénierie sous-représentée

**Impact** :
- Impression que le vernis marketing avance plus vite que la base technique
- Signal "projet mature" brouillé

**Action requise** :
- Ajouter/renforcer : architecture technique réelle, matrice des apps, guide de debug, conventions de code, guide des permissions, guide du VFS, guide des builds

### 6.2 Clarifier le Statut Réel des Fonctionnalités
**Fichier** : [`README.md`](README.md)  
**Gravité** : MOYENNE

**État** :
- Le README annonce : autonomie AI avancée, local inference, browser augmenté, 50+ apps, terminal avancé, app builder IA, plugin system, ghost mode
- Le niveau de maturité réel n'est pas explicite

**Impact** :
- Risque de promesse > preuve
- Déception utilisateur si features non fonctionnelles

**Action requise** :
- Créer une matrice : Feature / Statut (prototype/beta/stable/mock/WIP) / Preuve / Risque / Étape suivante
- Réduire les claims publics aux apps les mieux tenues

### 6.3 Couplage Fort UI/Store/Kernel
**Fichiers** : multiples  
**Gravité** : MOYENNE

**État** :
- Plusieurs parties accèdent directement à `useOS.getState()`, `window.__OS_STORE__`, `localStorage`, services noyau

**Impact** :
- Logique transversale difficile à raisonner
- Dépendances implicites
- Tests plus compliqués

**Action requise** :
- Introduire plus de couches d'abstraction
- Isoler les side effects dans des hooks/services dédiés
- Réduire les accès globaux directs

### 6.4 Wallpaper Procédural dans `App.tsx`
**Fichier** : [`App.tsx`](App.tsx)  
**Gravité** : MOYENNE

**État** :
- Grand objet `PROCEDURAL_WALLPAPERS` inline avec HTML+JS embarqué

**Impact** :
- `App.tsx` gonflé
- Maintenance pénible
- Audit sécurité plus difficile
- Logique impossible à tester proprement

**Action requise** :
- Extraire dans des modules dédiés
- Encapsuler avec une API claire
- Stocker les presets séparément

### 6.5 Aliases TS Potentiellement Incomplets
**Fichier** : [`tsconfig.json`](tsconfig.json)  
**Gravité** : MOYENNE

**État** :
- `paths` existe mais pas de `baseUrl` explicite (ajouté récemment ✅)
- Harmonisation TS/Vite à vérifier

**Impact** :
- Ambiguïtés d'outillage
- Comportements différents selon tooling/plugins

**Action requise** :
- Harmoniser alias TS/Vite
- Documenter la convention d'import

### 6.6 Duplication de Tests UUID
**Fichiers** : [`utils/uuid.test.ts`](utils/uuid.test.ts), [`utils/tests/uuid.test.ts`](utils/tests/uuid.test.ts)  
**Gravité** : MOYENNE

**État** :
- Deux fichiers de tests UUID présents

**Impact** :
- Confusion
- Duplication potentielle
- Signal de structure non nettoyée

**Action requise** :
- Conserver une seule localisation de référence
- Harmoniser la stratégie de tests

---

## 7. Problèmes Mineurs (Améliorations)

### 7.1 Fichiers Vides ou Stubs
**Fichiers** :
- [`implementation_plan.md`](implementation_plan.md) — vide
- [`fix_app_tsx_not_applicable.txt`](fix_app_tsx_not_applicable.txt) — vide
- [`git`](git) — vide
- [`.islstudio/audit.jsonl`](.islstudio/audit.jsonl) — vide

**Action** : Supprimer ou documenter leur purpose

### 7.2 Fichiers de Re-Export Inutiles
**Fichiers** :
- [`apps/ModelManagerApp.tsx`](apps/ModelManagerApp.tsx) (105 chars) — juste `export { default } from './ModelManager'`
- [`apps/Settings.tsx`](apps/Settings.tsx) (150 chars) — juste `import SettingsApp from './settings/SettingsApp'; export default SettingsApp;`
- [`apps/NeuralForge.tsx`](apps/NeuralForge.tsx) (210 chars) — juste `import ForgeSystem from './forge/ForgeSystem'; export default function NeuralForgeApp(...) { return <ForgeSystem />; }`
- [`apps/Terminal.tsx`](apps/Terminal.tsx) (539 chars) — juste lazy load de `TerminalCore`

**Action** : Décider si ces re-exports sont nécessaires ou s'il faut directement importer les composants

### 7.3 Dossiers de Configuration Multiples
**Dossiers** :
- [`.claude/`](.claude/) — agents et instructions
- [`.cursor/`](.cursor/) — rules
- [`.vibecheck/`](.vibecheck/) — flow et provenance
- [`.sixth/`](.sixth/) — skills (vide)
- [`.codememory/`](.codememory/) — chunks.json (2.5 Mo)
- [`.islstudio/`](.islstudio/) — audit.jsonl (vide)

**Action** : Clarifier l'utilité de chaque dossier, supprimer ceux qui ne sont pas nécessaires

### 7.4 Fichier `decoded.txt` Volumineux
**Fichier** : [`decoded.txt`](decoded.txt) (29 589 chars)  
**Action** : Vérifier si ce fichier est nécessaire ou s'il peut être supprimé

### 7.5 Fichiers WASM Dupliqués
**Fichiers** :
- [`public/wllama-multi.wasm`](public/wllama-multi.wasm)
- [`public/wllama-single.wasm`](public/wllama-single.wasm)
- [`public/wllama/wllama-multi.wasm`](public/wllama/wllama-multi.wasm)
- [`public/wllama/wllama-single.wasm`](public/wllama/wllama-single.wasm)
- [`public/wllama/wllama.wasm`](public/wllama/wllama.wasm)

**Action** : Vérifier si les fichiers sont nécessaires ou s'il y a duplication

---

## 8. Incohérences et Confusions

### 8.1 Branding Multiplié
**État** :
- `NexusOS` (README, package.json, electron-builder.yml)
- `NXSS` (build_log.txt historique)
- `NXSS Nexus` (build_log.txt historique)

**Action** : Aligner sur `NexusOS` partout

### 8.2 Doublons d'Apps
**État** :
- [`ModelManager.tsx`](apps/ModelManager.tsx) vs [`ModelManagerApp.tsx`](apps/ModelManagerApp.tsx)
- [`Settings.tsx`](apps/Settings.tsx) vs [`apps/settings/SettingsApp.tsx`](apps/settings/SettingsApp.tsx)
- [`Terminal.tsx`](apps/Terminal.tsx) vs [`apps/terminal/TerminalCore.tsx`](apps/terminal/TerminalCore.tsx)
- Composants de recherche shell vs app `GlobalSearch`

**Action** : Clarifier la relation entre ces fichiers, documenter les choix

### 8.3 Truthpack Absent
**Fichier** : [`.cursor/rules/truthpack-first-protocol.mdc`](.cursor/rules/truthpack-first-protocol.mdc)  
**État** :
- Les règles exigent des fichiers `.vibecheck/truthpack/*`
- Le dossier [`.vibecheck/`](.vibecheck/) ne contient pas ces fichiers

**Action** : Générer ou restaurer les truthpacks requis, ou ajuster les règles

### 8.4 Incohérence de Version dans Build Log
**Fichier** : [`build_log.txt`](build_log.txt)  
**État** :
- Référence `nxss@0.0.0` alors que [`package.json`](package.json) indique `nexusos@2.0.0`

**Action** : Le fichier est marqué comme historique, mais vérifier qu'aucun build ne référence encore l'ancienne version

---

## 9. Fichiers Vides, Stubs et Doublons

| Fichier | Taille | Statut | Action |
|---------|--------|--------|--------|
| [`implementation_plan.md`](implementation_plan.md) | 0 chars | VIDE | Supprimer ou documenter |
| [`fix_app_tsx_not_applicable.txt`](fix_app_tsx_not_applicable.txt) | 0 chars | VIDE | Supprimer |
| [`git`](git) | 0 chars | VIDE | Supprimer |
| [`.islstudio/audit.jsonl`](.islstudio/audit.jsonl) | 0 chars | VIDE | Supprimer ou documenter |
| [`apps/ModelManagerApp.tsx`](apps/ModelManagerApp.tsx) | 105 chars | STUB | Clarifier ou supprimer |
| [`apps/Settings.tsx`](apps/Settings.tsx) | 150 chars | STUB | Clarifier ou supprimer |
| [`apps/NeuralForge.tsx`](apps/NeuralForge.tsx) | 210 chars | STUB | Clarifier ou supprimer |
| [`apps/Terminal.tsx`](apps/Terminal.tsx) | 539 chars | STUB | Clarifier ou supprimer |
| [`utils/uuid.test.ts`](utils/uuid.test.ts) | 2 462 chars | DOUBLON | Fusionner avec [`utils/tests/uuid.test.ts`](utils/tests/uuid.test.ts) |
| [`utils/tests/uuid.test.ts`](utils/tests/uuid.test.ts) | 2 699 chars | DOUBLON | Fusionner avec [`utils/uuid.test.ts`](utils/uuid.test.ts) |

---

## 10. État Réel des Applications

### 10.1 Apps Probablement Stables (à vérifier)
| App | Taille | Indicateurs de Solidité |
|-----|--------|------------------------|
| [`FileExplorer.tsx`](apps/FileExplorer.tsx) | 16 690 chars | Taille significative, intégration VFS |
| [`HyperIDE.tsx`](apps/HyperIDE.tsx) | 48 845 chars | Taille très significative |
| [`Notepad.tsx`](apps/Notepad.tsx) | 9 578 chars | Cas d'usage clair, lié au VFS |
| [`Dashboard.tsx`](apps/Dashboard.tsx) | 10 071 chars | App centrale de démonstration |
| [`WelcomeApp.tsx`](apps/WelcomeApp.tsx) | 9 211 chars | App d'entrée |
| [`settings/SettingsApp.tsx`](apps/settings/SettingsApp.tsx) | 20 934 chars | Taille significative |

### 10.2 Apps Probablement Prototypes
| App | Taille | Indicateurs de Fragilité |
|-----|--------|--------------------------|
| [`DaemonChat.tsx`](apps/DaemonChat.tsx) | 14 661 chars | Risque promesse > preuve |
| [`NetRunner.tsx`](apps/NetRunner.tsx) | 22 432 chars | Browser augmenté, complexe |
| [`ModelManager.tsx`](apps/ModelManager.tsx) | 17 859 chars | Validation inconnue |
| [`Silence.tsx`](apps/Silence.tsx) | 25 458 chars | Très volumineux, complexité élevée |
| [`forge/ForgeSystem.tsx`](apps/forge/ForgeSystem.tsx) | 16 220 chars | Fortement couplé au noyau |

### 10.3 Apps Probablement Demos/Stubs
| App | Taille | Indicateurs |
|-----|--------|-------------|
| [`AionAgent.tsx`](apps/AionAgent.tsx) | 10 153 chars | Expérimental |
| [`ViralApp.tsx`](apps/ViralApp.tsx) | 9 387 chars | Plus vitrine que fonctionnel |
| [`FractalVisualizer.tsx`](apps/FractalVisualizer.tsx) | 8 376 chars | Valeur visuelle, moins critique |
| [`WallpaperGen.tsx`](apps/WallpaperGen.tsx) | 17 009 chars | Liée à l'univers produit |

### 10.4 Apps à Clarifier
- [`ModelManager.tsx`](apps/ModelManager.tsx) vs [`ModelManagerApp.tsx`](apps/ModelManagerApp.tsx) — doublon ou variante ?
- [`Settings.tsx`](apps/Settings.tsx) vs [`apps/settings/SettingsApp.tsx`](apps/settings/SettingsApp.tsx) — re-export
- [`Terminal.tsx`](apps/Terminal.tsx) vs [`apps/terminal/TerminalCore.tsx`](apps/terminal/TerminalCore.tsx) — lazy load wrapper

---

## 11. Couverture de Tests — État Réel

### 11.1 Tests Existants
| Fichier | Tests | Couverture |
|---------|-------|------------|
| [`kernel/tests/fileSystem.test.ts`](kernel/tests/fileSystem.test.ts) | 7 tests | VFS de base |
| [`kernel/tests/permissions.test.ts`](kernel/tests/permissions.test.ts) | 4 tests | Permissions de base |
| [`kernel/tests/osManifest.test.ts`](kernel/tests/osManifest.test.ts) | Tests présents | Manifest système |
| [`kernel/tests/errorGuard.test.ts`](kernel/tests/errorGuard.test.ts) | Tests présents | Validation HTML |
| [`kernel/tests/releaseReadiness.test.ts`](kernel/tests/releaseReadiness.test.ts) | 3 tests | Branding/version |
| [`kernel/tests/store.test.ts`](kernel/tests/store.test.ts) | 3 tests | Store defaults |
| [`utils/uuid.test.ts`](utils/uuid.test.ts) | Tests présents | UUID generation |
| [`utils/tests/uuid.test.ts`](utils/tests/uuid.test.ts) | Tests présents | UUID generation (dupliqué) |
| [`utils/nfrEngine.test.ts`](utils/nfrEngine.test.ts) | Tests présents | NFR engine |

### 11.2 Ce qui Manque Absolument
- ❌ Tests du window manager (openWindow, closeWindow, focusWindow, etc.)
- ❌ Tests d'intégration shell (boot, login, session)
- ❌ Tests de persistance (localStorage, migration)
- ❌ Tests de régression sur les apps critiques
- ❌ Tests UI/smoke tests
- ❌ Tests de performance
- ❌ Tests de sécurité (permissions, sandbox)
- ❌ Tests des services IA (puterService, localBrain)
- ❌ Tests du process manager
- ❌ Tests de l'event bus
- ❌ Tests du theme engine
- ❌ Tests du sound system
- ❌ Tests du cron scheduler
- ❌ Tests du daemon bridge
- ❌ Tests de l'autonomie

### 11.3 Couverture Estimée
- **Kernel** : ~15% de couverture (seulement VFS, permissions, manifest, errorGuard)
- **Store** : ~5% de couverture (seulement defaults)
- **Apps** : 0% de couverture (aucun test app)
- **Components** : 0% de couverture (aucun test component)
- **Services** : 0% de couverture (aucun test service)
- **Global** : ~5% de couverture

**Verdict** : La couverture de tests est **insuffisante pour un projet de cette ambition**. Pour un OS-like complexe, il faudrait au minimum 40-60% de couverture sur le kernel et le store.

---

## 12. Dette Technique Détaillée

### 12.1 Dette de Centralisation
- [`App.tsx`](App.tsx) trop chargé (12 867 chars)
- [`osStore.ts`](store/osStore.ts) trop chargé (4 035 chars + slices 9 679 chars)
- Logique globale difficile à segmenter

### 12.2 Dette de Typage
- Résidus de `any` dans le store et les types
- `AppComponent = (...args: any[]) => unknown`
- `data?: any` dans `WindowState`
- `window.electron` avec `any`

### 12.3 Dette de Tests
- Couverture < 10% globale
- Aucun test sur les apps
- Aucun test sur les components
- Aucun test sur les services
- Aucun test d'intégration

### 12.4 Dette de Packaging
- Build Electron historiquement cassé
- Bundle trop volumineux
- Pas de code splitting efficace
- Imports mixtes statiques/dynamiques

### 12.5 Dette de Documentation
- Documentation marketing >> documentation engineering
- Pas de guide de debug
- Pas de conventions de code
- Pas de guide des permissions
- Pas de guide du VFS
- Pas de guide des builds

### 12.6 Dette de Sécurité
- Permissions contournables si `appId` absent
- Pas de sandbox réel
- Pas de validation des inputs
- Pas de CSP (Content Security Policy)

### 12.7 Dette de Performance
- Bundle > 1 Mo
- Pas de lazy loading efficace
- Pas de métriques de performance
- Pas de monitoring

---

## 13. Ce qui Manque Absolument

### 13.1 Fondamentaux Engineering
- ❌ `npm run lint` (ESLint)
- ❌ `npm run format` (Prettier)
- ❌ CI/CD reproductible (GitHub Actions)
- ❌ Migrations de persistance
- ❌ Conventions de typage strictes
- ❌ Code review checklist

### 13.2 Fondamentaux Produit
- ❌ Matrice de maturité par app
- ❌ Statut réel par fonctionnalité clé
- ❌ Scénario de démo officiel maintenu
- ❌ Golden path utilisateur

### 13.3 Fondamentaux UX
- ❌ Cohérence multi-fenêtres
- ❌ Politique singleton/multi-instance
- ❌ Gestion d'erreur utilisateur plus explicite
- ❌ Meilleure résilience des états persistés

### 13.4 Fondamentaux Release
- ❌ Build Windows reproductible
- ❌ Versioning propre
- ❌ Naming propre
- ❌ Assets builder propres
- ❌ Procédure de release documentée

### 13.5 Fondamentaux Sécurité
- ❌ Sandbox réel pour les apps
- ❌ Validation des inputs
- ❌ CSP (Content Security Policy)
- ❌ Audit de sécurité

### 13.6 Fondamentaux Performance
- ❌ Métriques de performance
- ❌ Monitoring
- ❌ Profiling
- ❌ Optimisation bundle

---

## 14. Plan d'Action Priorisé

### Phase 0 — Urgence (1-2 semaines)
1. **Corriger le packaging Electron**
   - Reproduire le build dans le repo courant
   - Vérifier l'espace disque et les droits
   - Réduire le poids des bundles/assets
   - Auditer [`electron-builder.yml`](electron-builder.yml)
   - Documenter une procédure de release unique

2. **Corriger les incohérences critiques**
   - Remplacer `'introduction'` par `'welcome'` dans `pinnedApps`
   - Unifier l'utilisateur par défaut dans le VFS
   - Typer `currentUser` dans le store

3. **Ajouter les scripts de qualité de base**
   - `npm run lint` (ESLint)
   - `npm run format` (Prettier)
   - Vérifier que `npm run typecheck` passe

### Phase 1 — Stabilisation (2-4 semaines)
1. **Réduire la taille du bundle**
   - Implémenter `manualChunks` efficace
   - Lazy loader les apps non essentielles
   - Séparer shell minimal et apps secondaires

2. **Extraire la logique de `App.tsx`**
   - Extraire `DesktopShell`
   - Extraire `DesktopIcons`
   - Extraire `GlobalShortcuts`
   - Extraire `WallpaperLayer`
   - Limiter `App.tsx` au rôle d'orchestrateur

3. **Découper `osStore.ts`**
   - Séparer les slices plus finement
   - Isoler les side effects
   - Typer correctement les actions

4. **Sécuriser les permissions**
   - Distinguer appels système internes et appels app
   - Introduire un vrai contexte d'exécution
   - Journaliser les bypass système

### Phase 2 — Qualité (4-6 semaines)
1. **Étendre les tests**
   - Tests du window manager
   - Tests de persistance
   - Tests d'intégration shell
   - Tests de régression sur les apps critiques

2. **Améliorer le typage**
   - Remplacer les résidus de `any`
   - Typer les payloads d'événements
   - Typer `window.__OS_STORE__`

3. **Documenter l'architecture**
   - `ARCHITECTURE.md` détaillé
   - `TESTING.md` avec stratégie de tests
   - `BUILD_AND_RELEASE.md` avec procédure
   - `PERMISSIONS_MODEL.md`
   - `VFS_SPEC.md`

### Phase 3 — Rationalisation (6-8 semaines)
1. **Auditer chaque app**
   - Classifier par niveau de maturité (stable/beta/prototype/demo/dormant)
   - Retirer du README les claims non démontrés
   - Mettre en avant un noyau d'apps stables

2. **Améliorer la sécurité**
   - Sandbox réel pour les apps
   - Validation des inputs
   - CSP (Content Security Policy)

3. **Améliorer la performance**
   - Métriques de performance
   - Monitoring
   - Profiling
   - Optimisation bundle

### Phase 4 — Industrialisation (8-12 semaines)
1. **CI/CD**
   - GitHub Actions pour build, test, lint
   - Automatisation des releases
   - Validation post-build

2. **Documentation développeur**
   - Guide de contribution
   - Guide de debug
   - Conventions de code
   - Architecture decision records

3. **Release readiness**
   - Build Windows reproductible
   - Versioning propre
   - Naming propre
   - Assets builder propres
   - Procédure de release documentée

---

## 15. Recommandations Stratégiques

### 15.1 Arrêter d'Ajouter des Features
Le projet a **déjà trop de surface**. Le vrai chantier est de **solidifier, pas d'élargir**.

### 15.2 Focus sur 10-15 Apps Piliers
Au lieu de promouvoir 50+ apps, se concentrer sur :
1. Welcome
2. Explorer
3. Terminal
4. Dashboard
5. Settings
6. Notepad
7. Global Search
8. Image Viewer
9. System Info
10. HyperIDE

### 15.3 Prioriser les Tests
Sans tests, le projet ne peut pas évoluer sereinement. Prioriser :
1. Tests du kernel (VFS, permissions, process manager)
2. Tests du store (persistance, actions)
3. Tests d'intégration shell
4. Tests de régression sur les apps critiques

### 15.4 Documenter la Vérité
Créer une matrice de fonctionnalités réellement validées :
- Feature
- Statut (prototype/beta/stable/mock/WIP)
- Preuve (fichier, composant, test, capture, flow utilisateur)
- Risque
- Étape suivante

### 15.5 Simplifier avant d'Optimiser
- Supprimer les fichiers vides/stubs
- Fusionner les doublons
- Clarifier les re-exports
- Nettoyer les dossiers de configuration

---

## 16. Conclusion Honnête

### Ce que NexusOS est aujourd'hui
- ✅ Un **prototype spectaculaire** avec une identité forte
- ✅ Un **démonstrateur ambitieux** avec une base technique réelle
- ✅ Un **projet créatif** avec une vision différenciante
- ❌ **Pas encore un produit industrialisé**
- ❌ **Pas encore prêt pour la production**
- ❌ **Pas encore suffisamment testé**

### Ce que NexusOS pourrait devenir
Avec un focus sur la **stabilisation** plutôt que l'**expansion**, NexusOS pourrait devenir :
- Un OS applicatif crédible et démontrable
- Une plateforme stable pour l'IA locale
- Un produit avec une confiance technique

### La Priorité Absolue
> **Transformer NexusOS de "prototype spectaculaire" en "plateforme crédible, stable et démontrable sans fragilité".**

### Le Vrai Problème
Le principal problème n'est pas le manque d'idées.  
Le principal problème est la **stabilisation** :
- Clarifier ce qui est vraiment terminé
- Éliminer les incohérences
- Réduire le couplage
- Renforcer le typage
- Augmenter les tests
- Fiabiliser le packaging

### Le Vrai Risque
Le risque n'est pas que le projet soit vide ou mauvais.  
Le risque est que la **promesse dépasse la preuve**, et que les utilisateurs découvrent des fragilités là où ils s'attendent à de la solidité.

---

## ANNEXES

### A. Fichiers Stratégiques à Connaître
- [`App.tsx`](App.tsx) — Shell principal
- [`appRegistry.ts`](appRegistry.ts) — Registre des apps
- [`types.ts`](types.ts) — Types transverses
- [`store/osStore.ts`](store/osStore.ts) — État global
- [`store/osStoreSlices.ts`](store/osStoreSlices.ts) — Slices du store
- [`kernel/fileSystem.ts`](kernel/fileSystem.ts) — VFS
- [`kernel/permissions.ts`](kernel/permissions.ts) — Permissions
- [`kernel/processManager.ts`](kernel/processManager.ts) — Process manager
- [`kernel/autonomy.ts`](kernel/autonomy.ts) — Autonomie DAEMON
- [`kernel/commander.ts`](kernel/commander.ts) — Commandes système
- [`services/localBrain.ts`](services/localBrain.ts) — Inférence locale
- [`services/puterService.ts`](services/puterService.ts) — IA cloud
- [`vite.config.ts`](vite.config.ts) — Configuration build
- [`electron-builder.yml`](electron-builder.yml) — Configuration Electron
- [`tsconfig.json`](tsconfig.json) — Configuration TypeScript

### B. Commandes de Validation
```bash
npm run typecheck    # Vérifier les types
npm run build        # Vérifier le build
npm test             # Exécuter les tests
npm run lint         # Vérifier le style (à ajouter)
npm run format       # Formater le code (à ajouter)
```

### C. Métriques de Référence
- **Fichiers totaux** : ~150+ fichiers
- **Apps** : 52 apps dans le registre
- **Tests** : ~10 fichiers de tests
- **Couverture estimée** : < 10%
- **Taille bundle** : > 1 Mo (historique)
- **Fichiers vides/stubs** : ~10 fichiers
- **Documentation marketing** : ~15 fichiers
- **Documentation technique** : ~5 fichiers

---

*Audit réalisé le 2026-04-01 par Kilo*  
*Méthode : Analyse automatisée + revue manuelle complète du repo*  
*Objectif : Transparence totale, honnêteté absolue*
