# Gouvernement QCM — Semaine de l'Indépendance, An 68

*L'Indépendance en héritage · La jeunesse en marche · Simandou 2040 en ligne de mire*

Application de quiz à choix multiples en quatre modules de 40 questions chacun :

| Module | Contenu |
|---|---|
| **Quiz Simandou** | Le gisement, ses partenaires, le chemin de fer transguinéen, le port de Morebaya, le Programme Simandou 2040. |
| **Quiz Histoire de la Guinée** | Le « Non » de 1958 et l'indépendance ; les bâtisseurs et grandes figures (1950-2000) ; la Première République (1958-1984) ; l'armée, la Deuxième République et la Guinée d'aujourd'hui. |
| **Quiz Armée et Gendarmerie** | Des résistants (1882-1898) à la naissance de l'armée nationale (1958) ; les grandes figures et la Gendarmerie nationale ; les unités, écoles et spécialités ; les missions extérieures et l'Armée-Nation. |
| **Quiz Bilan du CNRD 2021-2026** | La refondation de l'État et le retour à l'ordre constitutionnel ; économie, finances et souveraineté minière ; infrastructures, énergie et numérique ; capital humain, protection sociale et bonne gouvernance. |

À l'ouverture, le participant voit le titre, la devise de l'édition, saisit son nom et choisit son quiz.
Chaque module offre les mêmes fonctions : parcours par sections (déblocage à 80 %), quiz complet, classement partagé et certificat imprimable.
Identité visuelle : palette MuduPay (bleu, orange, blanc).

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| `docs/` | Application web statique (HTML, CSS, JS, images). C'est le dossier déployé. |
| `build/questions.py` | Questions du **Quiz Simandou** (texte, options, bonne réponse, explication). |
| `build/questions_histoire.py` | Questions du **Quiz Histoire de la Guinée**. |
| `build/questions_armee.py` | Questions du **Quiz Armée et Gendarmerie**. |
| `build/questions_cnrd.py` | Questions du **Quiz Bilan du CNRD 2021-2026**. |
| `build/quizzes.py` | Registre des modules : titres, textes d'accueil, barre de progression, niveaux, certificat, documents. |
| `build/build_site.py` | Génère `docs/js/questions.js` et le fichier unique `government-quiz.html`. |
| `build/make_docx.py` | Génère les versions Word (participants / animateur avec corrigé) de chaque module, puis les PDF via Pages. |
| `government-quiz.html` | Version autonome en un seul fichier (à envoyer par e-mail ou WhatsApp, s'ouvre sans serveur). |
| `Quiz Simandou An 68 - *` / `Quiz Histoire de la Guinee An 68 - *` / `Quiz Armee et Gendarmerie An 68 - *` / `Quiz Bilan du CNRD 2021-2026 An 68 - *` | Versions imprimables (.docx et .pdf). |
| `leaderboard/Code.gs` | Script Google Apps Script du classement partagé. |

## Lancer en local

Option 1 — sans rien installer : double-cliquer sur `docs/index.html` (ou sur `government-quiz.html`).

Option 2 — avec un petit serveur local (recommandé pour tester l'impression du certificat) :

```bash
cd docs
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

## Déployer sur GitHub Pages

Le workflow `.github/workflows/pages.yml` publie automatiquement le dossier `docs/` à chaque `push` sur `main`
(Settings → Pages → Source : GitHub Actions). Le site est 100 % statique et peut aussi être copié sur n'importe quel hébergeur.

## Modifier les questions ou ajouter un module

1. Éditer `build/questions.py`, `build/questions_histoire.py` ou `build/questions_armee.py` (index de la bonne réponse : A = 0, B = 1, C = 2, D = 3).
   Chaque module compte 4 sections de 10 questions.
2. Pour un nouveau module : créer `build/questions_<nom>.py` et l'ajouter à la liste `QUIZZES` de `build/quizzes.py`
   (identifiant, titres, barre de progression, titres des certificats, textes des documents).
3. Régénérer :

```bash
cd build
python3 build_site.py        # site + fichier unique
python3 make_docx.py         # Word + PDF de tous les modules (pip install python-docx ; Pages pour le PDF)
python3 make_docx.py histoire --no-pdf   # un seul module, sans PDF
```

## Parcours par sections

Les sections A → B → C → D se débloquent dans l'ordre : il faut **80 % de bonnes réponses** (8/10) à une section
pour voir apparaître le bouton « Continuer : section suivante ». La progression est mémorisée dans le navigateur
(`localStorage`), séparément pour chaque module ; un lien « Réinitialiser le parcours » la remet à zéro.
Le quiz complet reste toujours accessible. Le seuil se règle dans `docs/js/app.js` (constante `PASS`).

## Classement (leaderboard)

Chaque quiz complet terminé et chaque parcours par sections terminé est enregistré au classement du module
(meilleur résultat par participant, tri par pourcentage). Chaque module a son propre classement.

- **Par défaut**, le classement est enregistré dans le navigateur de l'appareil (`localStorage`).
- **Classement partagé entre tous les appareils** (gratuit, sans serveur) :
  1. Créer une feuille Google Sheets vide → *Extensions → Apps Script* → coller le contenu de `leaderboard/Code.gs`.
  2. *Déployer → Nouveau déploiement → Application web* · Exécuter en tant que : **Moi** · Accès : **Tout le monde**.
  3. Copier l'URL de l'application web dans `docs/js/config.js` (`leaderboardUrl`), puis pousser sur `main`.
  Les scores arrivent dans la feuille (une ligne par résultat, avec la colonne `quiz`) ; l'animateur peut y corriger ou supprimer une ligne.
  Après une modification de `Code.gs` : *Déployer → Gérer les déploiements → Modifier → Version : Nouvelle version*.

## Corrigé

Les participants ne voient jamais les réponses dans l'application. L'animateur utilise les PDF « Questionnaire et Corrigé ».
L'explication affichée après chaque réponse peut être désactivée avec la constante `SHOW_FEEDBACK` dans `docs/js/app.js`.

## Certificat

Un certificat imprimable (A4 paysage) est proposé à partir de 80 % de bonnes réponses, soit à la fin du **quiz complet**,
soit à la fin du **parcours par sections** (les meilleurs scores des quatre sections sont additionnés sur 40) :

| Niveau | Seuil | Quiz Simandou | Quiz Histoire de la Guinée |
|---|---|---|---|
| Or | 95 % et plus (38/40) | Expert Simandou | Gardien de la mémoire nationale |
| Argent | 88 % et plus (35/40) | Bâtisseur de Simandou 2040 | Héritier de l'Indépendance |
| Bronze | 80 % et plus (32/40) | Ambassadeur de Simandou | Ambassadeur de l'Indépendance |

Les seuils se règlent dans `docs/js/app.js` (constante `LEVEL_MIN`), les titres dans `build/quizzes.py`.
Le bouton « Imprimer / Enregistrer en PDF » utilise l'impression du navigateur.

## Documents sources

Les présentations `.pptx` de la Semaine de l'Indépendance sont exclues du dépôt par `.gitignore` (documents internes).
