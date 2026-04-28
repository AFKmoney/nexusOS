# NexusOS App Status Matrix

## Objectif

Cette matrice vise à clarifier le statut réel des applications de NexusOS.

Elle ne prétend pas certifier ici chaque workflow en profondeur, mais fournit un cadre explicite pour :
- distinguer prototype / bêta / stable / démo
- éviter les promesses floues
- faciliter la priorisation de stabilisation
- donner une base de suivi produit/engineering

## Légende des statuts

- **Stable** : comportement principal jugé cohérent, intégré au shell, à conserver comme pilier
- **Beta** : fonctionnel mais nécessitant encore validation, tests ou durcissement
- **Prototype** : concept implémenté partiellement, utile en démo mais pas assez prouvé
- **Demo Only** : surtout vitrine, expérimental ou non suffisamment validé
- **Dormant** : présent au catalogue mais non prioritaire à promouvoir

## Critères d’évaluation

Le statut proposé tient compte de :
- rôle stratégique dans le shell
- intégration visible dans l’architecture
- présence de dépendances noyau critiques
- degré probable de finition observable par structure de code
- absence ou présence de validations/tests connues

## Applications système / piliers

| App | Statut | Justification courte | Priorité | Tests / validation |
|---|---|---|---|---|
| `welcome` | Beta | app d’entrée/première expérience, importante pour le shell | Haute | Validation fonctionnelle à confirmer |
| `explorer` | Beta | dépend fortement du VFS, application pilier | Haute | Fortement lié aux tests VFS existants |
| `terminal` | Beta | stratégique pour la promesse OS-like | Haute | Validation de base à confirmer |
| `hyperide` | Prototype | ambitieuse, probablement plus complexe que validée | Haute |
| `dashboard` | Beta | app centrale de démonstration système | Haute |
| `settings` | Beta | importante pour cohérence produit mais à durcir | Haute |
| `globalSearch` / recherche système | Beta | importante UX shell, transverse | Haute |
| `taskManager` | Prototype | utile mais maturité non encore démontrée | Moyenne |
| `systemInfo` | Beta | surface plus simple, utile au socle | Moyenne |
| `systemMonitor` | Prototype | potentiellement riche mais à prouver | Moyenne |

## Productivité

| App | Statut | Justification courte | Priorité |
|---|---|---|---|
| `notepad` | Beta | cas d’usage clair, lié au VFS | Haute |
| `richEditor` | Prototype | plus complexe, maturité non démontrée | Moyenne |
| `stickyNotes` | Beta | outil simple, probable bonne démo | Moyenne |
| `calendar` | Prototype | mentionnée comme app stratégique mais pas prouvée | Moyenne |
| `kanban` | Prototype | fonctionnalité plausible mais non validée | Moyenne |
| `snippets` | Prototype | bonne idée, maturité inconnue | Basse |
| `clipboard` | Prototype | utile mais dépend d’intégrations globales | Basse |
| `pomodoro` | Beta | surface réduite, plus simple à fiabiliser | Basse |
| `contacts` | Prototype | probable app de catalogue plus que pilier | Basse |
| `habitTracker` | Prototype | valeur produit, validation inconnue | Basse |

## Création / média

| App | Statut | Justification courte | Priorité |
|---|---|---|---|
| `paint` | Prototype | app riche visuellement, stabilité inconnue | Moyenne |
| `imageViewer` | Beta | usage simple, bon candidat à stabilisation | Moyenne |
| `videoPlayer` | Prototype | dépend des flux média et des cas limites | Basse |
| `musicPlayer` | Prototype | idem, surface plus fragile | Basse |
| `voiceRecorder` | Prototype | dépend API navigateur/permissions | Basse |
| `wallpaperGen` | Demo Only | liée à l’univers produit, plus démonstrative | Basse |
| `fractalVisualizer` | Demo Only | forte valeur visuelle, moins critique métier | Basse |
| `screenshotTool` | Prototype | utile mais dépend des capacités runtime | Basse |

## IA / avancé / expérimental

| App | Statut | Justification courte | Priorité |
|---|---|---|---|
| `daemonChat` | Prototype | au cœur du storytelling IA, mais risque de promesse > preuve | Haute |
| `aionAgent` | Demo Only | probablement expérimental | Basse |
| `neuralForge` / `forgeSystem` | Prototype | stratégique mais fortement couplé au noyau | Haute |
| `modelManager` | Prototype | utile à la promesse IA locale, validation inconnue | Moyenne |
| `modelManagerApp` | Prototype | doublon/variante à clarifier | Basse |
| `agentUI` | Demo Only | semble exploratoire | Basse |
| `daemonJournal` | Prototype | intéressant mais non prouvé comme pilier | Basse |
| `viralApp` | Demo Only | semble plus expérimental / vitrine | Basse |

## Réseau / web / utilitaires

| App | Statut | Justification courte | Priorité |
|---|---|---|---|
| `netrunner` | Prototype | app importante pour la promesse augmentée | Moyenne |
| `webRunner` | Prototype | dépend du runtime et de la sécurité | Moyenne |
| `rssReader` | Prototype | utile mais non stratégique | Basse |
| `weatherApp` | Prototype | dépend intégrations externes | Basse |
| `passwordManager` | Prototype | sensible, ne pas promouvoir sans audit | Haute |
| `nativeZipApp` | Demo Only | intéressant, mais validation inconnue | Basse |
| `deviceManagerApp` | Demo Only | potentiellement ambitieux mais pas prouvé | Basse |
| `accessibilityPanel` | Prototype | important UX mais maturité non documentée | Moyenne |

## Apps à clarification supplémentaire

Certaines entrées semblent demander une revue de consolidation produit :

- `ModelManager.tsx` vs `ModelManagerApp.tsx`
- `Settings.tsx` vs `apps/settings/SettingsApp.tsx`
- `Terminal.tsx` vs `apps/terminal/TerminalCore.tsx`
- composants de recherche shell vs app `GlobalSearch`

Ces doublons ou variantes ne sont pas nécessairement incorrects, mais doivent être explicités pour éviter la confusion.

## Noyau minimal à promouvoir publiquement

Si NexusOS doit mettre en avant un sous-ensemble plus crédible à court terme, le noyau recommandé est :

- Welcome
- Explorer
- Terminal
- Dashboard
- Settings
- Notepad
- Global Search
- Image Viewer
- System Info

## Noyau à stabiliser en priorité

1. Explorer
2. Terminal
3. Dashboard
4. Settings
5. Notepad
6. Welcome
7. Search shell
8. Taskbar / window system

## Recommandations suivantes

### Court terme
- confirmer le statut réel app par app
- réduire les claims publics aux apps les mieux tenues
- définir des critères de passage Prototype → Beta → Stable

### Moyen terme
- ajouter colonnes :
  - persistance
  - erreurs connues
  - tests existants
  - owner / responsable
  - dernière validation

### Long terme
- automatiser une matrice de santé
- relier chaque app à ses tests et à son manifeste
- produire un “golden path demo set” maintenu en continu

## Remarque importante

Cette matrice est une base de rationalisation issue de l’audit architectural et structurel du repo.  
Elle doit être consolidée ensuite par validation fonctionnelle réelle, app par app.