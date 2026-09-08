# -*- coding: utf-8 -*-
"""Génère docs/js/questions.js (site statique) et quiz-simandou.html (fichier unique autonome)."""
import json, base64, re, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); DOCS = os.path.join(ROOT, "docs")
from questions import SECTIONS
data = [{"letter": l, "title": t, "questions": [{"q": q, "opts": o, "a": a, "e": e} for q, o, a, e in qs]} for l, t, qs in SECTIONS]
js = "/* Généré par build/build_site.py — modifier build/questions.py puis relancer. */\nwindow.QUIZ_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
open(os.path.join(DOCS, "js", "questions.js"), "w", encoding="utf-8").write(js)

# --- fichier unique (artifact / e-mail) ---
def b64(p): return "data:image/png;base64," + base64.b64encode(open(os.path.join(DOCS, p), "rb").read()).decode()
assets = {"armoiries": b64("assets/armoiries.png"), "simandou2040": b64("assets/simandou2040.png")}
html = open(os.path.join(DOCS, "index.html"), encoding="utf-8").read()
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = body.replace('src="assets/armoiries.png"', 'src="' + assets["armoiries"] + '"').replace('src="assets/simandou2040.png"', 'src="' + assets["simandou2040"] + '"')
body = re.sub(r'<script src="js/questions.js"></script>\s*<script src="js/app.js"></script>', "", body)
css = open(os.path.join(DOCS, "css", "style.css"), encoding="utf-8").read()
app = open(os.path.join(DOCS, "js", "app.js"), encoding="utf-8").read()
single = ('<title>Quiz Simandou</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap">\n'
          '<style>\n' + css + '\n</style>\n' + body.strip() + '\n<script>\n' + js + 'window.QUIZ_ASSETS = ' + json.dumps(assets) + ';\n' + app + '\n</script>\n')
open(os.path.join(ROOT, "quiz-simandou.html"), "w", encoding="utf-8").write(single)
print("docs/js/questions.js et quiz-simandou.html générés —", len(data), "sections,", sum(len(s["questions"]) for s in data), "questions")
