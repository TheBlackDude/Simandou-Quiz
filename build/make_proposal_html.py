# -*- coding: utf-8 -*-
"""Version web de la note de proposition (même contenu que le Word), pour publication en artifact."""
import os, json, base64, html, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "proposition", "proposition-government-quiz.html")
d = json.load(open(os.path.join(HERE, "proposal_body.json"), encoding="utf-8"))
arm = "data:image/png;base64," + base64.b64encode(open(os.path.join(ROOT, "docs", "assets", "armoiries.png"), "rb").read()).decode()
nav = "".join(f'<a href="#{i}">{html.escape(t)}</a>' for i, t in d["nav"])

page = f"""<title>Government Quiz Guinée</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700&family=Literata:opsz,wght@7..72,400;7..72,600&display=swap">
<style>
:root{{
  --bg:#F6F7F9; --paper:#FFFFFF; --ink:#141A26; --muted:#66707F; --line:#DEE4EB; --sand:#EDF3F8;
  --blue:#2A6396; --blue-ink:#2A6396; --orange:#E8A858; --orange-ink:#B8721B; --band:#2F6EA6; --band-fg:#FFFFFF; --band-sub:#D6E6F2;
  --zebra:#F3F7FA; --shadow:0 1px 2px rgba(20,26,38,.06);
}}
@media (prefers-color-scheme: dark){{
  :root:not([data-theme="light"]){{
    --bg:#0E1A28; --paper:#142335; --ink:#EEF3F8; --muted:#A3B2C3; --line:#2A4258; --sand:#1B2C3F;
    --blue-ink:#8FC1EA; --orange-ink:#F0BF7F; --band:#1D4A75; --band-sub:#B7CFE6; --zebra:#182A3E; --shadow:none;
  }}
}}
:root[data-theme="dark"]{{
  --bg:#0E1A28; --paper:#142335; --ink:#EEF3F8; --muted:#A3B2C3; --line:#2A4258; --sand:#1B2C3F;
  --blue-ink:#8FC1EA; --orange-ink:#F0BF7F; --band:#1D4A75; --band-sub:#B7CFE6; --zebra:#182A3E; --shadow:none;
}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:Literata,Georgia,"Times New Roman",serif;font-size:16.5px;line-height:1.6;-webkit-font-smoothing:antialiased}}
h1,h2,h3,.j{{font-family:Jost,"Century Gothic","Avenir Next",sans-serif}}
.band{{background:var(--band);color:var(--band-fg);padding:34px 20px 30px;text-align:center}}
.band img{{width:70px;height:auto;display:block;margin:0 auto 10px}}
.band .rep{{font-family:Jost,sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--orange);font-weight:600}}
.band .motto{{font-size:12.5px;color:var(--band-sub);font-style:italic}}
.band .sgg{{font-family:Jost,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin-top:14px;font-weight:600}}
.band .kind{{font-family:Jost,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--orange);margin-top:22px;font-weight:600}}
.band h1{{font-size:clamp(30px,5.5vw,46px);margin:6px 0 4px;letter-spacing:.02em;font-weight:700;text-wrap:balance;line-height:1.05}}
.band .sub{{font-size:17px;color:var(--band-sub);max-width:36em;margin:0 auto;text-wrap:balance}}
.band .claim{{font-family:Jost,sans-serif;font-weight:600;color:var(--orange);margin-top:10px;font-size:15px;letter-spacing:.04em}}
.band .facts{{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:22px}}
.band .fact{{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:10px 18px;min-width:180px}}
.band .fact small{{display:block;font-family:Jost,sans-serif;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--band-sub)}}
.band .fact b{{font-family:Jost,sans-serif;font-size:22px;font-variant-numeric:tabular-nums}}
.tag{{font-style:italic;color:var(--band-sub);font-size:14px;margin-top:18px}}
.wrap{{max-width:1120px;margin:0 auto;padding:28px 18px 70px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:36px}}
nav{{position:sticky;top:18px;align-self:start;display:flex;flex-direction:column;gap:2px;font-family:Jost,sans-serif;font-size:13px;line-height:1.35}}
nav .t{{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:0 0 6px 10px}}
nav a{{color:var(--muted);text-decoration:none;padding:5px 10px;border-left:2px solid var(--line);border-radius:0 4px 4px 0}}
nav a:hover,nav a:focus-visible{{color:var(--blue-ink);border-left-color:var(--orange);background:var(--sand);outline:none}}
article{{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:38px 44px 44px;box-shadow:var(--shadow);min-width:0}}
article h2{{font-size:20px;color:var(--blue-ink);margin:38px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--orange);letter-spacing:.02em;text-transform:uppercase;text-wrap:balance;scroll-margin-top:20px}}
article h2:first-child{{margin-top:0}}
article h3{{font-size:16.5px;color:var(--orange-ink);margin:24px 0 8px}}
article p{{margin:0 0 14px;max-width:70ch}}
article ul,article ol{{padding-left:1.3em;margin:0 0 14px;max-width:70ch}}
article li{{margin:0 0 7px}}
article ul li::marker{{color:var(--orange)}}
ol.decisions{{counter-reset:d;list-style:none;padding:0}}
ol.decisions li{{counter-increment:d;display:grid;grid-template-columns:38px 1fr;gap:12px;align-items:start;padding:12px 0;border-top:1px solid var(--line);font-size:17px}}
ol.decisions li::before{{content:counter(d);font-family:Jost,sans-serif;font-weight:700;color:var(--band-fg);background:var(--band);width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:14px}}
.callout{{background:var(--band);color:var(--band-fg);padding:16px 22px;border-radius:6px;font-family:Jost,sans-serif;font-weight:600;font-size:17px;line-height:1.45;margin:6px 0 18px;text-wrap:balance}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:6px 0 18px}}
.kpi{{background:var(--sand);border-radius:6px;padding:14px 12px;text-align:center}}
.kpi b{{display:block;font-family:Jost,sans-serif;font-size:24px;color:var(--blue-ink);font-variant-numeric:tabular-nums;line-height:1.1}}
.kpi span{{display:block;font-family:Jost,sans-serif;font-size:12px;color:var(--muted);margin-top:6px;line-height:1.3}}
.steps{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:4px 0 16px}}
.step{{background:var(--sand);border-radius:6px;padding:14px 16px}}
.step small{{font-family:Jost,sans-serif;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--orange-ink);font-weight:600}}
.step b{{display:block;font-family:Jost,sans-serif;font-size:16px;color:var(--blue-ink);margin:4px 0 6px}}
.step p{{font-size:14px;margin:0;color:var(--ink)}}
table.kv{{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:15px}}
table.kv th{{text-align:left;width:11em;font-family:Jost,sans-serif;font-weight:600;color:var(--blue-ink);background:var(--sand);padding:9px 12px;vertical-align:top;border-bottom:1px solid var(--paper)}}
table.kv td{{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}}
.tw{{overflow-x:auto;margin:4px 0 16px}}
.tw table{{width:100%;border-collapse:collapse;font-size:14.5px;min-width:560px}}
.tw th{{font-family:Jost,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;text-align:left;background:var(--band);color:var(--band-fg);padding:9px 11px;font-weight:600}}
.tw td{{padding:9px 11px;border-bottom:1px solid var(--line);vertical-align:top}}
.tw tbody tr:nth-child(even) td{{background:var(--zebra)}}
.tw td:first-child{{font-family:Jost,sans-serif;font-weight:600;color:var(--blue-ink)}}
.tw th.num,.tw td.num{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
table.budget td:first-child{{text-align:center;width:3em}}
table.budget td small{{color:var(--muted);font-size:13px}}
table.budget tr.total td{{background:var(--orange) !important;color:#141A26;font-family:Jost,sans-serif;font-weight:700;font-size:16px}}
ol.sources{{font-size:13.5px;color:var(--muted)}}
ol.sources a{{color:var(--blue-ink);word-break:break-all}}
.foot{{grid-column:1/-1;text-align:center;font-family:Jost,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:20px}}
@media (max-width:900px){{.wrap{{grid-template-columns:1fr;gap:18px}}nav{{position:static;flex-direction:row;flex-wrap:wrap;gap:6px}}nav .t{{display:none}}nav a{{border:1px solid var(--line);border-radius:999px;padding:5px 11px}}article{{padding:24px 18px 30px}}}}
@media (prefers-reduced-motion:no-preference){{html{{scroll-behavior:smooth}}}}
</style>
<header class="band">
  <img src="{arm}" alt="Armoiries de la République de Guinée">
  <div class="rep">République de Guinée</div>
  <div class="motto">Travail · Justice · Solidarité</div>
  <div class="sgg">Secrétariat Général du Gouvernement</div>
  <div class="kind">Note de proposition au Gouvernement et à la Présidence de la République</div>
  <h1>Government Quiz Guinée</h1>
  <p class="sub">Plateforme nationale de quiz éducatifs et d'opportunités pour la jeunesse</p>
  <div class="claim">Apprendre · Se mesurer · Être récompensé</div>
  <div class="facts">
    <div class="fact"><small>Budget demandé</small><b>400 000 000 GNF</b></div>
    <div class="fact"><small>Capacité</small><b>1 000 000 utilisateurs / mois</b></div>
    <div class="fact"><small>Délai</small><b>Déployée en 1 mois</b></div>
  </div>
  <div class="tag">« L'Indépendance en héritage · La jeunesse en marche · Simandou 2040 en ligne de mire » — Conakry, septembre 2026</div>
</header>
<main class="wrap">
  <nav aria-label="Sommaire"><div class="t">Sommaire</div>{nav}</nav>
  <article>
{d["body"]}
  </article>
  <div class="foot">Secrétariat Général du Gouvernement · Government Quiz Guinée · Note de proposition · Septembre 2026</div>
</main>
"""
open(OUT, "w", encoding="utf-8").write(page); print("✓", OUT, len(page) // 1024, "Ko")
