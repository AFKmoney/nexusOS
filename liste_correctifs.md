# Liste des correctifs à apporter — NexusOS

## Comment lire ce document
Ce fichier sert d’audit opérationnel.  
Chaque entrée indique :
- le fichier ou la zone concernée
- le problème probable
- le correctif à apporter
- le guide du prochain run

## 1) `App.tsx`
### Constats
- Le fichier est très dense et mélange boot, login, desktop, raccourcis clavier, drop files, overlays, permissions et intégration DAEMON.
- `LockScreen` local est redéfini dans `App.tsx` alors qu’un composant `components/LockScreen.tsx` existe déjà.
- `GlobalSearchOverlay` est chargé en lazy depuis `components/GlobalSearch`, mais il faut vérifier le contrat exact d’export.
- Les appels `openWindow('pdf_viewer')`, `openWindow('markdown_preview')`, `openWindow('web_runner')` doivent être vérifiés par rapport au registre réel des apps.
- Certains handlers manipulent le VFS directement depuis l’UI, ce qui peut être trop couplé.

### Correctifs à apporter
- [ ] Extraire le `LockScreen` local et réutiliser `components/LockScreen.tsx` si le contrat correspond
- [ ] Vérifier les IDs d’apps utilisés dans `openWindow(...)` et les aligner avec `appRegistry.ts`
- [ ] Réduire la taille de `App.tsx` en isolant les responsabilités :
  - boot/login
  - desktop grid
  - widgets
  - raccourcis clavier
  - overlays
- [ ] Vérifier que `bindOsStore(...)` n’introduit pas d’état dérivé inutile
- [ ] Vérifier le comportement du drag/drop desktop sur fichiers locaux et chemins VFS
- [ ] Auditer les effets `useEffect` pour éviter les rebinds ou re-renders parasites

### Guide pour le prochain run
1. Ouvrir `appRegistry.ts`
2. Ouvrir `components/LockScreen.tsx`
3. Ouvrir `components/GlobalSearch.tsx`
4. Vérifier la liste exacte des IDs d’apps
5. Découper `App.tsx` en modules plus petits

---

## 2) `appRegistry.ts`
### Constats
- C’est probablement la source de vérité des apps, mais il faut vérifier qu’il correspond aux IDs utilisés partout dans l’UI.
- Risque de divergence entre noms d’apps, titres affichés et composants réellement montés.

### Correctifs à apporter
- [ ] Vérifier l’inventaire complet des apps déclarées
- [ ] Comparer chaque `appId` utilisé dans `App.tsx`, `Taskbar`, `StartMenu`, `WindowFrame` et les apps
- [ ] Supprimer ou corriger les IDs orphelins
- [ ] Aligner les noms d’affichage avec les clés techniques

### Guide pour le prochain run
1. Lire `appRegistry.ts`
2. Comparer avec les `openWindow(...)` de `App.tsx`
3. Comparer avec les boutons du `StartMenu` et `Taskbar`
4. Produire une table de correspondance `appId -> composant -> statut`

---

## 3) `components/LockScreen.tsx` et `components/DaemonLockScreen.tsx`
### Constats
- Il existe probablement plusieurs couches de verrouillage.
- Il faut vérifier la redondance entre le lockscreen local et le lockscreen DAEMON.

### Correctifs à apporter
- [ ] Vérifier s’il existe deux implémentations concurrentes du lock screen
- [ ] Définir un seul flux de verrouillage principal
- [ ] Supprimer les redondances UI si elles ne sont pas justifiées
- [ ] Valider le comportement de déverrouillage

### Guide pour le prochain run
1. Lire `components/LockScreen.tsx`
2. Lire `components/DaemonLockScreen.tsx`
3. Vérifier les états `locked` dans `App.tsx`
4. Documenter le flux unique à conserver

---

## 4) `components/GlobalSearch.tsx`
### Constats
- L’overlay est chargé en lazy mais son contrat d’export doit être confirmé.
- Il faut vérifier s’il s’agit d’un composant page, d’un modal ou d’un shell overlay.

