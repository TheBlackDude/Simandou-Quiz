# Quiz Simandou — Semaine de l'Indépendance, An 68

Questionnaire à choix multiples (40 questions) sur le projet Simandou et le Programme Simandou 2040.
Identité visuelle : bordeaux / or de la présentation « Option C Souveraineté ».

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| `docs/` | Application web statique (HTML, CSS, JS, images). C'est le dossier déployé. |
| `build/questions.py` | **Source unique des questions** (texte, options, bonne réponse, explication). |
| `build/build_site.py` | Génère `docs/js/questions.js` et le fichier unique `quiz-simandou.html`. |
| `build/make_docx.py` | Génère les versions Word (participants / animateur avec corrigé). |
| `quiz-simandou.html` | Version autonome en un seul fichier (à envoyer par e-mail ou WhatsApp, s'ouvre sans serveur). |
| `Quiz Simandou An 68 - *.docx / .pdf` | Versions imprimables. |

## Lancer en local

Option 1 — sans rien installer : double-cliquer sur `docs/index.html` (ou sur `quiz-simandou.html`).

Option 2 — avec un petit serveur local (recommandé pour tester l'impression du certificat) :

```bash
cd docs
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

## Déployer sur GitHub Pages

1. Pousser le dépôt sur GitHub (branche `main`).
2. Dans **Settings → Pages**, choisir **Source : GitHub Actions**.
3. Le workflow `.github/workflows/pages.yml` publie automatiquement le dossier `docs/` à chaque `push` sur `main`.
   L'adresse sera `https://<compte>.github.io/<dépôt>/`.

Alternative sans workflow : **Settings → Pages → Source : Deploy from a branch**, branche `main`, dossier `/docs`.

## Déployer ailleurs

Le site est 100 % statique : copier le contenu de `docs/` sur n'importe quel hébergeur
(Netlify, Vercel, Cloudflare Pages, un serveur Nginx/Apache, un bucket S3…). Aucune base de données, aucun backend.

## Modifier les questions

1. Éditer `build/questions.py` (l'index de la bonne réponse va de 0 à 3 : A = 0, B = 1, C = 2, D = 3).
2. Régénérer :

```bash
cd build
python3 build_site.py      # site + fichier unique
python3 make_docx.py       # versions Word (nécessite : pip install python-docx)
```

## Parcours par sections

Les sections A → B → C → D se débloquent dans l'ordre : il faut **80 % de bonnes réponses** (8/10) à une section
pour voir apparaître le bouton « Continuer : section suivante ». La progression est mémorisée dans le navigateur
(`localStorage`) ; un lien « Réinitialiser le parcours » sur l'accueil la remet à zéro. Le quiz complet reste toujours accessible.
Le seuil se règle dans `docs/js/app.js` (constante `PASS`).

## Certificat

À la fin du **quiz complet**, un certificat imprimable (A4 paysage) est proposé à partir de 80 % de bonnes réponses :

| Niveau | Seuil | Titre |
|---|---|---|
| Or | 95 % et plus (38/40) | Expert Simandou |
| Argent | 88 % et plus (35/40) | Bâtisseur de Simandou 2040 |
| Bronze | 80 % et plus (32/40) | Ambassadeur de Simandou |

Les seuils se règlent dans `docs/js/app.js` (constante `LEVELS`). Le bouton « Imprimer / Enregistrer en PDF »
utilise l'impression du navigateur : choisir « Enregistrer au format PDF » pour obtenir un fichier.

## Documents sources

Les présentations `.pptx` de la Semaine de l'Indépendance sont exclues du dépôt par `.gitignore` (documents internes).
