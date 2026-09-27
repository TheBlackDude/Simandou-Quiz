# Mise en ligne sur quiz.guineen68.com (Firebase)

Projet Firebase : **gouvernement-qcm** (propriétaire ousmane@mudupay.com, facturation activée, plan Blaze).
Architecture : Firebase Hosting (site statique `docs/`) + Cloud Functions 2e génération en `europe-west1`
(correction côté serveur, limite de tentatives, classement agrégé) + Firestore + Authentication (anonyme pour
les participants, Google pour les administrateurs). Le dépôt GitHub reste la source de vérité.

## 1. Ce que vous faites vous-même

### 1.1 Connexion sur ce Mac (une seule fois)

Dans la session Claude Code, tapez les deux commandes suivantes (le préfixe `!` les exécute dans votre terminal
et ouvre le navigateur pour la connexion Google) :

```
! gcloud auth login --update-adc
! npx firebase login
```

Connectez-vous avec **ousmane@mudupay.com**. La première commande sert aux outils d'import (`tools/`),
la seconde au déploiement (`firebase deploy`).

### 1.2 Enregistrements DNS chez Squarespace (domaine guineen68.com)

Squarespace → **Paramètres** → **Domaines** → `guineen68.com` → **Paramètres DNS** → **Enregistrements personnalisés**
→ **Ajouter un enregistrement**. Créez ces deux enregistrements (rien d'autre ne change : le site principal de
guineen68.com n'est pas touché, le sous-domaine `quiz` est indépendant) :

| Hôte | Type | Données | TTL |
|---|---|---|---|
| `quiz` | `CNAME` | `gouvernement-qcm.web.app` | par défaut |

C'est la valeur exacte demandée par Firebase Hosting pour `quiz.guineen68.com` (domaine ajouté au site le 14 septembre 2026).
Un seul enregistrement suffit : Firebase vérifie la propriété du sous-domaine grâce à ce CNAME.

Remarques :
- S'il existe déjà un enregistrement pour l'hôte `quiz`, supprimez-le d'abord (un CNAME doit être seul sur son hôte).
- Propagation : de quelques minutes à 24 h. Le certificat HTTPS est délivré automatiquement après vérification
  (jusqu'à 24 h). Pendant ce temps, le site reste joignable sur `https://gouvernement-qcm.web.app`.

### 1.3 Console Firebase (https://console.firebase.google.com/project/gouvernement-qcm)

Ces réglages ne sont pas accessibles en ligne de commande, il faut les cliquer une fois :

1. **Authentication** → *Commencer* → onglet **Sign-in method** :
   - **Anonyme** : activer.
   - **Google** : activer, e-mail d'assistance `ousmane@mudupay.com`, enregistrer.
2. **Authentication** → **Settings** → **Authorized domains** → ajouter `quiz.guineen68.com`
   (et `theblackdude.github.io` si vous voulez tester la version Firebase depuis GitHub Pages avant la bascule).
3. *(Recommandé avant le 25 septembre)* **App Check** → application web → fournisseur **reCAPTCHA v3** →
   enregistrer, puis me transmettre la **clé de site** : je la mets dans `docs/js/config.js` et je passe
   `ENFORCE_APPCHECK=true` dans `functions/.env`. Tant que ce n'est pas fait, les fonctions acceptent les appels
   sans App Check (le reste des protections s'applique déjà).

## 2. Ce que je fais ensuite, en ligne de commande

1. API activées et base Firestore créée en `europe-west1` le 14 septembre 2026 :
   `gcloud services enable firestore.googleapis.com cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com identitytoolkit.googleapis.com firebaseappcheck.googleapis.com`
   puis `gcloud firestore databases create --location=europe-west1`.
2. Application web Firebase : créée le 14 septembre 2026, `docs/js/config.js` rempli (appId `1:628990126729:web:5798de23bd4778bc69b458`).
3. Déployer règles, index, fonctions et site : `npm run deploy`.
4. Domaine personnalisé `quiz.guineen68.com` : déjà ajouté au site Hosting le 14 septembre 2026 (API), d'où l'enregistrement DNS du § 1.2.
5. Administrateurs exemptés (par compte, jamais par nom), créés le 14 septembre 2026 :
   `node tools/add_admin.js ousmane@mudupay.com` et `node tools/add_admin.js sarah.sow@mudupay.com`.
   Chacun se connecte ensuite avec Google via le lien **Administration** en bas de l'accueil du site.
6. Importer l'ancien classement (feuille Google Sheets) : `node tools/import_sheet.js` (lit l'URL Apps Script
   de `docs/js/config.js`, importe chaque ligne comme tentative `legacy`, reconstruit les tops). Relançable sans doublon.
7. Déploiement automatique depuis GitHub (`.github/workflows/firebase-hosting.yml`). Le compte de service
   `github-hosting-deploy@gouvernement-qcm.iam.gserviceaccount.com` existe (rôles Hosting Admin, Auth Admin,
   Run Viewer, API Keys Viewer). La politique de l'organisation interdit les clés de compte de service : on utilise
   la fédération d'identité (sans secret). Commandes restantes, à valider par vous (elles accordent des droits IAM) :
   ```
   gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project gouvernement-qcm
   gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions" --project gouvernement-qcm
   gcloud iam workload-identity-pools providers create-oidc github-provider --location=global --workload-identity-pool=github \
     --issuer-uri="https://token.actions.githubusercontent.com" \
     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
     --attribute-condition="assertion.repository=='TheBlackDude/Simandou-Quiz'" --project gouvernement-qcm
   gcloud iam service-accounts add-iam-policy-binding github-hosting-deploy@gouvernement-qcm.iam.gserviceaccount.com \
     --role=roles/iam.workloadIdentityUser \
     --member="principalSet://iam.googleapis.com/projects/628990126729/locations/global/workloadIdentityPools/github/attribute.repository/TheBlackDude/Simandou-Quiz"
   gcloud projects add-iam-policy-binding gouvernement-qcm --member="serviceAccount:github-hosting-deploy@gouvernement-qcm.iam.gserviceaccount.com" --role=roles/firebase.viewer
   ```
   Tant que ce n'est pas fait, le site se déploie depuis ce Mac avec `npm run deploy:hosting` (même résultat).
8. Vérifier sur `https://gouvernement-qcm.web.app` puis sur `https://quiz.guineen68.com`.

Particularités dues aux politiques de l'organisation mudupay.com (réglées le 14 septembre 2026, à refaire pour tout nouveau projet) :
- `iam.disableServiceAccountKeyCreation` : pas de clé de compte de service → fédération d'identité pour GitHub (§ 2.7).
- Les comptes de service par défaut ne reçoivent plus leurs rôles automatiquement : le compte Compute Engine
  (`628990126729-compute@developer.gserviceaccount.com`, qui construit et exécute les fonctions) a reçu
  `cloudbuild.builds.builder`, `logging.logWriter`, `artifactregistry.writer`, `storage.objectViewer` et
  `datastore.user` (`tools/grant_runtime_sa.sh`).
- `iam.allowedPolicyMemberDomains` : dérogation au niveau du projet (`tools/orgpolicy-allow-public.yaml`) pour
  pouvoir donner `roles/run.invoker` à `allUsers` sur les services Cloud Run `submit`, `state` et `reset`
  (sinon les navigateurs reçoivent 403). À refaire après tout `firebase deploy --only functions` qui
  **recréerait** une fonction (une simple mise à jour conserve les droits).

## 3. Bascule (cutover)

1. Le site GitHub Pages reste en ligne jusqu'à validation complète du nouveau site.
2. Dernier import de la feuille : `node tools/import_sheet.js`.
3. Remplacer GitHub Pages par la redirection : dans `.github/workflows/pages.yml`, publier le dossier `redirect/`
   au lieu de `docs/` (page avec `meta refresh` + redirection JavaScript vers quiz.guineen68.com).
4. Refaire un import de la feuille quelques heures après (dernières lignes envoyées par d'anciens onglets ouverts).
5. Figer le contenu : toute modification des questions change la version (`window.QUIZ_VERSION` /
   `functions/questions.json`) et impose de redéployer **fonctions et site ensemble** (`npm run deploy`) ;
   les participants dont l'onglet est ancien voient un écran « contenu mis à jour, rechargez la page ».

## 4. Règles de jeu appliquées par le serveur

- Le navigateur n'envoie **jamais un score**, seulement ses réponses ; la fonction `submit` corrige avec le corrigé
  officiel (`functions/questions.json`) et enregistre le résultat.
- **2 résultats enregistrés par appareil et par quiz** (quiz complet terminé ou parcours par sections terminé).
  Identité de l'appareil = compte anonyme Firebase (persistant dans le navigateur ; un participant qui efface
  ses données de site obtient une nouvelle identité — limite acceptée, l'identité réelle est vérifiée à la remise des prix).
- Les sections restent rejouables sans limite ; le parcours terminé compte pour une tentative ; l'améliorer
  ensuite met à jour la même tentative.
- Administrateurs (collection `admins`, connexion Google) : tentatives illimitées, résultats conservés mais
  **exclus du classement public**.
- Classement : document `leaderboard/{quiz}` (top 100, meilleur résultat par participant, égalité départagée par
  la date la plus ancienne), lu directement par les navigateurs ; aucune lecture de la collection complète.
- Anti-abus : 3 s minimum entre deux soumissions de section par appareil ; App Check possible (§ 1.3).
- Réseau instable : un résultat non transmis est mis en attente dans le navigateur et renvoyé automatiquement.

## 5. Exploitation

| Commande | Rôle |
|---|---|
| `npm run deploy` | règles + index + fonctions + site |
| `npm run deploy:hosting` | site seul (aussi automatique à chaque push sur `main`) |
| `node tools/add_admin.js email` (`--remove`) | ajouter / retirer un administrateur |
| `node tools/import_sheet.js [url\|fichier.json]` | importer l'ancien classement |
| `node tools/rebuild_leaderboard.js` | reconstruire les tops depuis la collection `attempts` |
| `node tools/export_attempts.js [quiz] > tentatives.csv` | export CSV complet pour la remise des prix |
| `npx firebase emulators:start --project demo-gouvernement-qcm` | tests locaux (mettre `emulators: true` et une `apiKey` factice dans `config.js`) |

Constantes : limite de tentatives `ATTEMPT_LIMIT` et délai anti-rafale dans `functions/index.js` ; taille du top
dans `functions/rank.js`.

Coût estimé pour la semaine (500 000 participants) : inférieur à 100 USD (fonctions ≈ 1,5 M d'appels,
Firestore ≈ 3 M lectures / 1 M écritures, Hosting ≈ 100 Go).

## 6. Concours en direct (mode « événement », 28 septembre 2026)

Épreuves successives devant jury, **données entièrement séparées** du quiz public (collection Firestore `events`,
jamais `attempts`/`leaderboard`) : le quiz public continue de fonctionner normalement pendant le concours.

### Pages

| Page | Qui | Rôle |
|---|---|---|
| `https://quiz.guineen68.com/concours` | participants | inscription (code d'accès + nom), attente du signal, épreuve chronométrée, score, rang, qualification |
| `https://quiz.guineen68.com/admin` | administrateur | régie : créer / activer un concours, **Démarrer 10 · 7 · 5 min** (ou durée libre), **Bloquer / Débloquer**, **Clôturer l'étape et qualifier**, **Étape suivante**, repêchage par numéro, réinitialiser |
| `https://quiz.guineen68.com/direct` | administrateur (vidéoprojecteur) | classement en temps réel, compte à rebours géant, compteurs (inscrits, en lice, en cours, ont terminé) ; à la fin de la finale, **podium + certificats des lauréats** avec bouton *Enregistrer / Imprimer (PDF)* ; bouton *Plein écran* |

### Règles appliquées par le serveur (Cloud Function `concours`)

- **Une seule tentative par appareil et par étape.** L'identité de l'appareil est le compte anonyme Firebase conservé
  par le navigateur : chaque participant doit garder **le même appareil et le même navigateur** (pas de navigation privée)
  du début à la fin. Les adresses IP ne servent à rien dans une salle (tout le monde sort avec la même IP publique) et les
  adresses MAC ne sont pas lisibles par un navigateur.
- **Qualification** : à la clôture d'une étape, le serveur classe les envois (**score décroissant, puis temps croissant**,
  temps mesuré côté serveur entre *Commencer* et l'envoi) et inscrit les *N* premiers comme seuls autorisés à démarrer
  l'étape suivante. Les autres voient leur rang et un message de fin de parcours.
- **Compte à rebours** : commun à toute la salle, fixé par l'administrateur ; envoi refusé dès qu'il est à zéro
  (tolérance réseau de 8 s pour les envois automatiques) ; refusé aussi quand l'épreuve est **bloquée** ou pas encore démarrée.
  À zéro, le téléphone de chaque participant **envoie automatiquement les réponses déjà données** (les questions sans réponse
  comptent zéro) ; 12 s plus tard la régie **clôture et qualifie automatiquement** ; en finale, les certificats apparaissent
  aussitôt sur l'écran de projection (moins de 15 s après zéro).
- Chaque participant reçoit les 40 questions **dans un ordre qui lui est propre, options mélangées** (le voisin ne peut pas
  copier « B, C, A… ») ; la correction se fait côté serveur, aucun corrigé n'est envoyé au navigateur.
- Code d'accès à 4 chiffres (affiché dans la salle) pour empêcher les inscriptions extérieures ; numéro de participant
  (N° 001, 002…) affiché à l'écran pour distinguer les homonymes ; téléphone facultatif pour joindre les lauréats.
- Repêchage : si un appareil tombe en panne, le participant se réinscrit sur un autre (nouveau numéro) et l'administrateur
  le repêche pour l'étape en cours avec son nouveau numéro.

### Déroulé le jour J (et pour le test à 5–15 personnes)

1. `/admin` → **Nouveau concours** : nom, code d'accès, étapes (par défaut Histoire → 100, CNRD → 20, Armée → 10,
   Simandou → 5 lauréats ; pour un test : 6, 3 puis 2 par exemple) → **Créer** → **Activer**. Un seul concours est actif à la fois.
2. Ouvrir `/direct` sur l'ordinateur relié au vidéoprojecteur (connexion Google administrateur), *Plein écran*.
3. Les participants ouvrent `quiz.guineen68.com/concours`, saisissent le code et leur nom → « En attente du signal ».
4. **Démarrer · 10 min** (ou 7, 5). Les téléphones affichent le compte à rebours et *Commencer*.
5. À zéro (ou après **Clôturer l'étape et qualifier**) : les N premiers sont qualifiés → **Étape suivante** → recommencer au 4.
6. Après la finale : podium et certificats sur `/direct` ; **Enregistrer / Imprimer** ouvre la boîte d'impression
   (choisir « Enregistrer au format PDF », A4 paysage).
7. Pour rejouer un test : **Réinitialiser le concours** (efface inscrits et résultats de ce concours seulement), ou créer
   un nouveau concours pour le 28 et l'activer. Les étapes non encore jouées peuvent être modifiées (**Modifier**).

### Mise en production et tests

- Déploiement (règles + fonctions + site) : `npm run deploy`. La fonction `concours` est nouvelle : si le déploiement
  signale « Unable to set the invoker for the IAM policy », lancer une fois `sh tools/grant_invoker_concours.sh`.
- Tests automatiques : `cd functions && npm test` (unitaires) et
  `npx firebase emulators:exec --only functions,firestore --project demo-gouvernement-qcm "node tools/test_concours_e2e.js"`
  (10 participants simulés, 23 vérifications : inscription, code, démarrage, envoi, blocage, clôture, qualification,
  repêchage, égalité départagée au temps, expiration, finale, retour, réinitialisation).
- Test manuel dans l'émulateur : `emulators: true` dans `docs/js/config.js` (à retirer ensuite),
  `npx firebase emulators:start --only functions,firestore,auth,hosting --project gouvernement-qcm`,
  `GCLOUD_PROJECT=gouvernement-qcm node tools/seed_emulator_admin.js ousmane@mudupay.com`, puis http://127.0.0.1:5050/admin.
