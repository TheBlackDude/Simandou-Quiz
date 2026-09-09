# -*- coding: utf-8 -*-
"""Génère docs/js/questions.js (site statique) et government-quiz.html (fichier unique autonome)."""
import json, base64, re, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); DOCS = os.path.join(ROOT, "docs")
from quizzes import QUIZZES, TAGLINE, as_data
data = [as_data(q) for q in QUIZZES]
for q in data:
    assert len(q["sections"]) == 4 and all(len(s["questions"]) == 10 for s in q["sections"]), q["id"]
    for s in q["sections"]:
        for x in s["questions"]:
            assert len(x["opts"]) == 4 and 0 <= x["a"] < 4, (q["id"], x["q"])
js = ("/* Généré par build/build_site.py — modifier build/questions*.py ou build/quizzes.py puis relancer. */\n"
      "window.QUIZ_TAGLINE = " + json.dumps(TAGLINE, ensure_ascii=False) + ";\n"
      "window.QUIZZES = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
open(os.path.join(DOCS, "js", "questions.js"), "w", encoding="utf-8").write(js)

# --- fichier unique (artifact / e-mail / WhatsApp) ---
def b64(p): return "data:image/png;base64," + base64.b64encode(open(os.path.join(DOCS, p), "rb").read()).decode()
assets = {k: b64("assets/" + k + ".png") for k in ("armoiries", "simandou2040", "drapeau")}
html = open(os.path.join(DOCS, "index.html"), encoding="utf-8").read()
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
for k, v in assets.items(): body = body.replace('src="assets/' + k + '.png"', 'src="' + v + '"')
body = re.sub(r'(<script src="js/[a-z]+\.js"></script>\s*)+', "", body)
css = open(os.path.join(DOCS, "css", "style.css"), encoding="utf-8").read()
app = open(os.path.join(DOCS, "js", "config.js"), encoding="utf-8").read() + "\n" + open(os.path.join(DOCS, "js", "app.js"), encoding="utf-8").read()
single = ('<title>Gouvernement QCM</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap">\n'
          '<style>\n' + css + '\n</style>\n' + body.strip() + '\n<script>\n' + js + 'window.QUIZ_ASSETS = ' + json.dumps(assets) + ';\n' + app + '\n</script>\n')
open(os.path.join(ROOT, "government-quiz.html"), "w", encoding="utf-8").write(single)
print("docs/js/questions.js et government-quiz.html générés —", ", ".join(q["id"] + " : " + str(sum(len(s["questions"]) for s in q["sections"])) + " questions" for q in data))
