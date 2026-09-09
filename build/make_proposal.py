# -*- coding: utf-8 -*-
"""Proposition « Government Quiz Guinée » — note de proposition du SGG au Gouvernement et à la Présidence.
Le contenu est défini une seule fois (CONTENT) puis rendu en Word (+ PDF via Pages) et en HTML."""
import os, sys, html, json
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from make_docx import shade, no_borders, light_borders, run, para, band, footer_text, to_pdf, BLUE, GOLD, ORANGE, DARK, GREY, WHITE, FONT

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "proposition"); os.makedirs(OUT_DIR, exist_ok=True)
BASENAME = "Proposition Government Quiz Guinee - Plateforme nationale de quiz educatifs"

BUDGET = [
 ("1", "Conception et développement de la plateforme", "Portail des institutions (téléversement, prévisualisation, validation), générateur de quiz, comptes participants avec vérification par SMS, classements, certificats avec QR code, tableau de bord, module « Mérite »", 165_000_000),
 ("2", "Hébergement et infrastructure (12 mois)", "Diffusion de contenu (CDN), base de données, stockage, envois SMS de vérification, sauvegardes ; dimensionné jusqu'à 1 million d'utilisateurs par mois", 65_000_000),
 ("3", "Sécurité, conformité et audit", "Tests d'intrusion, protection des données personnelles (Loi L/2016/037/AN), audit indépendant avant lancement", 25_000_000),
 ("4", "Exploitation, maintenance et support (12 mois)", "Équipe d'exploitation, corrections et évolutions, assistance aux institutions et aux participants, rapports mensuels", 85_000_000),
 ("5", "Formation des points focaux et accompagnement éditorial", "Ateliers pour les institutions, guide et modèles de questions, appui à la rédaction des premières campagnes", 20_000_000),
 ("6", "Communication digitale et lancement", "Identité visuelle, contenus pour les réseaux sociaux, vidéos courtes, matériel de lancement des campagnes", 25_000_000),
 ("7", "Provision pour imprévus (environ 4 %)", "Aléas techniques, coûts SMS supplémentaires en cas de forte affluence", 15_000_000),
]
TOTAL = sum(b[3] for b in BUDGET); assert TOTAL == 400_000_000, TOTAL
USD = 8_780
fmt = lambda n: f"{n:,}".replace(",", " ")
PER_MONTH = round(TOTAL / 12_000_000)        # GNF par participant et par mois à pleine capacité
PER_YOUTH = round(TOTAL / 500_000)           # GNF par participant unique (cible année 1)

