# -*- coding: utf-8 -*-
"""Registre des modules du Government Quiz. Chaque module : ses questions + ses textes (accueil, rail, certificat)."""
from questions import SECTIONS as SIMANDOU
from questions_histoire import SECTIONS as HISTOIRE

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
]

def as_data(q):
    """Version JSON-able (sans les documents) pour le site."""
    d = {k: v for k, v in q.items() if k not in ("sections", "doc")}
    d["sections"] = [{"letter": l, "title": t, "questions": [{"q": qq, "opts": o, "a": a, "e": e} for qq, o, a, e in qs]} for l, t, qs in q["sections"]]
    return d
