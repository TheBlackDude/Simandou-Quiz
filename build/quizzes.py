# -*- coding: utf-8 -*-
"""Registre des modules du Gouvernement QCM. Chaque module : ses questions + ses textes (accueil, rail, certificat)."""
from questions import SECTIONS as SIMANDOU
from questions_histoire import SECTIONS as HISTOIRE
from questions_armee import SECTIONS as ARMEE
from questions_cnrd import SECTIONS as CNRD
from questions_sgg import SECTIONS as SGG

TAGLINE = ["L'Indépendance en héritage", "La jeunesse en marche", "Simandou 2040 en ligne de mire"]

QUIZZES = [
 {
  "id": "simandou",
  "title": "Quiz Simandou",
  "short": "Le gisement, ses partenaires, le chemin de fer transguinéen et le Programme Simandou 2040.",
  "desc": "Quarante questions pour tester ce que vous savez du gisement, de ses partenaires, du chemin de fer transguinéen, du port de Morebaya et du Programme Simandou 2040 qui doit transformer la Guinée d'ici quinze ans.",
  "rail": {"from": "Simandou", "to": "Port de Morebaya", "total": 600, "unit": "km parcourus"},
  "levels": {"or": "Expert Simandou", "argent": "Bâtisseur de Simandou 2040", "bronze": "Ambassadeur de Simandou"},
  "mentions": [
   [0.9, "Expert Simandou", "Vous maîtrisez le projet et le programme Simandou 2040."],
   [0.7, "Bâtisseur", "Une solide connaissance du plus grand projet de la Guinée."],
   [0.5, "Citoyen éclairé", "Les grandes lignes sont acquises ; quelques détails à revoir."],
   [0.0, "À approfondir", "Relisez les explications : Simandou n'aura plus de secret pour vous."]],
  "cert": {"subtitle": "Quiz Simandou · Semaine de l'Indépendance · An 68",
           "about": "du Quiz Simandou, portant sur le gisement, ses partenaires, le chemin de fer transguinéen, le port de Morebaya et le Programme Simandou 2040",
           "prefix": "SIM68", "logo": "simandou2040", "logoText": "De 1958 à la Guinée de 2040"},
  "tag": "",  # suffixe ajouté au mode dans le classement (vide : lignes historiques sans module)
  "doc": {"file": "Quiz Simandou An 68", "band": "QUIZ SIMANDOU",
          "sub": "De l'indépendance de 1958 à la Guinée de Simandou 2040",
          "quote": "« S'inspirer du passé pour construire ensemble l'avenir : NOTRE JEUNESSE »",
          "footer": "Semaine de l'Indépendance · An 68 · République de Guinée · Quiz Simandou",
          "sources": "Sources : Rio Tinto (résultats T1 2026), Winning Consortium Simandou, Présidence de la République de Guinée, Africa24, Agence Ecofin, Africaguinee (programme Simandou 2040, oct. 2025)."},
  "sections": SIMANDOU,
 },
 {
  "id": "histoire",
  "title": "Quiz Histoire de la Guinée",
  "short": "Le « Non » de 1958, les pères de l'indépendance, les grandes figures, les gouvernements et l'armée.",
  "desc": "Quarante questions sur le « Non » du 28 septembre 1958, les pères de l'indépendance, les grandes figures de 1950 à 2000, les réalisations durables des gouvernements successifs et le rôle de l'armée dans l'histoire nationale.",
  "rail": {"from": "2 octobre 1958", "to": "Guinée 2026", "total": 68, "unit": "années d'histoire parcourues"},
  "levels": {"or": "Gardien de la mémoire nationale", "argent": "Héritier de l'Indépendance", "bronze": "Ambassadeur de l'Indépendance"},
  "mentions": [
   [0.9, "Gardien de la mémoire", "Vous maîtrisez l'histoire de la Guinée indépendante."],
   [0.7, "Héritier de 1958", "Une solide connaissance de l'histoire nationale."],
   [0.5, "Citoyen éclairé", "Les grandes étapes sont acquises ; quelques dates à revoir."],
   [0.0, "À approfondir", "Relisez les explications : l'histoire de la Guinée n'aura plus de secret pour vous."]],
  "cert": {"subtitle": "Quiz Histoire de la Guinée · Semaine de l'Indépendance · An 68",
           "about": "du Quiz Histoire de la Guinée, portant sur l'indépendance de 1958, ses acteurs, les grandes figures nationales, les réalisations des gouvernements successifs et le rôle de l'armée",
           "prefix": "HIS68", "logo": "drapeau", "logoText": "1958 – 2026 · An 68 de l'Indépendance"},
  "tag": "Histoire",
  "doc": {"file": "Quiz Histoire de la Guinee An 68", "band": "QUIZ HISTOIRE DE LA GUINÉE",
          "sub": "Du « Non » du 28 septembre 1958 à la Guinée d'aujourd'hui",
          "quote": "« " + " · ".join(TAGLINE) + " »",
          "footer": "Semaine de l'Indépendance · An 68 · République de Guinée · Quiz Histoire de la Guinée",
          "sources": "Sources : André Lewin, Ahmed Sékou Touré (webguinee.net) ; Cour suprême de Guinée (Loi fondamentale du 23 décembre 1990) ; UGANC ; CBG ; Xinhua (centrale de Kinkon, 2026) ; Le Lynx ; Guinée360 ; AGP ; Financial Afrik ; Wikipédia."},
  "sections": HISTOIRE,
 },
 {
  "id": "armee",
  "title": "Quiz Armée et Gendarmerie",
  "short": "Des résistants à l'armée nationale, la Gendarmerie, les unités et leurs spécialités, les missions de paix et l'Armée-Nation.",
  "desc": "Quarante questions sur les résistants qui ont précédé l'armée nationale, sa naissance le 1er novembre 1958, ses premiers généraux, la Gendarmerie nationale, les unités et leurs spécialités, les missions extérieures depuis 1960 et le rôle de l'armée dans le développement de la Guinée.",
  "rail": {"from": "Kindia, 1er novembre 1958", "to": "Armée-Nation 2026", "total": 68, "unit": "années sous le drapeau"},
  "levels": {"or": "Gardien de la Nation", "argent": "Sentinelle de la République", "bronze": "Ambassadeur des Forces armées"},
  "mentions": [
   [0.9, "Gardien de la Nation", "Vous maîtrisez l'histoire et l'organisation des forces de défense et de sécurité."],
   [0.7, "Sentinelle", "Une solide connaissance de l'armée et de la gendarmerie guinéennes."],
   [0.5, "Citoyen éclairé", "Les grandes lignes sont acquises ; quelques unités et dates à revoir."],
   [0.0, "À approfondir", "Relisez les explications : l'armée guinéenne n'aura plus de secret pour vous."]],
  "cert": {"subtitle": "Quiz Armée et Gendarmerie · Semaine de l'Indépendance · An 68",
           "about": "du Quiz Armée et Gendarmerie nationale, portant sur les résistants, la naissance de l'armée nationale, ses grandes figures, la Gendarmerie nationale, les unités et spécialités, les missions extérieures et le rôle de l'armée dans le développement",
           "prefix": "ARM68", "logo": "armoiries", "logoText": "Forces armées et Gendarmerie · 1958 – 2026"},
  "tag": "Armée",
  "doc": {"file": "Quiz Armee et Gendarmerie An 68", "band": "QUIZ ARMÉE ET GENDARMERIE",
          "sub": "Des résistants de 1882 aux forces de défense et de sécurité d'aujourd'hui",
          "quote": "« " + " · ".join(TAGLINE) + " »",
          "footer": "Semaine de l'Indépendance · An 68 · République de Guinée · Quiz Armée et Gendarmerie",
          "sources": "Sources : DIRPA / Guineenews (« L'armée guinéenne : sa création, ses mutations, ses campagnes », 2018) ; Guinée360 ; Le Djely ; Présidence de la République ; Nations unies (MINUSMA, MINUSCA) ; France 24 ; Jeune Afrique ; Wikipédia (Forces armées de la Guinée, Gendarmerie nationale guinéenne)."},
  "sections": ARMEE,
 },
 {
  "id": "cnrd",
  "title": "Quiz Bilan du CNRD 2021-2026",
  "short": "Cinq ans de refondation : institutions, économie, grands chantiers, capital humain et gouvernance depuis le 5 septembre 2021.",
  "desc": "Quarante questions sur ce que la Guinée a accompli depuis le 5 septembre 2021 : le retour à l'ordre constitutionnel et les nouvelles institutions, la croissance, les finances publiques et la souveraineté minière, les routes, ponts, barrages et infrastructures numériques, les progrès sociaux et la réforme de l'État.",
  "rail": {"from": "5 septembre 2021", "to": "Guinée 2026", "total": 60, "unit": "mois de refondation parcourus"},
  "levels": {"or": "Bâtisseur de la refondation", "argent": "Acteur de la refondation", "bronze": "Ambassadeur de la refondation"},
  "mentions": [
   [0.9, "Bâtisseur de la refondation", "Vous maîtrisez le bilan de la Guinée depuis 2021, chiffres et dates à l'appui."],
   [0.7, "Acteur de la refondation", "Une solide connaissance des réalisations de ces cinq années."],
   [0.5, "Citoyen éclairé", "Les grandes réalisations sont acquises ; quelques chiffres à revoir."],
   [0.0, "À approfondir", "Relisez les explications : le bilan 2021-2026 n'aura plus de secret pour vous."]],
  "cert": {"subtitle": "Quiz Bilan du CNRD 2021-2026 · Semaine de l'Indépendance · An 68",
           "about": "du Quiz Bilan du CNRD 2021-2026, portant sur la refondation de l'État, le retour à l'ordre constitutionnel, l'économie et les finances publiques, les grands chantiers d'infrastructures, le capital humain et la bonne gouvernance",
           "prefix": "CNRD68", "logo": "armoiries", "logoText": "République de Guinée · 2021 – 2026"},
  "tag": "CNRD",
  "doc": {"file": "Quiz Bilan du CNRD 2021-2026 An 68", "band": "QUIZ BILAN DU CNRD 2021-2026",
          "sub": "Du 5 septembre 2021 à la Cinquième République : cinq ans de refondation",
          "quote": "« " + " · ".join(TAGLINE) + " »",
          "footer": "Semaine de l'Indépendance · An 68 · République de Guinée · Quiz Bilan du CNRD 2021-2026",
          "sources": "Sources : Présidence de la République ; Primature ; CNT ; ministères (Économie et Finances, Budget, Plan, Mines, Énergie, Infrastructures, Fonction publique, Santé, Éducation) ; INS (RGPH-4) ; BCRG ; FMI ; Banque mondiale ; S&P Global ; Rio Tinto ; Guineenews ; Guinée360 ; Le Djely ; Africaguinee ; Jeune Afrique ; Financial Afrik ; Agence Ecofin ; Wikipédia."},
  "sections": CNRD,
 },
 {
  "id": "sgg",
  "title": "Quiz Secrétariat général du Gouvernement",
  "short": "Missions, grandes figures, réformes et grands rendez-vous du SGG, colonne vertébrale de l'action gouvernementale.",
  "desc": "Quarante questions sur le Secrétariat général du Gouvernement : ses missions et son organisation, les femmes et les hommes qui l'ont dirigé, ses réformes et innovations depuis 2021, le Forum international des SGG et la Semaine nationale des archives de la Guinée.",
  "rail": {"from": "Conseil des ministres", "to": "Journal officiel", "total": 20, "unit": "missions du SGG accomplies"},
  "levels": {"or": "Gardien de la continuité de l'État", "argent": "Haut cadre du travail gouvernemental", "bronze": "Ambassadeur du SGG"},
  "mentions": [
   [0.9, "Gardien de la continuité", "Vous maîtrisez le rôle, l'histoire et les réformes du Secrétariat général du Gouvernement."],
   [0.7, "Haut cadre", "Une solide connaissance du travail gouvernemental et de son coordonnateur."],
   [0.5, "Citoyen éclairé", "Les grandes lignes sont acquises ; quelques dates et noms à revoir."],
   [0.0, "À approfondir", "Relisez les explications : le SGG n'aura plus de secret pour vous."]],
  "cert": {"subtitle": "Quiz Secrétariat général du Gouvernement · Semaine de l'Indépendance · An 68",
           "about": "du Quiz Secrétariat général du Gouvernement, portant sur les missions et l'organisation du SGG, ses dirigeants successifs, ses réformes et innovations, le Forum international des SGG et la Semaine nationale des archives",
           "prefix": "SGG68", "logo": "armoiries", "logoText": "Secrétariat général du Gouvernement"},
  "tag": "SGG",
  "doc": {"file": "Quiz SGG An 68", "band": "QUIZ SECRÉTARIAT GÉNÉRAL DU GOUVERNEMENT",
          "sub": "Missions, grandes figures, réformes et grands rendez-vous du SGG",
          "quote": "« " + " · ".join(TAGLINE) + " »",
          "footer": "Semaine de l'Indépendance · An 68 · République de Guinée · Quiz Secrétariat général du Gouvernement",
          "sources": "Sources : sgg.gov.gn ; journal-officiel.sgg.gov.gn (Journal officiel n° 2022-02, 2022-05 et 2026-15) ; senag.gov.gn ; gouvernement.gov.gn ; primature.gov.gn ; GuinéeLex ; Guineenews ; Guinée360 ; Le Djely ; Mosaiqueguinee ; Wikipédia."},
  "sections": SGG,
 },
]

def as_data(q):
    """Version JSON-able (sans les documents) pour le site."""
    d = {k: v for k, v in q.items() if k not in ("sections", "doc")}
    d["sections"] = [{"letter": l, "title": t, "questions": [{"q": qq, "opts": o, "a": a, "e": e} for qq, o, a, e in qs]} for l, t, qs in q["sections"]]
    return d