CONTENT = [
 # ---------------- Fiche synthétique ----------------
 ("h1", "Fiche synthétique"),
 ("kv", [
  ("Intitulé du projet", "Government Quiz Guinée — Plateforme nationale de quiz éducatifs et d'opportunités pour la jeunesse"),
  ("Initiateur et maître d'ouvrage", "Secrétariat Général du Gouvernement (SGG)"),
  ("Pilote", "Government Quiz — Semaine de l'Indépendance, An 68 (25 septembre – 2 octobre 2026) : Quiz Simandou et Quiz Histoire de la Guinée, 80 questions, certificats, classement national"),
  ("Bénéficiaires", "La jeunesse guinéenne (élèves, étudiants, jeunes actifs et demandeurs d'emploi, diaspora) ; l'ensemble des ministères, agences et sociétés d'État"),
  ("Principe", "Chaque institution publie ses propres quiz en téléversant simplement un fichier de questions ; la plateforme construit le quiz, gère les participants, les classements et les certificats ; les meilleurs sont récompensés par des bourses, des formations, des stages et des emplois"),
  ("Budget demandé", f"{fmt(TOTAL)} GNF (environ {fmt(round(TOTAL / USD / 100) * 100)} USD) pour la construction et 12 mois d'exploitation"),
  ("Capacité", "Jusqu'à 1 000 000 d'utilisateurs par mois ; disponibilité visée 99,9 %"),
  ("Délai de réalisation", "Un mois : la plateforme complète est construite, testée et déployée dans les trente jours qui suivent la fin de la Semaine de l'Indépendance"),
  ("Calendrier", "Décision : avant le 2 octobre 2026 · Construction et déploiement : du 3 octobre au 2 novembre 2026, soit un mois après la Semaine de l'Indépendance · Lancement national : novembre 2026 · Cérémonie nationale du Mérite : octobre 2027 (An 69)"),
  ("Décision demandée", "Approbation du projet et du budget ; désignation du SGG comme maître d'ouvrage ; désignation d'un point focal par institution ; création du Fonds du Mérite"),
 ]),

 # ---------------- 1. Résumé exécutif ----------------
 ("h1", "1. Résumé exécutif"),
 ("p", "Pour la Semaine de l'Indépendance An 68, le Secrétariat Général du Gouvernement a mis en ligne « Government Quiz », une application de quiz en français, accessible depuis n'importe quel téléphone, qui propose deux questionnaires de 40 questions : le Quiz Simandou et le Quiz Histoire de la Guinée. Les participants progressent par sections, obtiennent un certificat de réussite (Bronze, Argent, Or) et figurent à un classement national partagé. Conçue et mise en ligne en une semaine, sans infrastructure coûteuse, cette application a été testée et approuvée par Monsieur le Ministre Secrétaire Général du Gouvernement."),
 ("p", "La présente note propose d'en faire un outil national : une plateforme où chaque ministère, chaque agence et chaque société d'État peut publier ses propres quiz en téléversant simplement un fichier de questions avec les bonnes réponses. La plateforme construit le quiz, accueille les participants, tient les classements, délivre les certificats et fournit un tableau de bord. Surtout, elle relie l'effort d'apprendre à des opportunités réelles : les meilleurs participants de chaque campagne reçoivent des bourses d'études complètes, des formations professionnelles et techniques, des stages et des emplois, offerts par les institutions et leurs partenaires."),
 ("p", "Parce qu'elle s'appuie sur le socle déjà en service, la plateforme complète peut être construite, testée et déployée en un mois, dès la fin de la Semaine de l'Indépendance : décision avant le 2 octobre 2026, mise en service le 2 novembre 2026, premières campagnes des ministères en novembre."),
 ("kpis", [
  ("1 mois", "pour construire et déployer la plateforme"),
  ("1 000 000", "utilisateurs par mois (capacité)"),
  ("15+", "institutions publiant leurs quiz en année 1"),
  ("400 millions", "de GNF : construction et 12 mois d'exploitation"),
 ]),
 ("p", f"Le coût demandé, {fmt(TOTAL)} GNF pour la construction et douze mois d'exploitation, représente {PER_MONTH} GNF par participant et par mois à pleine capacité, soit moins que le prix d'un SMS. Les récompenses elles-mêmes sont des contributions en nature des institutions et des partenaires (bourses, places de formation, stages, emplois), réunies dans un Fonds du Mérite."),
 ("callout", "Ce que la plateforme change : pour la première fois en Guinée, un jeune de Kérouané, de Labé ou de Nzérékoré peut, depuis son téléphone, apprendre ce que l'État veut lui transmettre, se mesurer à toute la jeunesse du pays et ouvrir, par son mérite, la porte d'une bourse, d'une formation ou d'un emploi."),
 ("p", "Le Gouvernement est invité à approuver le projet et son budget, à confier au SGG la maîtrise d'ouvrage, à instruire chaque institution de désigner un point focal sous quinze jours et de publier au moins un quiz au cours de la première année, et à créer le Fonds du Mérite dont la remise annuelle des récompenses serait présidée par le Chef de l'État."),

 # ---------------- 2. Contexte ----------------
 ("h1", "2. Contexte : une jeunesse nombreuse, connectée, en attente d'opportunités"),
 ("p", "La Guinée compte 15,2 millions d'habitants et un âge médian de 18,3 ans : la moitié de la population n'a pas 19 ans. Le pays totalise 12,8 millions de connexions mobiles (84,6 % de la population), 4,02 millions d'internautes (26,5 %) et 3,7 millions d'utilisateurs de réseaux sociaux, avec une progression continue portée par la jeunesse urbaine puis rurale (DataReportal, Digital 2026 : Guinea)."),
 ("p", "Dans le même temps, les 48 établissements d'enseignement supérieur forment plus de 15 000 diplômés par an, dont moins d'un tiers occupe un emploi douze mois après la sortie ; le chômage des jeunes diplômés dépasse 40 % et environ 34 % des jeunes ne sont ni en emploi, ni en études, ni en formation (Observatoire national du travail, 2025). Le Programme Simandou 2040 fait du capital humain son deuxième pilier et a lancé la Simandou Academy et des unités mobiles de formation pour qualifier la jeunesse."),
 ("p", "Il manque un maillon simple entre ces deux réalités : un canal direct, mesurable et motivant, par lequel l'État transmet des connaissances utiles à sa jeunesse et repère, partout sur le territoire, celles et ceux qui méritent d'être accompagnés. Le quiz est le format d'apprentissage le plus engageant qui existe sur téléphone : rapide, ludique, immédiatement corrigé, et naturellement compétitif."),

 # ---------------- 3. Le pilote ----------------
 ("h1", "3. Le pilote An 68 : ce qui existe déjà"),
 ("p", "Le pilote démontre que l'approche fonctionne en conditions réelles, à coût quasi nul, et fournit la base technique de la plateforme nationale."),
 ("table", ["Élément", "Ce que le pilote apporte"], [
  ["Contenu", "Deux modules de 40 questions : Quiz Simandou (gisement, partenaires, chemin de fer, port, Programme Simandou 2040) et Quiz Histoire de la Guinée (le « Non » de 1958, les grandes figures, la Première République, l'armée et la Deuxième République). Chaque question est accompagnée d'une explication vérifiée."],
  ["Expérience", "Accueil commun (nom du participant, choix du quiz), parcours par sections débloquées à 80 %, quiz complet, classement national partagé, certificat Or / Argent / Bronze imprimable au format A4, documents imprimables pour l'animateur (questionnaire et corrigé)."],
  ["Technologie", "Application web légère : fonctionne sur tout smartphone, très faible consommation de données, aucune installation, version « fichier unique » partageable par WhatsApp ou e-mail. Aucune donnée sensible collectée."],
  ["Coût et délai", "Conception, contenu et mise en ligne en une semaine ; coût d'exploitation actuel proche de zéro (hébergement statique et classement sur Google Sheets)."],
  ["Mesure", "Pendant la Semaine de l'Indépendance (25 septembre – 2 octobre 2026), le pilote fournira les premiers indicateurs : participants, scores moyens par section, certificats délivrés, répartition géographique. Ils seront annexés à cette note après le 2 octobre 2026."],
 ], [3.2, 13.8]),

 # ---------------- 4. Vision ----------------
 ("h1", "4. La vision : un outil de la République pour former, révéler et récompenser"),
 ("callout", "Government Quiz Guinée — Apprendre · Se mesurer · Être récompensé"),
 ("p", "La plateforme poursuit cinq objectifs :"),
 ("bullets", [
  "Diffuser à grande échelle des connaissances utiles à la Nation : institutions et histoire, civisme, santé, sécurité, agriculture, finances publiques et impôt, culture et patrimoine, environnement, numérique, métiers d'avenir.",
  "Donner à chaque institution publique un canal pédagogique direct vers la jeunesse, sans aucune compétence technique : un fichier de questions suffit.",
  "Détecter et récompenser le mérite partout sur le territoire, y compris loin de Conakry, avec des règles d'équité entre régions et entre filles et garçons.",
  "Produire des données de pilotage inédites : niveau de connaissance par thème, région, âge et sexe, lacunes à combler, efficacité des campagnes de sensibilisation.",
  "Faire rayonner l'image d'un État moderne, transparent et proche de sa jeunesse, qui s'adresse à elle dans sa langue et sur son téléphone.",
 ]),

 # ---------------- 5. Fonctionnement ----------------
 ("h1", "5. Comment fonctionne la plateforme"),
 ("h2", "5.1 Pour les institutions : publier un quiz en trois étapes"),
 ("p", "Aucune compétence technique n'est requise : le point focal de l'institution publie un quiz complet en moins d'une heure."),
 ("steps", [
  ("Télécharger le modèle", "Un fichier Excel ou Word fourni par la plateforme : une ligne par question avec la question, quatre propositions, la bonne réponse, une explication et la section."),
  ("Remplir et téléverser", "Le point focal de l'institution remplit le modèle, le téléverse sur le portail et visualise immédiatement le quiz tel que les participants le verront."),
  ("Valider et publier", "Après validation par le point focal et le Comité éditorial, le quiz est publié aux couleurs et au logo de l'institution, avec une date de campagne, les récompenses associées et une page de présentation."),
 ]),
 ("p", "Options disponibles à la publication : nombre de sections, tirage aléatoire des questions, limite de temps, niveau visé (collège, lycée, université, grand public), campagne à récompenses ou quiz permanent, et, à terme, versions en langues nationales."),
 ("h2", "5.2 Pour les jeunes : apprendre, se mesurer, gagner"),
 ("bullets", [
  "Inscription en trente secondes : nom, numéro de téléphone vérifié par SMS, région, âge, situation (élève, étudiant, actif, en recherche d'emploi).",
  "Catalogue des quiz par institution et par thème ; parcours par sections avec déblocage progressif ; quiz complet chronométré pour les campagnes.",
  "Certificat de réussite avec QR code de vérification ; classements national, régional, par établissement et par institution.",
  "« Passeport du Mérite » : profil qui cumule certificats et points d'une campagne à l'autre, consultable par les recruteurs partenaires avec l'accord du participant.",
  "Notifications des nouvelles campagnes par WhatsApp et SMS ; mode faible connexion et version hors ligne pour les zones mal couvertes.",
 ]),
 ("h2", "5.3 Pour le SGG et la Présidence : piloter"),
 ("bullets", [
  "Tableau de bord en temps réel : participation par institution, région, sexe et âge ; taux de réussite par question, qui révèle les lacunes de connaissance à corriger.",
  "Modération, gestion des points focaux, export des données, rapport mensuel consolidé au Gouvernement.",
  "Suivi des récompenses : lauréats, engagements des institutions et des partenaires, remises effectuées.",
 ]),
 ("h2", "5.4 Intégrité des résultats"),
 ("p", "Toute campagne donnant lieu à des récompenses se termine par une finale supervisée : en présence, dans les préfectures et les universités, ou en ligne avec surveillance vidéo. Les scores en ligne servent à sélectionner les finalistes, jamais à attribuer seuls une bourse ou un emploi. S'y ajoutent : une inscription par numéro de téléphone vérifié, tirage aléatoire des questions et des propositions, limite de temps, détection des anomalies (temps de réponse, scores atypiques) et validation des lauréats par un jury."),

 # ---------------- 6. Programme Mérite ----------------
 ("h1", "6. Le programme « Mérite » : récompenser les meilleurs"),
 ("p", "Chaque institution qui publie un quiz définit les récompenses de sa campagne à partir d'un catalogue national. L'État et les partenaires alimentent un Fonds du Mérite, essentiellement en nature. Les récompenses sont publiées à l'avance, ainsi que les critères de sélection et la liste des lauréats."),
 ("table", ["Type de récompense", "Exemples", "Contributeurs potentiels"], [
  ["Bourses d'études complètes", "Universités et instituts publics, Simandou Academy, ISMGB de Boké, bourses à l'étranger dans le cadre de la coopération", "MESRSI, partenaires bilatéraux et multilatéraux"],
  ["Formations professionnelles et techniques", "Formations certifiantes, unités mobiles de formation, centres de formation des sociétés minières", "METFP, Simandou Academy, sociétés minières"],
  ["Stages de 3 à 6 mois", "Ministères, agences, sociétés d'État, entreprises du contenu local Simandou, banques, opérateurs télécoms", "Toutes les institutions, secteur privé"],
  ["Emplois et premiers contrats", "Accès facilité aux concours de la fonction publique, recrutements des entreprises partenaires", "Fonction publique, entreprises partenaires"],
  ["Distinctions nationales", "Réception à la Présidence, certificat signé, médaille du Mérite, mise en lumière dans les médias publics", "Présidence, SGG"],
  ["Récompenses de proximité", "Tablettes, forfaits de données, kits scolaires pour les meilleurs de chaque préfecture", "Opérateurs télécoms, partenaires"],
 ], [4.2, 7.6, 5.2]),
 ("p", "Règles d'équité : des lauréats dans chacune des huit régions administratives et à Conakry ; un objectif de parité filles-garçons ; des catégories d'âge ; la publication des critères et des résultats. Exemple d'une campagne type : « Ma santé, mes gestes » (Ministère de la Santé) — 200 000 participants attendus, 33 lauréats préfectoraux, 8 bourses régionales en sciences de la santé, 50 stages dans les hôpitaux régionaux."),

 # ---------------- 7. Benchmarks ----------------
 ("h1", "7. Ce qui se fait ailleurs : enseignements"),
 ("p", "Aucune plateforme n'a encore réuni, en Afrique, des quiz publiés par les ministères et des récompenses de mérite. Les initiatives suivantes, en Inde, au Kenya, à Singapour et dans le monde, valident chacune l'un des choix de la proposition."),
 ("table", ["Initiative", "Ce qu'elle montre", "Enseignement pour la Guinée"], [
  ["MyGov Quiz — Inde (État)", "Plateforme gouvernementale où chaque ministère publie ses propres quiz (santé, numérique, environnement…), avec certificats et prix. Le quiz « Viksit Bharat » 2025 a réuni plus de 5 millions de participants et un record mondial de 390 812 participants en une semaine.", "Une plateforme unique appartenant à l'État, alimentée par les ministères, avec certificats et récompenses, mobilise massivement la jeunesse."],
  ["Eneza Education — Kenya", "Cours et quiz par SMS sur téléphones basiques : plus de 10 millions d'apprenants depuis 2012, 70 % en zone rurale, scores supérieurs de 22,7 % à ceux des autres élèves.", "Le canal SMS/USSD (phase 2) permet d'atteindre les jeunes sans smartphone ni internet."],
  ["SkillsFuture — Singapour", "Crédits de formation offerts aux citoyens : 1,05 million de Singapouriens les ont utilisés ; 69 % déclarent une amélioration de leur performance professionnelle.", "Relier l'apprentissage à une récompense concrète (formation, bourse) est le moteur de l'engagement."],
  ["Kahoot! — Norvège (privé)", "Le format quiz a réuni plus de 14 milliards de participations dans le monde, à l'école comme en entreprise.", "Le quiz est le format d'apprentissage numérique le plus engageant ; il n'a pas besoin d'être réinventé, seulement mis au service de la Nation."],
  ["Guinée — Simandou Academy et unités mobiles de formation", "Des dispositifs de formation existent, mais sans porte d'entrée nationale, simple et méritocratique, pour y accéder.", "La plateforme devient la porte d'entrée de ces programmes et rend visibles les talents partout sur le territoire."],
 ], [3.6, 7.2, 6.2]),
 ("p", "Aucun pays d'Afrique ne dispose aujourd'hui d'une plateforme d'État reliant des quiz publiés par les ministères à des bourses, des formations et des emplois. La Guinée serait la première, avec une solution en français, sobre en données, dont le code appartient à l'État."),

 # ---------------- 8. Bénéfices ----------------
 ("h1", "8. Bénéfices et impact attendus"),
 ("h2", "8.1 Objectifs de la première année"),
 ("p", "Les cibles ci-dessous seront suivies mensuellement par le comité de pilotage et publiées dans le rapport annuel."),
 ("table", ["Indicateur", "Cible année 1"], [
  ["Institutions publiant au moins un quiz", "15 et plus"],
  ["Quiz publiés", "40 et plus"],
  ["Participants uniques", "500 000 (capacité : 1 000 000 par mois)"],
  ["Certificats délivrés", "150 000"],
  ["Jeunes récompensés (bourses, formations, stages, emplois)", "1 000 et plus"],
  ["Couverture territoriale", "Les 33 préfectures et les 5 communes de Conakry"],
  ["Part de participantes", "45 % et plus"],
  ["Disponibilité de la plateforme", "99,9 %"],
 ], [10.5, 6.5]),
 ("h2", "8.2 Ce que chacun y gagne"),
 ("bullets", [
  "Pour la jeunesse : des connaissances utiles, une reconnaissance officielle (certificats, Passeport du Mérite) et des opportunités réelles fondées sur le mérite, quel que soit le lieu de résidence ou le réseau familial.",
  "Pour les institutions : un canal direct et mesurable vers des centaines de milliers de jeunes, pour expliquer leurs missions, leurs réformes et leurs services (impôt citoyen, sécurité routière, prévention sanitaire, agriculture moderne, patrimoine), et un vivier de talents identifiés.",
  "Pour l'État : un outil de cohésion nationale et de civisme, une image de modernité et de transparence, des données pour ajuster les politiques publiques, et une réduction du coût de détection des talents.",
  "Pour l'économie : un capital humain mieux aligné sur les besoins de Simandou 2040 et du contenu local, des jeunes orientés vers les métiers d'avenir, des entreprises partenaires qui recrutent sur des critères objectifs.",
 ]),
 ("p", f"Efficience : {fmt(TOTAL)} GNF pour 500 000 participants représentent {PER_YOUTH} GNF par jeune touché sur l'année, certificat et données compris ; à pleine capacité, {PER_MONTH} GNF par participant et par mois."),

 # ---------------- 9. Gouvernance ----------------
 ("h1", "9. Gouvernance"),
 ("bullets", [
  "Maître d'ouvrage : le Secrétariat Général du Gouvernement, dont la vocation interministérielle garantit la neutralité de la plateforme et la mobilisation de toutes les institutions.",
  "Comité de pilotage, présidé par le SGG : Cabinet de la Présidence, Ministère de la Jeunesse et des Sports, Ministère de l'Enseignement pré-universitaire, de l'Alphabétisation et de l'Enseignement technique et de la formation professionnelle, Ministère de l'Enseignement supérieur, de la Recherche scientifique et de l'Innovation, Ministère des Postes, Télécommunications et de l'Économie numérique, Ministère du Budget, Agence nationale de la sécurité des systèmes d'information.",
  "Comité éditorial : historiens, pédagogues et représentants des institutions, chargé de valider la qualité et l'exactitude des questions avant publication.",
  "Points focaux : un titulaire et un suppléant par institution, formés par le projet, responsables du contenu et des récompenses de leur institution.",
  "Équipe projet (prestataire retenu par le SGG) : chef de projet, deux développeurs, un designer, un responsable du support et du contenu, sur douze mois ; transfert de compétences et remise du code source à l'État.",
  "Partenaires : opérateurs télécoms (SMS, accès aux données à tarif réduit), sociétés minières et entreprises du contenu local, universités, partenaires techniques et financiers pour la phase 2.",
 ]),

 # ---------------- 10. Technique ----------------
 ("h1", "10. Architecture technique, sécurité et inclusion"),
 ("p", "La plateforme prolonge l'architecture du pilote : une application web mobile d'abord, servie par un réseau de diffusion de contenu, un socle applicatif sans serveur à dimensionnement automatique et une base de données managée. Cette architecture absorbe des pics de plusieurs centaines de milliers de participants sans investissement matériel, avec une disponibilité visée de 99,9 %."),
 ("bullets", [
  "Modules : portail des institutions, générateur de quiz, comptes participants avec vérification par SMS, moteur de classement, certificats PDF avec QR code de vérification, tableau de bord, notifications, interface d'export.",
  "Données et conformité : application de la Loi L/2016/037/AN relative à la cybersécurité et à la protection des données à caractère personnel ; collecte minimale (nom, téléphone, région, âge, sexe, situation) ; consentement explicite ; chiffrement ; sauvegardes quotidiennes ; audit indépendant avant lancement.",
  "Souveraineté : code source propriété de l'État et remis au SGG ; hébergement avec engagement de réversibilité et possibilité de rapatriement des données ; aucune dépendance à une licence payante.",
  "Inclusion : moins de 300 Ko de données par quiz, fonctionnement sur les smartphones Android d'entrée de gamme, version hors ligne, contenus en français puis en langues nationales (texte et audio) ; phase 2 : accès par USSD/SMS pour les téléphones basiques.",
 ]),

 # ---------------- 11. Feuille de route ----------------
 ("h1", "11. Feuille de route : un mois pour déployer, douze mois pour installer"),
 ("p", "Le calendrier part du pilote de la Semaine de l'Indépendance An 68. La plateforme complète est construite et déployée dans le mois qui suit, du 3 octobre au 2 novembre 2026, ce que permettent le socle existant, une architecture sans serveur et une équipe déjà en place. Les onze mois suivants servent à installer l'usage dans les institutions, jusqu'à la première Cérémonie nationale du Mérite lors de la Semaine de l'Indépendance An 69."),
 ("table", ["Phase", "Période", "Contenu", "Livrable"], [
  ["0 · Pilote An 68", "25 sept. – 2 oct. 2026", "Government Quiz (Simandou, Histoire de la Guinée) pendant la Semaine de l'Indépendance", "Rapport du pilote avec indicateurs"],
  ["1 · Décision", "Avant le 2 oct. 2026", "Approbation du projet et du budget, désignation du SGG, nomination des points focaux", "Décision du Gouvernement ; arrêté de création du comité de pilotage"],
  ["2 · Construction et déploiement", "3 oct. – 2 nov. 2026 (un mois)", "Semaine 1 : portail des institutions et générateur de quiz · Semaine 2 : comptes participants, classements, certificats · Semaine 3 : tableau de bord, module Mérite, audit de sécurité · Semaine 4 : recette, formation des points focaux, mise en service ; trois ministères pilotes préparent leurs quiz en parallèle", "Plateforme en service le 2 novembre 2026 ; trois campagnes prêtes"],
  ["3 · Lancement national", "Novembre 2026", "Lancement avec cinq à huit institutions ; première campagne nationale « Guinée, mon pays » ; premières récompenses avant la fin de l'année", "Premiers lauréats"],
  ["4 · Montée en charge", "Déc. 2026 – sept. 2027", "Quinze institutions et plus, campagnes mensuelles, finales régionales, langues nationales, canal SMS", "Rapports mensuels ; 1 000 lauréats"],
  ["5 · Cérémonie du Mérite", "Octobre 2027 (An 69)", "Finale nationale et remise des récompenses présidée par le Chef de l'État lors de la Semaine de l'Indépendance", "Bilan de l'année 1 ; plan de l'année 2"],
 ], [3.2, 3.0, 6.6, 4.2]),

 # ---------------- 12. Budget ----------------
 ("h1", f"12. Budget : {fmt(TOTAL)} GNF pour la construction et douze mois d'exploitation"),
 ("p", "Le budget couvre la conception de la plateforme, son hébergement dimensionné pour un million d'utilisateurs par mois, sa sécurité, son exploitation pendant douze mois et l'accompagnement des institutions. Il ne comprend pas les récompenses, apportées en nature par les institutions et les partenaires."),
 ("budget", BUDGET),
 ("p", f"Total : {fmt(TOTAL)} GNF, soit environ {fmt(round(TOTAL / USD / 100) * 100)} USD au taux de {fmt(USD)} GNF pour un dollar (septembre 2026). Les récompenses (bourses, places de formation, stages, emplois) sont des contributions en nature des institutions et des partenaires, hors budget de la plateforme, réunies dans le Fonds du Mérite. Le budget de l'année 2 se limitera à l'exploitation et aux évolutions (canal SMS, langues nationales), estimé à moins de la moitié du budget de l'année 1."),

 # ---------------- 13. Risques ----------------
 ("h1", "13. Risques et mesures de maîtrise"),
 ("p", "Les principaux risques ont été identifiés dès le pilote ; chacun dispose d'une mesure de maîtrise intégrée au projet."),
 ("table", ["Risque", "Mesure"], [
  ["Faible adoption", "Campagnes assorties de récompenses attractives et publiées à l'avance ; partenariat avec les opérateurs pour un accès à tarif réduit ; relais des établissements scolaires et universitaires, des maisons de jeunes et des médias publics."],
  ["Triche et usurpation", "Finale supervisée pour toute récompense ; inscription par numéro vérifié ; tirage aléatoire ; limite de temps ; détection d'anomalies ; jury de validation."],
  ["Qualité et exactitude des questions", "Modèle structuré, guide de rédaction, double validation (point focal puis Comité éditorial), explications sourcées, correction rapide en ligne."],
  ["Connectivité inégale", "Application très légère, version hors ligne, canal SMS/USSD en phase 2, finales en présence dans les préfectures."],
  ["Pérennité", "Code propriété de l'État, équipe locale formée, transfert de compétences, budget d'exploitation identifié dès l'année 1."],
  ["Protection des données", "Conformité à la Loi L/2016/037/AN, minimisation des données, consentement, chiffrement, audit indépendant, droit d'accès et de suppression."],
 ], [4.5, 12.5]),

 # ---------------- 14. Décisions ----------------
 ("h1", "14. Décisions demandées"),
 ("numbered", [
  "Approuver le projet « Government Quiz Guinée » comme plateforme nationale de quiz éducatifs et d'opportunités pour la jeunesse, dans le cadre du pilier capital humain du Programme Simandou 2040.",
  "Désigner le Secrétariat Général du Gouvernement maître d'ouvrage du projet et président du comité de pilotage.",
  f"Autoriser un budget de {fmt(TOTAL)} GNF pour la construction de la plateforme et douze mois d'exploitation, jusqu'à un million d'utilisateurs par mois, avec une mise en service dans le mois qui suit la Semaine de l'Indépendance.",
  "Instruire chaque ministère, agence et société d'État de désigner un point focal dans les quinze jours et de publier au moins un quiz au cours de la première année.",
  "Créer le Fonds du Mérite, alimenté par les institutions et les partenaires (bourses, formations, stages, emplois), et instituer une cérémonie annuelle de remise des récompenses présidée par le Chef de l'État lors de la Semaine de l'Indépendance.",
 ]),
 ("h1", "Conclusion"),
 ("p", "Le pilote de l'An 68 a montré qu'en quelques jours, avec des moyens modestes, l'État peut parler à sa jeunesse dans un format qu'elle aime. La plateforme nationale transforme cet essai en une politique publique durable : chaque institution enseigne, chaque jeune apprend et se mesure, et le mérite ouvre des portes. L'Indépendance en héritage, la jeunesse en marche, Simandou 2040 en ligne de mire : Government Quiz Guinée donne à cette devise un outil concret, à la portée de chaque téléphone du pays."),

 # ---------------- Annexes ----------------
 ("h1", "Annexe A · Modèle de fichier de questions"),
 ("p", "Une ligne par question. Le fichier peut être rempli dans Excel, Google Sheets ou Word. Le portail vérifie automatiquement les colonnes, signale les lignes incomplètes et affiche le quiz avant publication."),
 ("table", ["Colonne", "Contenu", "Exemple"], [
  ["Section", "Lettre ou titre de la section (4 sections de 10 questions recommandées)", "A · L'impôt citoyen"],
  ["Question", "La question, en une phrase", "À quoi sert l'impôt sur le revenu ?"],
  ["Proposition A / B / C / D", "Quatre propositions, une seule correcte", "…"],
  ["Bonne réponse", "A, B, C ou D", "C"],
  ["Explication", "Une ou deux phrases affichées après la réponse, avec la source si possible", "L'impôt finance les services publics : écoles, hôpitaux, routes…"],
  ["Niveau (facultatif)", "Collège, lycée, université, grand public", "Grand public"],
 ], [4.0, 7.5, 5.5]),
 ("h1", "Annexe B · Exemples de campagnes par institution"),
 ("p", "Chaque institution choisit ses thèmes et ses récompenses ; les exemples ci-dessous illustrent la diversité possible dès la première année."),
 ("table", ["Institution", "Thème de quiz", "Récompenses possibles"], [
  ["Ministère du Budget / Économie et Finances", "« Le budget de l'État et l'impôt citoyen »", "Stages à la DGI, à la DGD et au Trésor ; bourses en finances publiques"],
  ["Ministère de la Culture, du Tourisme et de l'Artisanat", "« Patrimoine, sites et cultures de Guinée »", "Formations de guides touristiques ; stages dans les offices et musées"],
  ["Ministère de la Sécurité et de la Protection civile", "« Sécurité routière, civisme et protection civile »", "Préparation aux concours ; formations aux premiers secours"],
  ["Ministère de l'Agriculture et de l'Élevage", "« Agriculture moderne et agro-industrie »", "Formations techniques ; kits agricoles ; stages dans les agropoles"],
  ["Ministère de la Santé et de l'Hygiène publique", "« Ma santé, mes gestes »", "Bourses en sciences de la santé ; stages dans les hôpitaux régionaux"],
  ["Ministère de la Défense nationale", "« L'armée et la Nation »", "Journées d'immersion ; préparation aux écoles militaires"],
  ["Ministère des Mines et de la Géologie", "« Simandou 2040 » (pilote)", "Formations Simandou Academy ; stages chez Simfer, WCS, CBG"],
  ["Ministère de l'Enseignement supérieur", "« Orientation et métiers d'avenir »", "Bourses d'excellence ; places dans les filières prioritaires"],
  ["Ministère de la Jeunesse et des Sports", "« Citoyenneté et engagement des jeunes »", "Volontariat, incubation de projets, équipements"],
  ["Ministère des Postes, Télécommunications et de l'Économie numérique", "« Citoyen numérique »", "Bourses de formation au code et au numérique ; stages chez les opérateurs"],
  ["Ministère de l'Environnement et du Développement durable", "« Protéger la Guinée, château d'eau de l'Afrique de l'Ouest »", "Stages dans les parcs et projets ; kits solaires"],
  ["Ministère de la Fonction publique", "« Connaître l'administration »", "Préparation aux concours de la fonction publique"],
 ], [5.6, 5.6, 5.8]),
 ("h1", "Annexe C · Sources"),
 ("sources", [
  ("DataReportal, Digital 2026 : Guinea (population, connexions mobiles, internautes, réseaux sociaux)", "https://datareportal.com/reports/digital-2026-guinea"),
  ("Africa24 / Observatoire national du travail : plus de 40 % des diplômés sans emploi (2025)", "https://africa24tv.com/guinee-plus-de-40-des-diplomes-restent-sans-emploi"),
  ("Agence Ecofin : la Guinée place les compétences locales au cœur de la vision Simandou 2040", "https://www.agenceecofin.com/actualites-services/0506-139029-la-guinee-place-les-competences-locales-au-c-ur-de-la-vision-simandou-2040"),
  ("Présidence de la République : Simandou Academy", "https://presidence.gov.gn/simandou-academy-la-guinee-sinspire-du-modele-marocain-pour-batir-lecole-de-lavenir-en-renforcant-le-capital-humain/"),
  ("MyGov Quiz (Inde) : plateforme des quiz des ministères", "https://quiz.mygov.in/"),
  ("DD News : record mondial MY Bharat, 390 812 participants en une semaine ; plus de 5 millions au total", "https://ddnews.gov.in/en/my-bharat-sets-guinness-world-record-for-largest-participation-in-online-quiz/"),
  ("UNESCO : Eneza Education (Kenya), 10 millions d'apprenants", "https://www.unesco.org/en/dtc-financing-toolkit/eneza-education"),
  ("Ministère de l'Éducation de Singapour : résultats de SkillsFuture (2025)", "https://www.moe.gov.sg/news/parliamentary-replies/20250925-career-impact-of-skillsfuture-credits-mid-career-training-allowance-and-level-up-programme"),
  ("Kahoot! : 14 milliards de participations", "https://kahoot.com/company/"),
  ("Cour suprême de Guinée : Loi L/2016/037/AN relative à la cybersécurité et à la protection des données à caractère personnel", "https://coursupreme.org.gn/en/loi-l-2016-037-an-relative-a-la-cybersecurite-et-la-protection-des-donnees-a-caractere-personnel/"),
  ("Pilote Government Quiz An 68", "https://theblackdude.github.io/Simandou-Quiz/"),
 ]),
]