### Correctifs à apporter
- [ ] Vérifier l’export par défaut et les props attendues
- [ ] Vérifier l’accessibilité et la fermeture clavier
- [ ] Vérifier le lien avec le state `isSearchOpen`
- [ ] Vérifier qu’il ne duplique pas la fonctionnalité d’une autre recherche système

### Guide pour le prochain run
1. Lire `components/GlobalSearch.tsx`
2. Vérifier le montage depuis `App.tsx`
3. Vérifier les raccourcis clavier liés à la recherche
4. Documenter le comportement attendu

---

## 5) `components/Taskbar.tsx`
### Constats
- C’est un composant central du shell.
- Il faut vérifier qu’il reflète correctement les fenêtres, le menu principal, les notifications et les états de workspace.

### Correctifs à apporter
- [ ] Vérifier le modèle des fenêtres affichées
- [ ] Vérifier les actions sur les icônes d’apps et la zone système
- [ ] Vérifier les états actifs/inactifs
- [ ] Vérifier les interactions avec `StartMenu` et `TaskSwitcher`

### Guide pour le prochain run
1. Lire `components/Taskbar.tsx`
2. Suivre les appels vers le store OS
3. Vérifier la cohérence avec `App.tsx`
4. Identifier les doublons de logique UI

---

## 6) `components/StartMenu.tsx` et `components/TaskSwitcher.tsx`
### Constats
- Ces composants structurent l’accès aux apps et aux fenêtres.
- Risque de divergence entre catalogue, favoris et apps réelles.

### Correctifs à apporter
- [ ] Vérifier que les listes d’apps utilisent les mêmes IDs que `appRegistry.ts`
- [ ] Vérifier la logique d’ouverture des fenêtres
- [ ] Vérifier les raccourcis clavier et les états ouverts/fermés
- [ ] Vérifier les zones de clic global dans `App.tsx`

### Guide pour le prochain run
1. Lire `components/StartMenu.tsx`
2. Lire `components/TaskSwitcher.tsx`
3. Comparer avec `appRegistry.ts`
4. Lister les divergences

---

## 7) `kernel/fileSystem.ts`
### Constats
- Le VFS est critique pour Explorer, Notepad et le drag/drop desktop.
- Toute erreur ici peut casser plusieurs apps.

### Correctifs à apporter
- [ ] Vérifier la robustesse de `stat`, `writeFile`, `move`, `resolveNode`
- [ ] Vérifier les cas limites sur chemins, permissions et chemins relatifs
- [ ] Vérifier la cohérence des opérations de suppression / déplacement
- [ ] Vérifier la compatibilité avec les fichiers importés depuis le desktop

### Guide pour le prochain run
1. Lire `kernel/fileSystem.ts`
2. Lire les tests VFS dans `kernel/tests/`
3. Repérer les opérations critiques utilisées par `App.tsx`
4. Ajouter un audit ciblé des cas limites

---

## 8) `kernel/toolForge.ts`, `kernel/processManager.ts`, `kernel/eventBus.ts`, `kernel/themeEngine.ts`
### Constats
- Ce sont des composants noyau potentiellement sensibles aux effets de bord.
- Ils peuvent provoquer des comportements difficiles à diagnostiquer si les contrats sont flous.

### Correctifs à apporter
- [ ] Vérifier la clarté des APIs publiques
- [ ] Vérifier les dépendances circulaires éventuelles
- [ ] Vérifier que les appels depuis `App.tsx` sont idempotents
- [ ] Vérifier les abonnements et désabonnements aux événements

### Guide pour le prochain run
1. Lire chaque fichier noyau un par un
2. Relever les APIs exposées
3. Vérifier leur usage dans l’UI
4. Identifier les risques de rebind ou fuite mémoire

---

## 9) `services/puterService.ts` et `services/localBrain.ts`
### Constats
- Les services IA / intégration OS peuvent être sources de régression.
- Il faut vérifier la cohérence avec les nouveaux états UI et le binding du store.

### Correctifs à apporter
- [ ] Vérifier le contrat de `bindOsStore`
- [ ] Vérifier les effets secondaires à l’initialisation
- [ ] Vérifier la séparation entre logique réseau, logique locale et logique UI
- [ ] Vérifier les dépendances avec l’autonomie / DAEMON

