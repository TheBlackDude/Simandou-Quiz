/* Quiz Simandou — logique de l'application (aucune dépendance) */
(function () {
  'use strict';
  const DATA = window.QUIZ_DATA;
  const ASSETS = window.QUIZ_ASSETS || { armoiries: 'assets/armoiries.png', simandou2040: 'assets/simandou2040.png' };
  const RAIL_KM = 600;
  // Niveaux de certificat (part de bonnes réponses sur le quiz complet)
  const LEVELS = [
    { key: 'or',     label: 'Or',     min: 0.95, title: 'Expert Simandou' },
    { key: 'argent', label: 'Argent', min: 0.88, title: 'Bâtisseur de Simandou 2040' },
    { key: 'bronze', label: 'Bronze', min: 0.80, title: 'Ambassadeur de Simandou' },
  ];
  const ALL = [];
  DATA.forEach((s, si) => s.questions.forEach(q => ALL.push(Object.assign({}, q, { sec: si, n: ALL.length + 1 }))));
  const app = document.getElementById('app'), rail = document.getElementById('rail'), certRoot = document.getElementById('certRoot');
  let queue = [], idx = 0, answers = {}, scope = 'all';

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad = n => String(n).padStart(2, '0');
  const store = { get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function levelFor(ratio) { return LEVELS.find(l => ratio >= l.min - 1e-9) || null; }
  function mention(p) {
    if (p >= .9) return ['Expert Simandou', 'Vous maîtrisez le projet et le programme Simandou 2040.'];
    if (p >= .7) return ['Bâtisseur', 'Une solide connaissance du plus grand projet de la Guinée.'];
    if (p >= .5) return ['Citoyen éclairé', 'Les grandes lignes sont acquises ; quelques détails à revoir.'];
    return ['À approfondir', 'Relisez le corrigé : Simandou n\'aura plus de secret pour vous.'];
  }
  function setRail() {
    const total = queue.length, pct = total ? idx / total : 0;
    rail.hidden = false;
    document.getElementById('done').style.width = (pct * 100) + '%';
    document.getElementById('train').style.left = (pct * 100) + '%';
    document.getElementById('km').textContent = 'Question ' + Math.min(idx + 1, total) + ' / ' + total + ' · ' + Math.round(pct * RAIL_KM) + ' km parcourus sur ' + RAIL_KM;
  }

  function home() {
    rail.hidden = true;
    app.innerHTML = '<div class="card intro">' +
      '<div class="eyebrow">Questionnaire à choix multiples · ' + ALL.length + ' questions</div>' +
      '<p>Quarante questions pour tester ce que vous savez du gisement, de ses partenaires, du chemin de fer transguinéen, du port de Morebaya et du Programme Simandou 2040 qui doit transformer la Guinée d\'ici quinze ans.</p>' +
      '<p>Choisissez une section, ou lancez le quiz complet. Chaque question donne une explication immédiate.</p>' +
      '<div class="secs">' + DATA.map((s, i) => '<button class="sec" data-start="' + i + '"><span class="l">' + s.letter + '</span><span class="t">' + esc(s.title) + '</span><span class="n">' + s.questions.length + ' questions</span></button>').join('') + '</div>' +
      '<div class="row"><button class="btn" data-start="all">Lancer le quiz complet</button><button class="btn ghost" data-key>Voir le corrigé (animateur)</button></div>' +
      '<p class="rules">Une seule bonne réponse par question · 1 point par bonne réponse · Le rail progresse de Simandou vers Morebaya au fil des questions.</p>' +
      '<div class="levels">' + LEVELS.slice().reverse().map(l => '<div class="lv"><span class="medal ' + l.key + '"></span><span><b>Certificat ' + l.label + '</b> · à partir de ' + Math.round(l.min * 100) + ' % de bonnes réponses au quiz complet</span></div>').join('') + '</div>' +
      '</div>';
  }
  function start(sc) {
    scope = sc; queue = sc === 'all' ? ALL.slice() : ALL.filter(q => q.sec === sc);
    idx = 0; answers = {}; renderQ(); window.scrollTo({ top: 0 });
  }
  function renderQ() {
    const q = queue[idx], s = DATA[q.sec]; setRail();
    app.innerHTML = '<div class="card">' +
      '<div class="eyebrow"><b>' + s.letter + '</b>' + esc(s.title) + '</div>' +
      '<div class="qnum">Question ' + pad(q.n) + '</div>' +
      '<div class="q">' + esc(q.q) + '</div>' +
      '<div class="opts">' + q.opts.map((o, i) => '<button class="opt" data-answer="' + i + '"><span class="k">' + 'ABCD'[i] + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>' +
      '<div id="fb"></div>' +
      '<div class="row"><span class="score">Score : ' + Object.values(answers).filter(Boolean).length + ' / ' + idx + '</span>' +
      '<span style="display:flex;gap:8px"><button class="btn ghost" data-home>Accueil</button><button class="btn" id="next" disabled data-next>' + (idx === queue.length - 1 ? 'Voir le résultat' : 'Question suivante') + '</button></span></div>' +
      '</div>';
  }
  function answer(i) {
    const q = queue[idx]; if (answers[q.n] !== undefined) return;
    const ok = i === q.a; answers[q.n] = ok;
    app.querySelectorAll('.opt').forEach((b, k) => { b.disabled = true; b.classList.add(k === q.a ? 'good' : k === i ? 'bad' : 'dim'); });
    document.getElementById('fb').innerHTML = '<div class="fb ' + (ok ? 'ok' : 'ko') + '"><strong>' + (ok ? 'Bonne réponse.' : 'Réponse : ' + 'ABCD'[q.a] + '. ' + esc(q.opts[q.a])) + '</strong>' + esc(q.e) + '</div>';
    const nx = document.getElementById('next'); nx.disabled = false; nx.focus();
  }
  function next() { idx++; if (idx >= queue.length) return results(); renderQ(); }

  function results() {
    idx = queue.length; setRail();
    const tot = queue.length, ok = queue.filter(q => answers[q.n]).length, ratio = ok / tot, m = mention(ratio);
    const rows = DATA.map((s, i) => {
      const qs = queue.filter(q => q.sec === i); if (!qs.length) return '';
      const k = qs.filter(q => answers[q.n]).length;
      return '<tr><td><b>' + s.letter + '</b> · ' + esc(s.title) + '<div class="bar"><i style="width:' + (k / qs.length * 100) + '%"></i></div></td><td class="num">' + k + ' / ' + qs.length + '</td></tr>';
    }).join('');
    const lvl = scope === 'all' ? levelFor(ratio) : null;
    let certHtml = '';
    if (lvl) {
      certHtml = '<div class="certbox"><span class="medal big ' + lvl.key + '"></span><div>' +
        '<h3>Certificat ' + lvl.label + ' · ' + lvl.title + '</h3>' +
        '<p>Vous avez obtenu ' + Math.round(ratio * 100) + ' % de bonnes réponses. Indiquez votre nom tel qu\'il doit figurer sur le certificat.</p>' +
        '<label for="certName">Nom et prénom(s)</label><input id="certName" type="text" maxlength="60" placeholder="Ex. : Mariama Camara" value="' + esc(store.get('quizName')) + '" autocomplete="name">' +
        '<button class="btn gold" data-cert>Afficher et imprimer le certificat</button></div></div>';
    } else if (scope === 'all') {
      certHtml = '<p class="note">Un certificat (Bronze, Argent ou Or) est délivré à partir de 80 % de bonnes réponses sur le quiz complet. Il vous manque ' + (Math.ceil(tot * 0.8) - ok) + ' bonne(s) réponse(s) : retentez votre chance.</p>';
    } else {
      certHtml = '<p class="note">Le certificat est délivré sur le quiz complet (40 questions), à partir de 80 % de bonnes réponses.</p>';
    }
    app.innerHTML = '<div class="card">' +
      '<div class="eyebrow">Résultat · ' + (scope === 'all' ? 'Quiz complet' : 'Section ' + DATA[scope].letter) + '</div>' +
      '<div class="big"><span class="n">' + ok + '</span><span class="d">/ ' + tot + '</span></div>' +
      '<div class="mention">' + m[0] + '<small>' + m[1] + '</small></div>' +
      certHtml +
      '<table><thead><tr><th>Section</th><th style="text-align:right">Score</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="row"><button class="btn" data-start="' + scope + '">Recommencer</button><span style="display:flex;gap:8px"><button class="btn ghost" data-home>Accueil</button><button class="btn ghost" data-key>Corrigé complet</button></span></div>' +
      '</div>';
    window.scrollTo({ top: 0 });
  }

  function showKey() {
    rail.hidden = true;
    app.innerHTML = '<div class="card"><div class="eyebrow">Corrigé commenté · réservé à l\'animateur</div><div class="key">' +
      DATA.map(s => '<h3>' + s.letter + ' · ' + esc(s.title) + '</h3>' + s.questions.map(q => {
        const n = ALL.find(x => x.q === q.q).n;
        return '<div class="it"><span class="n">' + pad(n) + '</span><span class="a">' + 'ABCD'[q.a] + '</span><div><div>' + esc(q.q) + '</div><div><b>' + esc(q.opts[q.a]) + '</b></div><div class="e">' + esc(q.e) + '</div></div></div>';
      }).join('')).join('') +
      '</div><div class="row"><button class="btn" data-home>Retour à l\'accueil</button></div></div>';
    window.scrollTo({ top: 0 });
  }

  /* ---------- Certificat ---------- */
  function certId(name, ok, date) {
    let h = 0; const s = name + '|' + ok + '|' + date;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 'SIM68-' + h.toString(16).toUpperCase().padStart(8, '0');
  }
  function openCert() {
    const input = document.getElementById('certName');
    const name = (input.value || '').trim();
    if (!name) { input.focus(); input.placeholder = 'Veuillez saisir votre nom'; return; }
    store.set('quizName', name);
    const tot = queue.length, ok = queue.filter(q => answers[q.n]).length, ratio = ok / tot, lvl = levelFor(ratio);
    const now = new Date();
    const dateFr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const id = certId(name, ok, now.toISOString().slice(0, 10));
    certRoot.innerHTML = '<div class="cert-overlay" role="dialog" aria-label="Certificat">' +
      '<div class="bar-top"><button class="btn gold" data-print>Imprimer / Enregistrer en PDF</button><button class="btn ghost" data-close>Fermer</button></div>' +
      '<div class="cert-stage" id="certStage"><div class="cert">' +
      '<div class="flagstrip"></div><div class="frame"></div><i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i>' +
      '<div class="inner">' +
      '<img class="arm" src="' + ASSETS.armoiries + '" alt="">' +
      '<div class="rep">République de Guinée</div><div class="motto">Travail · Justice · Solidarité</div>' +
      '<div class="title">CERTIFICAT DE RÉUSSITE</div>' +
      '<div class="subtitle">Quiz Simandou · Semaine de l\'Indépendance · An 68</div>' +
      '<div class="decerne">est décerné à</div>' +
      '<div class="name">' + esc(name) + '</div>' +
      '<div class="for">pour avoir répondu correctement à <b>' + ok + ' des ' + tot + ' questions</b> (' + Math.round(ratio * 100) + ' %) du Quiz Simandou, portant sur le gisement, ses partenaires, le chemin de fer transguinéen, le port de Morebaya et le Programme Simandou 2040.<br>Niveau atteint : <b>Certificat ' + lvl.label + ' · ' + lvl.title + '</b>.</div>' +
      '<div class="seal"><div class="medal ' + lvl.key + '">' + lvl.label + '</div><div><div class="lvl">Niveau ' + lvl.label + '</div><div class="pct">' + ok + ' / ' + tot + ' bonnes réponses · ' + Math.round(ratio * 100) + ' %</div></div></div>' +
      '<div class="bottom">' +
      '<div class="blk">Fait à Conakry<b>le ' + esc(dateFr) + '</b></div>' +
      '<div class="sig"><div class="ln"></div>Signature de l\'organisateur</div>' +
      '<div class="logo"><img src="' + ASSETS.simandou2040 + '" alt="Simandou 2040"><small>De 1958 à la Guinée de 2040</small></div>' +
      '</div>' +
      '<div class="id">Certificat n° ' + id + ' · Guinée 68 · Semaine de l\'Indépendance · 25 sept – 2 oct 2026</div>' +
      '</div></div></div></div>';
    fitCert(); window.addEventListener('resize', fitCert);
    document.body.style.overflow = 'hidden';
  }
  function fitCert() {
    const st = document.getElementById('certStage'); if (!st) return;
    const cert = st.querySelector('.cert');
    const w = cert.offsetWidth, h = cert.offsetHeight;
    const scale = Math.min(1, (window.innerWidth - 36) / w);
    cert.style.transform = 'scale(' + scale + ')';
    st.style.width = Math.round(w * scale) + 'px'; st.style.height = Math.round(h * scale) + 'px';
  }
  function closeCert() {
    certRoot.innerHTML = ''; document.body.style.overflow = '';
    window.removeEventListener('resize', fitCert);
  }
  function printCert() {
    document.body.classList.add('printing');
    const done = () => document.body.classList.remove('printing');
    window.addEventListener('afterprint', done, { once: true });
    setTimeout(() => { window.print(); setTimeout(done, 1500); }, 50);
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.start !== undefined) { const v = t.dataset.start; start(v === 'all' ? 'all' : +v); }
    else if (t.dataset.answer !== undefined) answer(+t.dataset.answer);
    else if (t.dataset.next !== undefined) next();
    else if (t.dataset.home !== undefined) home();
    else if (t.dataset.key !== undefined) showKey();
    else if (t.dataset.cert !== undefined) openCert();
    else if (t.dataset.print !== undefined) printCert();
    else if (t.dataset.close !== undefined) closeCert();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && certRoot.firstChild) closeCert();
    if (e.key === 'Enter' && e.target.id === 'certName') openCert();
  });
  home();
})();