# =====================================================================================
# Rendu Word
# =====================================================================================
def add_page_number(section):
    p = section.footer.paragraphs[0]
    r = p.add_run(); r.font.name = FONT; r.font.size = Pt(7.5); r.font.color.rgb = RGBColor(0x9A,0xA3,0xAE)
    for tag, text in (('begin', None), (None, 'PAGE'), ('end', None)):
        if tag:
            e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), tag); r._r.append(e)
        else:
            e = OxmlElement('w:instrText'); e.set(qn('xml:space'), 'preserve'); e.text = text; r._r.append(e)

def table(doc, headers, rows, widths, header_fill='2F6EA6', zebra=True, size=9):
    t = doc.add_table(rows=1, cols=len(headers)); light_borders(t); t.autofit = False; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for w, col in zip(widths, t.columns): col.width = Cm(w)
    for j, h in enumerate(headers):
        c = t.rows[0].cells[j]; c.width = Cm(widths[j]); shade(c, header_fill)
        p = c.paragraphs[0]; run(p, h, 8.5, True, WHITE); p.paragraph_format.space_before = Pt(3); p.paragraph_format.space_after = Pt(3)
    for i, row in enumerate(rows):
        cells = t.add_row().cells
        for j, v in enumerate(row):
            c = cells[j]; c.width = Cm(widths[j])
            if zebra and i % 2 == 1: shade(c, 'F3F7FA')
            p = c.paragraphs[0]; run(p, v, size, j == 0, BLUE if j == 0 else DARK)
            p.paragraph_format.space_before = Pt(2.5); p.paragraph_format.space_after = Pt(2.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def build_docx(path):
    doc = Document()
    st = doc.styles['Normal']; st.font.name = FONT; st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    sec = doc.sections[0]
    sec.page_height = Cm(29.7); sec.page_width = Cm(21.0)
    sec.left_margin = sec.right_margin = Cm(2.0); sec.top_margin = Cm(1.8); sec.bottom_margin = Cm(1.8)
    footer_text(sec, "Secrétariat Général du Gouvernement · Government Quiz Guinée · Note de proposition · Septembre 2026 · Page ")
    add_page_number(sec)

    # ---- Page de garde ----
    doc.add_picture(os.path.join(ROOT, "docs", "assets", "armoiries.png"), width=Cm(2.6))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER; doc.paragraphs[-1].paragraph_format.space_before = Pt(30)
    para(doc, "RÉPUBLIQUE DE GUINÉE", 10, True, BLUE, WD_ALIGN_PARAGRAPH.CENTER, before=6, after=0)
    para(doc, "Travail · Justice · Solidarité", 9, False, ORANGE, WD_ALIGN_PARAGRAPH.CENTER, after=6, italic=True)
    para(doc, "SECRÉTARIAT GÉNÉRAL DU GOUVERNEMENT", 10, True, DARK, WD_ALIGN_PARAGRAPH.CENTER, after=40)
    band(doc, [("NOTE DE PROPOSITION AU GOUVERNEMENT ET À LA PRÉSIDENCE DE LA RÉPUBLIQUE", 9, True, GOLD),
               ("GOVERNMENT QUIZ GUINÉE", 28, True, WHITE),
               ("Plateforme nationale de quiz éducatifs et d'opportunités pour la jeunesse", 12, False, RGBColor(0xE3,0xED,0xF3)),
               ("Apprendre · Se mesurer · Être récompensé", 10, True, GOLD)])
    para(doc, "« L'Indépendance en héritage · La jeunesse en marche · Simandou 2040 en ligne de mire »", 10, False, BLUE, WD_ALIGN_PARAGRAPH.CENTER, before=14, after=30, italic=True)
    t = doc.add_table(rows=1, cols=2); no_borders(t); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c, (lab, val) in zip(t.rows[0].cells, [("Budget demandé", f"{fmt(TOTAL)} GNF"), ("Capacité", "1 000 000 d'utilisateurs / mois")]):
        shade(c, 'EDF3F8'); p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p, lab.upper(), 8, True, GREY)
        p2 = c.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p2, val, 16, True, BLUE); p2.paragraph_format.space_after = Pt(8)
    para(doc, "", after=30)
    para(doc, "Pilote : Government Quiz, Semaine de l'Indépendance An 68 (25 septembre – 2 octobre 2026)", 9.5, False, DARK, WD_ALIGN_PARAGRAPH.CENTER, after=2)
    para(doc, "Conakry, septembre 2026", 9.5, True, DARK, WD_ALIGN_PARAGRAPH.CENTER, after=2)
    doc.add_page_break()

    # ---- Corps ----
    for bi, block in enumerate(CONTENT):
        kind = block[0]
        nxt = CONTENT[bi + 1][0] if bi + 1 < len(CONTENT) else ""
        keep = nxt in ("p", "h2", "bullets", "numbered", "callout", "kpis")
        if kind == "h1":
            p = para(doc, "", before=14, after=6); p.paragraph_format.keep_with_next = keep
            run(p, block[1].upper(), 12.5, True, BLUE)
            # filet doré
            pPr = p._p.get_or_add_pPr(); bdr = OxmlElement('w:pBdr'); b = OxmlElement('w:bottom')
            b.set(qn('w:val'), 'single'); b.set(qn('w:sz'), '8'); b.set(qn('w:color'), 'E8A858'); b.set(qn('w:space'), '2'); bdr.append(b); pPr.append(bdr)
        elif kind == "h2":
            p = para(doc, block[1], 10.5, True, ORANGE, before=8, after=3); p.paragraph_format.keep_with_next = keep
        elif kind == "p":
            p = para(doc, block[1], 10, after=6); p.paragraph_format.line_spacing = 1.15; p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        elif kind == "bullets":
            for it in block[1]:
                p = para(doc, "", after=3); p.paragraph_format.left_indent = Cm(0.6); p.paragraph_format.first_line_indent = Cm(-0.4)
                run(p, "•  ", 10, True, ORANGE); run(p, it, 10)
            para(doc, "", after=2)
        elif kind == "numbered":
            for i, it in enumerate(block[1], 1):
                p = para(doc, "", after=5); p.paragraph_format.left_indent = Cm(0.8); p.paragraph_format.first_line_indent = Cm(-0.6)
                run(p, f"{i}.  ", 10.5, True, BLUE); run(p, it, 10.5)
        elif kind == "callout":
            t = doc.add_table(rows=1, cols=1); no_borders(t); c = t.rows[0].cells[0]; shade(c, '2F6EA6')
            p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p, block[1], 10.5, True, WHITE, italic=True)
            p.paragraph_format.space_before = Pt(8); p.paragraph_format.space_after = Pt(8)
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif kind == "kv":
            t = doc.add_table(rows=0, cols=2); light_borders(t); t.autofit = False
            for w, col in zip((4.6, 12.4), t.columns): col.width = Cm(w)
            for lab, val in block[1]:
                r = t.add_row().cells; r[0].width = Cm(4.6); r[1].width = Cm(12.4); shade(r[0], 'EDF3F8')
                p = r[0].paragraphs[0]; run(p, lab, 9, True, BLUE); p2 = r[1].paragraphs[0]; run(p2, val, 9.5)
                for c in r: c.paragraphs[0].paragraph_format.space_before = Pt(3); c.paragraphs[0].paragraph_format.space_after = Pt(3)
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif kind == "kpis":
            t = doc.add_table(rows=1, cols=len(block[1])); no_borders(t); t.alignment = WD_TABLE_ALIGNMENT.CENTER
            for c, (v, lab) in zip(t.rows[0].cells, block[1]):
                shade(c, 'EDF3F8'); p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p, v, 15, True, BLUE)
                p.paragraph_format.space_before = Pt(6)
                p2 = c.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p2, lab, 8, False, GREY); p2.paragraph_format.space_after = Pt(6)
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif kind == "steps":
            t = doc.add_table(rows=1, cols=3); no_borders(t)
            for i, (c, (title, text)) in enumerate(zip(t.rows[0].cells, block[1]), 1):
                shade(c, 'EDF3F8'); p = c.paragraphs[0]; run(p, f"ÉTAPE {i}", 8, True, ORANGE); p.paragraph_format.space_before = Pt(5)
                p2 = c.add_paragraph(); run(p2, title, 10, True, BLUE); p2.paragraph_format.space_after = Pt(2)
                p3 = c.add_paragraph(); run(p3, text, 8.5, False, DARK); p3.paragraph_format.space_after = Pt(6)
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif kind == "table":
            table(doc, block[1], block[2], block[3])
        elif kind == "budget":
            rows = [[n, f"{lab}\n{desc}", fmt(amt)] for n, lab, desc, amt in block[1]]
            t = doc.add_table(rows=1, cols=3); light_borders(t); t.autofit = False; t.alignment = WD_TABLE_ALIGNMENT.CENTER
            widths = [1.0, 12.4, 3.6]
            for w, col in zip(widths, t.columns): col.width = Cm(w)
            for j, h in enumerate(["N°", "Poste", "Montant (GNF)"]):
                c = t.rows[0].cells[j]; c.width = Cm(widths[j]); shade(c, '2F6EA6'); p = c.paragraphs[0]
                if j == 2: p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                run(p, h, 8.5, True, WHITE); p.paragraph_format.space_before = Pt(3); p.paragraph_format.space_after = Pt(3)
            for n, lab, desc, amt in block[1]:
                cells = t.add_row().cells
                for j, c in enumerate(cells): c.width = Cm(widths[j])
                p = cells[0].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p, n, 9, True, BLUE)
                p = cells[1].paragraphs[0]; run(p, lab, 9.5, True, DARK); p2 = cells[1].add_paragraph(); run(p2, desc, 8.5, False, GREY); p2.paragraph_format.space_after = Pt(3)
                p = cells[2].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.RIGHT; run(p, fmt(amt), 9.5, True, DARK)
                for c in cells: c.paragraphs[0].paragraph_format.space_before = Pt(3)
            cells = t.add_row().cells
            for j, c in enumerate(cells): c.width = Cm(widths[j]); shade(c, 'E8A858')
            p = cells[1].paragraphs[0]; run(p, "TOTAL — construction et 12 mois d'exploitation", 10, True, DARK)
            p = cells[2].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.RIGHT; run(p, fmt(TOTAL), 11, True, DARK)
            for c in cells: c.paragraphs[0].paragraph_format.space_before = Pt(4); c.paragraphs[0].paragraph_format.space_after = Pt(4)
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif kind == "sources":
            for i, (lab, url) in enumerate(block[1], 1):
                p = para(doc, "", after=2); p.paragraph_format.left_indent = Cm(0.8); p.paragraph_format.first_line_indent = Cm(-0.6)
                run(p, f"{i}.  ", 8.5, True, BLUE); run(p, lab + " — ", 8.5); run(p, url, 8, False, GREY)
        elif kind == "pagebreak":
            doc.add_page_break()
    doc.save(path)

