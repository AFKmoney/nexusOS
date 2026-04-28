o# NexusOS VFS and Permissions

## Objectif

Ce document décrit le système de fichiers virtuel de NexusOS et le modèle de permissions applicatives côté noyau.

Il sert de référence technique pour :
- comprendre la structure logique du système
- cadrer les accès applicatifs
- limiter les erreurs d’intégration
- préparer un futur durcissement de sécurité

## Vue d’ensemble

Le VFS NexusOS est implémenté principalement dans `kernel/fileSystem.ts`.

Il fournit un système de fichiers virtuel en mémoire/persisté permettant :
- navigation arborescente
- création de fichiers et dossiers
- lecture/écriture
- suppression
- copie/déplacement
- liens symboliques
- notifications d’événements

Le VFS est utilisé par :
- File Explorer
- Notepad / éditeurs
- terminal
- composants shell
- autonomie
- forge et utilitaires système

## Objectifs du VFS

- fournir une abstraction unique d’accès aux fichiers
- éviter la dépendance directe au vrai système hôte en mode web
- supporter des workflows pseudo-OS cohérents
- permettre la persistance locale
- permettre des contrôles d’accès applicatifs

## Arborescence logique typique

Chemins fréquemment utilisés dans le projet :

- `/home/user/Desktop`
- `/system/docs`
- `/system/.daemon`
- autres répertoires applicatifs et système gérés par le noyau

## Capacités principales

Le VFS supporte conceptuellement :

- `listDir(path)`
- lecture de fichier
- écriture de fichier
- création de dossier
- suppression
- copie
- déplacement
- résolution éventuelle de liens
- surveillance d’événements

## Cas d’usage internes

### Shell
Le shell peut l’utiliser pour :
- explorer l’arborescence
- ouvrir des ressources
- afficher le contenu du bureau

### Apps
Les applications peuvent l’utiliser pour :
- enregistrer des fichiers
- charger des fichiers utilisateur
- écrire des artefacts générés

### DAEMON / autonomie
Le moteur d’autonomie peut :
- inspecter des dossiers
- lire des docs
- générer des fichiers de synthèse
- écrire des réflexions système

## Persistance

Le plan d’audit note que le VFS doit rester clairement documenté sur :
- ce qui est seulement virtuel
- ce qui est persisté
- les garanties exactes de cohérence

### Règle actuelle
Le VFS doit être considéré comme une abstraction applicative locale, pas comme un vrai système POSIX complet.

## Modèle de permissions

Le modèle de permissions est piloté par le noyau et les métadonnées applicatives.

Sources concernées :
- `types.ts`
- `appRegistry.ts`
- `kernel/permissions.ts`
- `kernel/fileSystem.ts`

## But des permissions

- restreindre certaines opérations sensibles
- déclarer les capacités requises par une app
- éviter qu’une app agisse comme si elle disposait d’un accès système total
- préparer une meilleure isolation future

## Types d’opérations à protéger

Les permissions doivent couvrir au minimum :

- lecture de fichiers
- écriture de fichiers
- suppression
- accès système sensible
- opérations de forge ou d’autonomie
- éventuelles capacités réseau ou externes

## Principe de fonctionnement recommandé

1. une app déclare ses capacités dans son manifeste
2. le noyau vérifie l’autorisation demandée
3. le VFS ou la primitive système applique/refuse l’opération
4. un événement ou log peut être émis pour audit

## Durcissement actuellement en place

Le VFS n’autorise plus silencieusement les opérations sans `appId`.

Règle actuelle :
- un appel applicatif doit fournir un `appId`
- les bypass internes système doivent être explicites
- le VFS expose désormais un identifiant système dédié : `__system__`

Conséquence :
- l’absence d’`appId` n’est plus traitée comme un accès automatiquement autorisé
- les opérations système internes doivent utiliser un contexte explicite
- cela réduit le risque de contournement accidentel du modèle de permissions

## Intégration avec `appRegistry.ts`

Le manifeste applicatif est le point d’entrée logique pour exposer :

- identité de l’app
- métadonnées UI
- permissions déclarées
- comportement système attendu

Cela évite de disperser les règles d’accès directement dans les composants React.

## Limites actuelles identifiées par l’audit

- couplage encore fort entre UI, store et noyau
- modèle de permission probablement encore perfectible
- frontières de responsabilité parfois implicites
- documentation historiquement insuffisante

## Recommandations d’évolution

### Court terme
- conserver le VFS comme unique point d’entrée d’accès fichier
- documenter explicitement les permissions par app
- éviter de contourner `kernel/fileSystem.ts`

### Moyen terme
- définir une matrice de permissions normalisée
- journaliser davantage les opérations sensibles
- mieux isoler les appels venant de l’autonomie et de la forge

### Long terme
- sandbox par domaine applicatif
- profils de permissions par famille d’app
- auditabilité complète des actions système

## Bonnes pratiques de développement

- toujours passer par le VFS plutôt que coder un accès fichier ad hoc
- ne pas supposer qu’un chemin existe
- vérifier les permissions avant d’exécuter une opération sensible
- éviter les accès “magiques” hors noyau
- centraliser les comportements système dans `kernel/`

## Fichiers de référence

- `kernel/fileSystem.ts`
- `kernel/permissions.ts`
- `appRegistry.ts`
- `types.ts`
- `kernel/eventBus.ts`

## État actuel

À l’état courant du projet :
- le VFS fait partie du noyau actif
- plusieurs apps en dépendent directement
- l’architecture est fonctionnelle
- un premier durcissement du bypass système a été appliqué
- la documentation est désormais explicitée mais d’autres renforcements restent recommandés