### Guide pour le prochain run
1. Lire `services/puterService.ts`
2. Lire `services/localBrain.ts`
3. Comparer avec `App.tsx`
4. Documenter les effets attendus au démarrage

---

## 10) `components/WindowFrame.tsx`
### Constats
- Le shell repose fortement sur ce composant.
- Il faut vérifier les comportements de focus, drag, resize, close et workspace.

### Correctifs à apporter
- [ ] Vérifier la gestion du focus actif
- [ ] Vérifier les bordures, tailles et contraintes de fenêtre
- [ ] Vérifier les interactions avec le task switcher
- [ ] Vérifier les cas où une fenêtre n’a pas de workspace

### Guide pour le prochain run
1. Lire `components/WindowFrame.tsx`
2. Lire `App.tsx`
3. Comparer les props attendues avec les données du store
4. Relever les comportements visuellement critiques

---

## 11) `docs/APP_STATUS_MATRIX.md`
### Constats
- La matrice est utile mais reste une estimation.
- Elle doit être reliée à des vérifications réelles fichier par fichier.

### Correctifs à apporter
- [ ] Transformer les statuts estimés en statuts vérifiés
- [ ] Ajouter la colonne `fichier principal`
- [ ] Ajouter la colonne `tests existants`
- [ ] Ajouter la colonne `dernier audit`
- [ ] Harmoniser le vocabulaire avec les docs produit

### Guide pour le prochain run
1. Compléter l’audit des fichiers clés
2. Relier chaque app à son composant principal
3. Écrire les statuts vérifiés
4. Synchroniser cette matrice avec le reste de la doc

---

## 12) `docs/BUILD_AND_RELEASE.md`, `docs/TESTING.md`, `BUILD_AND_RELEASE.md`, `TESTING.md`
### Constats
- Il existe probablement des redondances entre docs racine et `docs/`.
- Les consignes build/test doivent refléter l’état réel du projet.

### Correctifs à apporter
- [ ] Vérifier les différences entre la version racine et la version `docs/`
- [ ] Supprimer les doublons obsolètes ou les fusionner
- [ ] Mettre à jour les commandes réelles de build et test
- [ ] Vérifier que les instructions correspondent au `package.json`

### Guide pour le prochain run
1. Lire les 4 fichiers
2. Comparer les écarts
3. Choisir une source de vérité
4. Réconcilier les divergences

---

## 13) `package.json`
### Constats
- Les scripts existants semblent cohérents, mais il faut valider la couverture réelle.
- Les dépendances doivent être revues au regard du runtime Electron + Vite + React 19.

### Correctifs à apporter
- [ ] Vérifier la nécessité de chaque dépendance
- [ ] Vérifier que les scripts `dev`, `build`, `typecheck`, `electron:dev`, `electron:build`, `test` sont suffisants
- [ ] Vérifier l’absence de scripts manquants pour le diagnostic ou l’audit
- [ ] Vérifier les versions incompatibles potentielles

### Guide pour le prochain run
1. Lire `package.json`
2. Comparer avec l’usage réel dans le codebase
3. Identifier les dépendances orphelines
4. Produire une liste de nettoyage npm

---

## 14) Priorités d’exécution recommandées
### Run suivant
1. `App.tsx`
2. `appRegistry.ts`
3. `components/WindowFrame.tsx`
4. `components/Taskbar.tsx`
5. `components/StartMenu.tsx`
6. `components/TaskSwitcher.tsx`
7. `components/LockScreen.tsx`
8. `components/DaemonLockScreen.tsx`
9. `components/GlobalSearch.tsx`
10. `kernel/fileSystem.ts`

### Objectif du prochain audit
Produire un inventaire vérifié :
- fichier
- rôle
- correctif
- priorité
- impact
- dépendances
- guide du prochain run

---

## 15) Format cible pour le prochain run
Pour chaque fichier audité :
- **Fichier**
- **Rôle**
- **Constat**
- **Correctif**
- **Priorité**
- **Dépendances**
- **Tests à prévoir**
- **Prochain fichier à lire**