# =====================================================================================
# Rendu HTML (corps de page seulement ; le style est ajouté par l'appelant)
# =====================================================================================
def build_html_body():
    e = html.escape; out = []; nav = []; n = 0
    for block in CONTENT:
        k = block[0]
        if k == "h1":
            n += 1; nav.append((f"s{n}", block[1]))
            out.append(f'<h2 id="s{n}">{e(block[1])}</h2>')
        elif k == "h2": out.append(f"<h3>{e(block[1])}</h3>")
        elif k == "p": out.append(f"<p>{e(block[1])}</p>")
        elif k == "bullets": out.append("<ul>" + "".join(f"<li>{e(x)}</li>" for x in block[1]) + "</ul>")
        elif k == "numbered": out.append('<ol class="decisions">' + "".join(f"<li>{e(x)}</li>" for x in block[1]) + "</ol>")
        elif k == "callout": out.append(f'<div class="callout">{e(block[1])}</div>')
        elif k == "kv": out.append('<table class="kv">' + "".join(f"<tr><th>{e(a)}</th><td>{e(b)}</td></tr>" for a, b in block[1]) + "</table>")
        elif k == "kpis": out.append('<div class="kpis">' + "".join(f'<div class="kpi"><b>{e(v)}</b><span>{e(l)}</span></div>' for v, l in block[1]) + "</div>")
        elif k == "steps": out.append('<div class="steps">' + "".join(f'<div class="step"><small>Étape {i}</small><b>{e(t)}</b><p>{e(x)}</p></div>' for i, (t, x) in enumerate(block[1], 1)) + "</div>")
        elif k == "table":
            out.append('<div class="tw"><table><thead><tr>' + "".join(f"<th>{e(h)}</th>" for h in block[1]) + "</tr></thead><tbody>" +
                       "".join("<tr>" + "".join(f"<td>{e(c)}</td>" for c in r) + "</tr>" for r in block[2]) + "</tbody></table></div>")
        elif k == "budget":
            out.append('<div class="tw"><table class="budget"><thead><tr><th>N°</th><th>Poste</th><th class="num">Montant (GNF)</th></tr></thead><tbody>' +
                       "".join(f'<tr><td>{n}</td><td><b>{e(l)}</b><br><small>{e(d)}</small></td><td class="num">{fmt(a)}</td></tr>' for n, l, d, a in block[1]) +
                       f'<tr class="total"><td></td><td>Total — construction et 12 mois d\'exploitation</td><td class="num">{fmt(TOTAL)}</td></tr></tbody></table></div>')
        elif k == "sources": out.append("<ol class=\"sources\">" + "".join(f'<li>{e(l)} — <a href="{e(u)}">{e(u)}</a></li>' for l, u in block[1]) + "</ol>")
    return "\n".join(out), nav

if __name__ == "__main__":
    path = os.path.join(OUT_DIR, BASENAME + ".docx")
    build_docx(path); print("✓", os.path.basename(path))
    if "--no-pdf" not in sys.argv:
        pdf = to_pdf(path); print("✓", os.path.basename(pdf) if pdf else "PDF non généré")
    if "--html" in sys.argv:
        body, nav = build_html_body()
        json.dump({"body": body, "nav": nav}, open(os.path.join(HERE, "proposal_body.json"), "w", encoding="utf-8"), ensure_ascii=False); print("✓ proposal_body.json")
