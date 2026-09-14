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
