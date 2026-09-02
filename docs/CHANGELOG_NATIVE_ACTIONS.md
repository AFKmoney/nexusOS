# Native Action Surface Expansion + Skill Pack + MCP

---

## Levier 1c — Skills pro v3 (8 nouveaux) + chaînage

Bump `SKILL_PACK_VERSION` → 3 (29 skills). Nouveauté structurante : **un skill
peut en appeler un autre** via `ctx.runSkill()`.

### Chaining primitif (`ctx.runSkill`)
- Ajout de `runSkill(name, argsRaw)` au contexte sandbox (in-process **et** worker
  via `skill.execute` RPC, whitelistée).
- Garde-fou de profondeur (`MAX_CHAIN_DEPTH = 5`) contre la récursion infinie
  (un skill qui s'appelle lui-même). Testé par `chaining depth is bounded`.

### Nouveaux skills
| Skill | Catégorie | Rôle |
|---|---|---|
| `db_create` | Base de données | Collection JSON persistante dans `/system/db/` |
| `db_insert` | Base de données | Insère un/plusieurs enregistrements |
| `db_query` | Base de données | Filtre + tri + limite |
| `db_stats` | Base de données | Agréation numérique (count/sum/avg/min/max) |
| `extract_image_info` | Data-URI / image | Détecte format, taille, dimensions (PNG/GIF/BMP/SVG/JPEG) |
| `scrape_links` | Scraping | Extrait liens + textes + titres/headings d'un HTML |
| `scrape_table` | Scraping | Extrait la 1re `<table>` en lignes pipe-delimited |
| `chain_tasks` | Chaînage | Exécute une séquence de `{skill, args}` via `ctx.runSkill` |

### Validation
- `npm run typecheck` → **0 erreur** dans les fichiers touchés.
- `npm run build` → OK.
- `npm test` → **175 assertions pass / 0 fail**, dont les tests de
  `kernel/tests/skillPackV3.test.ts` (DB round-trip, image-info, scraping, chaînage,
  garde de profondeur).

Voir aussi : `../kernel/aiTools.ts`, `../kernel/toolForge.ts`, `../kernel/osManifest.ts`,
`../kernel/skillPack.ts`, `../kernel/skillForge.ts`, `../kernel/mcpBridge.ts`.

---

## Levier 3 — Client MCP natif (Model Context Protocol)

### Nouveau module `kernel/mcpBridge.ts`
Le DAEMON AI peut désormais piloter **n'importe quel serveur MCP** comme des
tools natifs du function-calling. C'est ce qui pousse NexusOS au-delà des
wrappers : la puissance ne se limite plus au noyau.

- **Transport** : Streamable HTTP (JSON-RPC 2.0), gère les réponses
  `application/json` ET `text/event-stream` (SSE).
- **Cycle de vie MCP** : `initialize` (négociation de version + capabilities) →
  `notifications/initialized` → `tools/list` → `tools/call`.
- **Namespacing** : chaque tool est exposé sous `mcp_<serverId>__<toolName>`
  (délimiteur `__` pour que les UUID de serveurs avec tirets round-trippent).
- **Persistance** : configs des serveurs stockées en localStorage.

### Intégration au pipeline IA
- `services/puterService.ts` : fusionne les tools MCP dans le tableau envoyé à
  `generateWithTools` (en plus des `OS::` actions).
- `kernel/toolForge.ts` : route tout appel `mcp_*` vers `mcpBridge.callTool`,
  avec message clair si le serveur n'est pas connecté.
- `kernel/toolForge.ts::getSystemToolContext` : expose les serveurs/tools MCP
  au prompt système.
- `apps/settings/SettingsApp.tsx` : nouvel onglet **MCP Servers** (ajouter,
  connecter, supprimer, voir l'état + compte de tools).

### Validation
- `npm run typecheck` → **0 erreur** sur les fichiers touchés.
- `npm run build` → OK.
- `npm test` → **168 assertions pass / 0 fail**, dont les tests de
  `kernel/tests/mcpBridge.test.ts` (namespacing round-trip, connexion +
  discovery, `tools/call`, parsing SSE, lifecycle, routing `mcp_*`).

---

## Levier 4 — Typecheck propre (0 erreur) + batterie DevOps CI

**Nettoyage des erreurs de type (28 → 0)**

| Fichier | Correctif |
|---|---|
| `kernel/commander.ts`, `kernel/git.ts`, `apps/UbuntuTerminal.tsx` | retiré le **2e argument superflu** `SYSTEM_VFS_APP_ID` passé à `safeResolvePath()`/`toVfsPath()`/`resolvePath()` (ces fonctions ne prennent qu'**un** argument — un édit en masse l'avait ajouté par erreur ; ignoré au runtime mais invalide pour le typecheck) |
| `apps/PaintApp.tsx` | `const ctx` remontée **avant** son premier usage (`ctx?.scale`) |
| `apps/forge/ForgeSystem.tsx` | accès `cssMatch[1]`/`jsMatch[1]` défensifs (`|| ''`) |
| `components/StartMenu.tsx` | index d'array possiblement indéfini → fallback `(ACCENTS[next] ?? ACCENTS[0])!` |
| `apps/hyperide/SidePanel.tsx` | destructuring du prop `isNewFolder` manquant (déclaré dans l'interface, jamais extrait) — vrai bug |
| `ide/Core.tsx` | `JSON.stringify(state, SYSTEM_VFS_APP_ID)` → `JSON.stringify(state)` (chaine invalide comme `replacer`) |
| `server.ts` | `req.params[0]` typé → cast `as unknown as Record<string,string>` |
| `vite-ai-proxy.ts` | `body: parsed.body || undefined` → spread conditionnel (`exactOptionalPropertyTypes`) |
| `kernel/tests/fileSystem.test.ts` | import dupliqué de `SYSTEM_VFS_APP_ID` → dédoublonné |
| `kernel/tests/appGenerator.test.ts` | chemin d'import `../store/osStore` → `../../store/osStore` (correct) |
| `kernel/tests/streamChatCloudContinuation.test.ts` | `beforeAll`/`afterAll` (n'existent pas dans `node:test`) → `before`/`after`, **scopés dans un `describe()`** |

**Correctif clé (fiabilité des tests) :** le fichier
`streamChatCloudContinuation.test.ts` était **silencieusement sauté** car son import
`{ beforeAll, afterAll }` venait de `node:test`, qui ne les exporte pas — l'import
levait une erreur, `runTests` skip le fichier, et ses tests ne s'exécutaient jamais.
Remplacés par `before`/`after` **dans un `describe()`** : les hooks mocks sont
maintenant **scopés** à ce fichier au lieu de fuir globalement (ils réécrivaient
notamment `memory.recall = () => []` pendant les tests d'AutoPilot v3). Résultat :
le test streamChat s'exécute **réellement** et **tout est vert**.

**Batterie DevOps (`.github/workflows/ci.yml` + `scripts/devops-battery.mjs`)**

- `npm run ci` → un seul point d'entrée qui enchaîne les portes de qualité :
  **typecheck**, **tests unitaires**, **build**, avec compte-rendu PASS/FAIL/SKIP
  et code de sortie non-zéro si une porte fatale échoue.
- Portes supplémentaires : `lint` (auto-détecté, report-only par défaut,
  strict via `DEVOP_BATTERY_STRICT_LINT=1`) et `e2e` (smoke de la build de prod
  sous Chrome headless, activé via `RUN_E2E=1`).
- Sélection de portes via `DEVOP_BATTERY="typecheck,unit,build"` (défaut) ou `all`.
- Branché en CI GitHub Actions (**push main + PR**), avec un job dédié
  `battery-e2e` qui installe Chrome headless sur `main`.

**Validation**

- `npx tsc --noEmit` → **0 erreur** (projet entier, plus seulement les fichiers touchés).
- `npm run ci` → **3/3 portes** (typecheck 0 erreur, **346 tests**, build OK).
- `npm run build` → `✓ built in ~2.9s`.

## Levier 3b — Autonomie v3 : plan, exécution d'actions, mémoire de mission

AutoPilot passe d'un « générateur de texte » à un véritable **exécuteur**.
C'est le cœur du levier autonomie : l'IA agit sur l'OS au lieu de le décrire.

**Planification & sous-tâches (`kernel/autoPilot.ts`)**
- Nouveau modèle `Goal.plan[]` + `currentStepIndex` : une goal est décomposée en
  étapes ordonnées par un agent *planner* (`generatePlan` → JSON `{"steps":[]}`,
  parsé par le pur `AutoPilotEngine.parsePlan`).
- `planGoal()` persiste le plan ; les étapes sont **checkpointées** (une étape
  `done` avance `currentStepIndex`) et survivent au reload de la file
  (`autopilot_goals.json`), donc une goal interrompue **reprend** au lieu de
  recommencer.
- `tick()` génère un plan si absent, puis pilote l'étape courante.

**Exécution réelle d'outils (le changement à plus fort impact)**
- `executeGoal()` remplace le `generateOnce` (texte seul) par une **boucle
  multi-tours bornée** (`maxTurns`, défaut 10) qui appelle
  `aiGateway.generateWithTools` avec `getOsActionTools()` + les définitions MCP.
- Les `toolCalls` retournés sont **réellement exécutés** via
  `toolForge.executeToolCalls()`, puis leurs résultats sont réinjectés dans le
  prompt (`transcript`) — l'IA voit ce que ses actions ont produit et enchaîne.
- Le contrat de fin reste les marqueurs texte `GOAL_COMPLETE` /
  `GOAL_FAILED` (détectés par le pur `detectGoalOutcome`), avec un repli sur le
  chemin `OS::` texte via `executeOsActions` quand aucun toolCall n'est émis.
- Les étapes marquent la fin par `STEP COMPLETE`/`STEP DONE`.

**Mémoire de mission (`kernel/memory.ts` couplé)**
- À chaque `completeGoal`/`failGoal`, un résumé compact est écrit dans la
  mémoire **sémantique** longue durée, tagué `['mission','autopilot','goal-<id>']`,
  RAG-recherchable via `memory.recall`.
- `buildGoalPrompt` ne se contente plus de `getRecent(5)` : il rappelle
  les souvenirs **pertinents** à la goal via `recall(goal.description)`.

**Orchestrateur (`kernel/agentOrchestrator.ts`)**
- `AgentOrchestrator.parsePlan()` extrait et valide le plan (rôles, `dependsOn`
  par index) et renvoie `[]` sur JSON malformé ;
- `run()` **réessaie** le plan jusqu'à 3 fois avec une consigne corrective avant
  de retomber sur un sous-agent coder unique.

**Validation**
- `npm run typecheck` → 0 erreur dans les fichiers touchés
  (`autoPilot.ts`, `agentOrchestrator.ts`, `autopilotV3.test.ts`).
- `npm run build` → OK (`✓ built in 2.75s`).
- `npm test` → **0 fail**, dont les 13 nouveaux tests de
  `kernel/tests/autopilotV3.test.ts` (boucle d'outils, parse de plan,
  checkpoint, mémoire de mission, parse d'orchestrateur).

## Levier 2 — Skill Pack pré-forgé (22 skills)

### Nouveau module `kernel/skillPack.ts`
Une bibliothèque **versionnée** (`SKILL_PACK_VERSION`) de 22 skills prêts à
l'emploi, répartis en catégories :

| Catégorie | Skills |
|---|---|
| **Data analysis** | `csv_inspect`, `json_path`, `text_stats` |
| **Filesystem / office** | `format_json_file`, `find_duplicates`, `batch_rename` |
| **Development** | `scaffold_component`, `make_api_client` |
| **Web** | `fetch_json`, `fetch_text` |
| **Productivity** | `append_journal`, `daily_brief` |
| **AI-assisted** | `summarize_text` (dégrade proprement si pas de provider) |

Chaque skill est confiné à l'API `ctx` sandboxée (aucun accès à `useOS`,
`window`, `localStorage`, `document`).

### Seeding idempotent + upgrade-safe (`skillForge.seedFromPack`)
- Au boot, `_doLoad()` appelle `seedFromPack()` à la place de l'ancien
  `seedExampleSkills()` (dont 2 des 3 examples référençaient `useOS`, un bug
  latent non détecté car ils n'avaient jamais été appelés).
- `seedFromPack()` n'écrit **que les skills pack manquants** (clé = nom) → il ne
  **clobber jamais** une customisation du user/AI du même nom (testé).
- Un marqueur de version (`/system/.skill_pack_version`) évite de re-vérifier à
  chaque boot, et **bumper `SKILL_PACK_VERSION`** re-sweep pour ajouter de
  nouveaux skills sans casser les existants.

### Sandbox étendue (`skillSandboxWorker.ts` + `handleSandboxRpc` + `buildContext`)
Ajout de `ctx.vfs.createDir(path)` (recursif) et `ctx.vfs.stat(path)` à la
whitelist du worker et à l'implémentation — nécessaire pour `scaffold_component`
et `make_api_client` (création du dossier parent).

### Validation
- `npm run typecheck` → **0 erreur** dans les fichiers touchés.
- `npm run build` → OK.
- `npm test` → **162 assertions pass / 0 fail**, dont les tests de
  `kernel/tests/skillPack.test.ts` (seeding, idempotence, non-clobber, exécution
  data/dev/web + les 8 nouveaux).

---

## Levier 2b — +8 skills pro (v2 du pack)

Ajout de 8 skills avancés (bump `SKILL_PACK_VERSION` → 2) :

| Skill | Catégorie | Rôle |
|---|---|---|
| `csv_aggregate` | CSV avancé | Group-by + somme/moyenne/min/max/compte sur une colonne numérique |
| `csv_to_json` | CSV avancé | Convertit CSV/TSV en tableau d'objets (coercition numérique) |
| `json_to_csv` | CSV avancé | Convertit un tableau JSON en CSV (échappement des virgules) |
| `extract_entities` | Internet/texte | Emails, URLs, hashtags, @mentions, nombres |
| `html_to_text` | Internet/texte | Strip tags/scripts/styles + décodage entités |
| `http_probe` | Internet | Statut/erreur d'une liste d'URLs |
| `base64_tool` | Utilitaires | Encodage/décodage base64 sûr en utf-8 |
| `extract_pdf_text` | Docs | Extraction best-effort de texte d'un PDF simple |

### Piège de compilation corrigé
Le code des skills est **compilé comme source** (`new Function`), donc un `/`
dans une **regex literal** (ex. `</script>`, `https://`) ou une `\b` non échappée
peut faire échouer la compilation (« Invalid regular expression flags »).
Résolution : utiliser `new RegExp()` pour tout motif contenant un `/`, et un
**scanner manuel** (indexOf/split) plutôt que des regex chargées en `\`.
- `extract_entities` → `new RegExp()` pour emails/URLs + tokenisation manuelle.
- `html_to_text` → indexOf pour les blocs script/style + stripper de tags manuel.

Ces réécritures ont permis au pack v2 de **compiler et de passer** les tests.


## Contexte / le gap

Avant ce passage, seule une petite partie des actions `OS::` (25) était exposée
en **native function-calling**. Le reste ne fonctionnait que par la syntaxe texte
`OS::XXX:...` qui est fragile (espaces, deux-points, nouvelles lignes = échecs
silencieux).

Ce changement ajoute **12 nouvelles actions natives** (portées à **35 tools**
exposés au function-calling des providers), câblées aux **4 points** du pipeline
pour rester cohérent :

1. **`kernel/aiTools.ts`** → schéma `AITool` (le provider voit l'outil).
2. **`kernel/toolForge.ts` (executeToolCalls)** → mappage `tool → OS:: action`.
3. **`kernel/toolForge.ts` (executeOsActions)** → implémentation réelle du `case`.
4. **`kernel/osManifest.ts`** → syntaxe texte compacte `TOOLS_COMPACT`.
5. **`kernel/tests/extendedActions.test.ts`** → tests unitaires du chemin réel.

## Nouvelles actions

| Tool (function-calling) | OS:: action | Ce qu'il fait |
|---|---|---|
| `append_file` | `OS::APPEND_FILE:<path>|<content>` | Ajoute du contenu à un fichier existant (non destructif) |
| `path_info` | `OS::PATH_INFO:<path>` | Type, nombre de fichiers/dossiers, taille |
| `count_files` | `OS::COUNT_FILES[:<dir>]` | Compte récursivement fichiers/dossiers/octets |
| `analyze_data` | `OS::ANALYZE_DATA:<data>` | Infère le schéma JSON / CSV / TSV / texte |
| `schedule_cron` | `OS::SCHEDULE_CRON:<cron>|<cmd>` | Tâche récurrente par expression cron |
| `list_jobs` | `OS::LIST_JOBS` | Liste les jobs planifiés |
| `cancel_job` | `OS::CANCEL_JOB:<jobId>` | Annule un job planifié |
| `session_save` | `OS::SESSION_SAVE:<name>` | Sauvegarde la disposition des fenêtres |
| `session_list` | `OS::SESSION_LIST` | Liste les sessions de fenêtres |
| `session_restore` | `OS::SESSION_RESTORE:<id\|name>` | Restaure une session |
| `arrange_windows` | `OS::ARRANGE_WINDOWS:<grid\|tile\|cascade>` | Range les fenêtres ouvertes |
| `clipboard_read` | `OS::CLIPBOARD_READ` | Lit le presse-papiers |

## Détail d'implémentation important

Le medium `OS::` **ne peut pas transporter de nouvelles lignes** dans un seul
argument (le parseur coupe à chaque `\n`). Les arguments pouvant contenir du
texte multi-ligne (contenu de `append_file`, données de `analyze_data`) sont
donc **encodés en JSON** par le chemin de function-calling
(`JSON.stringify`, puis décodés par `decodeArg()` dans le `case`). Cela rend le
chemin natif robuste au contenu réel (nouvelles lignes, guillemets, deux-points).

La syntaxe texte reste fonctionnelle pour les entrées simples à un seul champ.

## Validation

- `npm run typecheck` → **0 erreur** dans les fichiers touchés
  (`toolForge.ts`, `aiTools.ts`, `osManifest.ts`).
- `npm run build` → OK (`✓ built in ~2.3s`).
- `npm test` → **147 assertions pass / 0 fail**, dont les 11 nouveaux tests du
  fichier `kernel/tests/extendedActions.test.ts`.
