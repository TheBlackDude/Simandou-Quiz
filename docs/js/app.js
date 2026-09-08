/* Quiz Simandou — logique de l'application (aucune dépendance) */
(function () {
  'use strict';
  const DATA = window.QUIZ_DATA;
  const CFG = window.QUIZ_CONFIG || {};
  const ASSETS = window.QUIZ_ASSETS || { armoiries: 'assets/armoiries.png', simandou2040: 'assets/simandou2040.png' };
  const RAIL_KM = 600;
  const PASS = 0.80;            // seuil pour débloquer la section suivante
  const SHOW_FEEDBACK = true;   // false : ne pas révéler la bonne réponse après chaque question
  const BOARD_SIZE = 20;        // nombre de lignes affichées au classement
  // Niveaux de certificat (part de bonnes réponses sur 40)
  const LEVELS = [
    { key: 'or',     label: 'Or',     min: 0.95, title: 'Expert Simandou' },
    { key: 'argent', label: 'Argent', min: 0.875, title: 'Bâtisseur de Simandou 2040' },
    { key: 'bronze', label: 'Bronze', min: 0.80, title: 'Ambassadeur de Simandou' },
  ];
  const ALL = [];
  DATA.forEach((s, si) => s.questions.forEach(q => ALL.push(Object.assign({}, q, { sec: si, n: ALL.length + 1 }))));
  const app = document.getElementById('app'), rail = document.getElementById('rail'), certRoot = document.getElementById('certRoot');
  let queue = [], idx = 0, answers = {}, scope = 'all', player = '';
  let pendingCert = null; // { ok, tot }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad = n => String(n).padStart(2, '0');
  const store = { get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function loadProgress() { try { const p = JSON.parse(store.get('quizProgress') || '{}'); return { unlocked: p.unlocked || 0, best: p.best || {} }; } catch (e) { return { unlocked: 0, best: {} }; } }
  function saveProgress(p) { store.set('quizProgress', JSON.stringify(p)); }
  function levelFor(ratio) { return LEVELS.find(l => ratio >= l.min - 1e-9) || null; }
  function mention(p) {
    if (p >= .9) return ['Expert Simandou', 'Vous maîtrisez le projet et le programme Simandou 2040.'];
    if (p >= .7) return ['Bâtisseur', 'Une solide connaissance du plus grand projet de la Guinée.'];
    if (p >= .5) return ['Citoyen éclairé', 'Les grandes lignes sont acquises ; quelques détails à revoir.'];
    return ['À approfondir', 'Relisez les explications : Simandou n\'aura plus de secret pour vous.'];
  }
  function parcoursScore(prog) {
    if (DATA.some((s, i) => prog.best[i] === undefined)) return null;
    return { ok: DATA.reduce((sum, s, i) => sum + Math.round(prog.best[i] * s.questions.length), 0), tot: ALL.length };
  }
  function setRail() {
    const total = queue.length, pct = total ? idx / total : 0;
    rail.hidden = false;
    document.getElementById('done').style.width = (pct * 100) + '%';
    document.getElementById('train').style.left = (pct * 100) + '%';
    document.getElementById('km').textContent = 'Question ' + Math.min(idx + 1, total) + ' / ' + total + ' · ' + Math.round(pct * RAIL_KM) + ' km parcourus sur ' + RAIL_KM;
  }

  /* ---------- Classement ---------- */
  const Board = {
    key: 'quizLeaderboard',
    local() { try { return JSON.parse(store.get(this.key) || '[]'); } catch (e) { return []; } },
    saveLocal(list) { store.set(this.key, JSON.stringify(list.slice(0, 500))); },
    add(entry) {
      const list = this.local(); list.push(entry); this.saveLocal(list);
      if (CFG.leaderboardUrl) {
        fetch(CFG.leaderboardUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(entry) }).catch(() => {});
      }
    },
    async list() {
      let list = this.local(), shared = false;
      if (CFG.leaderboardUrl) {
        try { const r = await fetch(CFG.leaderboardUrl + (CFG.leaderboardUrl.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' }); const remote = await r.json(); if (Array.isArray(remote)) { list = remote; shared = true; } } catch (e) {}
      }
      return { rows: this.rank(list), shared: shared };
    },
    rank(list) {
      // meilleur résultat par participant (nom insensible à la casse), puis tri par score décroissant et date croissante
      const best = {};
      list.forEach(e => { if (!e || !e.name || !(e.tot > 0)) return; const k = e.name.trim().toLowerCase(); const pct = e.ok / e.tot;
        if (!best[k] || pct > best[k].ok / best[k].tot || (pct === best[k].ok / best[k].tot && e.date < best[k].date)) best[k] = e; });
      return Object.values(best).sort((a, b) => (b.ok / b.tot) - (a.ok / a.tot) || (a.date < b.date ? -1 : 1));
    }
  };
  function record(mode, ok, tot) {
    Board.add({ name: player || store.get('quizName') || 'Anonyme', ok: ok, tot: tot, mode: mode, date: new Date().toISOString() });
  }
  function boardTable(rows, shared) {
    if (!rows.length) return '<p class="note">Aucun score enregistré pour le moment. Soyez le premier au classement !</p>';
    const fmt = d => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
    return '<div class="tablewrap"><table class="board"><thead><tr><th>#</th><th>Participant</th><th class="num">Score</th><th>Niveau</th><th>Mode</th><th>Date</th></tr></thead><tbody>' +
      rows.slice(0, BOARD_SIZE).map((e, i) => { const lvl = levelFor(e.ok / e.tot); const me = player && e.name.trim().toLowerCase() === player.trim().toLowerCase();
        return '<tr' + (me ? ' class="me"' : '') + '><td class="rank">' + (i + 1) + '</td><td>' + esc(e.name) + '</td><td class="num"><b>' + e.ok + '</b> / ' + e.tot + ' <span class="pct">' + Math.round(e.ok / e.tot * 100) + ' %</span></td>' +
          '<td>' + (lvl ? '<span class="medal ' + lvl.key + '"></span> ' + lvl.label : '—') + '</td><td>' + esc(e.mode) + '</td><td>' + fmt(e.date) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">' + (shared ? 'Classement partagé entre tous les participants.' : 'Classement enregistré sur cet appareil.') + ' Meilleur résultat par participant.</p>';
  }
  async function fillBoard(id) {
    const el = document.getElementById(id); if (!el) return;
    const { rows, shared } = await Board.list();
    if (document.getElementById(id)) el.innerHTML = boardTable(rows, shared);
  }
  function showBoard() {
    rail.hidden = true;
    app.innerHTML = '<div class="card"><div class="eyebrow">Classement · Top ' + BOARD_SIZE + '</div><h2 class="h2">Les meilleurs scores</h2>' +
      '<div id="board"><p class="note">Chargement…</p></div>' +
      '<div class="row"><button class="btn" data-home>Retour à l\'accueil</button></div></div>';
    fillBoard('board'); window.scrollTo({ top: 0 });
  }

  /* ---------- Accueil ---------- */
  function certBox(ok, tot, intro) {
    const ratio = ok / tot, lvl = levelFor(ratio); if (!lvl) return '';
    pendingCert = { ok: ok, tot: tot };
    return '<div class="certbox"><span class="medal big ' + lvl.key + '"></span><div>' +
      '<h3>Certificat ' + lvl.label + ' · ' + lvl.title + '</h3>' +
      '<p>' + intro + ' Vérifiez votre nom tel qu\'il doit figurer sur le certificat.</p>' +
      '<label for="certName">Nom et prénom(s)</label><input id="certName" type="text" maxlength="60" placeholder="Ex. : Mariama Camara" value="' + esc(player || store.get('quizName')) + '" autocomplete="name">' +
      '<button class="btn gold" data-cert>Afficher et imprimer le certificat</button></div></div>';
  }
  function home() {
    rail.hidden = true;
    const prog = loadProgress();
    app.innerHTML = '<div class="card intro">' +
      '<div class="eyebrow">Questionnaire à choix multiples · ' + ALL.length + ' questions</div>' +
      '<p>Quarante questions pour tester ce que vous savez du gisement, de ses partenaires, du chemin de fer transguinéen, du port de Morebaya et du Programme Simandou 2040 qui doit transformer la Guinée d\'ici quinze ans.</p>' +
      '<div class="who"><label for="playerName">Votre nom et prénom(s) <small>affichés au classement et sur le certificat</small></label>' +
      '<input id="playerName" type="text" maxlength="60" placeholder="Ex. : Mariama Camara" value="' + esc(player || store.get('quizName')) + '" autocomplete="name"><span class="err" id="nameErr" hidden>Indiquez votre nom pour commencer.</span></div>' +
      '<p>Choisissez une section, ou lancez le quiz complet.</p>' +
      '<div class="secs">' + DATA.map((s, i) => {
        const best = prog.best[i], locked = i > prog.unlocked;
        const state = locked ? 'Verrouillée' : best !== undefined ? 'Validée · ' + Math.round(best * s.questions.length) + '/' + s.questions.length : i === prog.unlocked ? 'À vous de jouer' : 'Disponible';
        return '<button class="sec' + (locked ? ' locked' : '') + (best !== undefined ? ' done' : '') + '" data-start="' + i + '"' + (locked ? ' disabled aria-disabled="true" title="Réussissez la section précédente à 80 % pour débloquer"' : '') + '>' +
          '<span class="l">' + (locked ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' : s.letter) + '</span>' +
          '<span class="t">' + esc(s.title) + '</span><span class="n">' + state + '</span></button>';
      }).join('') + '</div>' +
      '<div class="row"><button class="btn" data-start="all">Lancer le quiz complet</button><button class="btn ghost" data-board>Voir le classement</button></div>' +
      '<p class="rules">Une seule bonne réponse par question · 1 point par bonne réponse · Le rail progresse de Simandou vers Morebaya au fil des questions.<br>Parcours par sections : réussissez une section à <b>80 %</b> (8 bonnes réponses sur 10) pour débloquer la suivante.' + (prog.unlocked > 0 || Object.keys(prog.best).length ? ' <button class="link" data-reset>Réinitialiser le parcours</button>' : '') + '</p>' +
      (function () { const ps = parcoursScore(prog); return ps ? certBox(ps.ok, ps.tot, 'Parcours des quatre sections terminé : ' + ps.ok + ' bonnes réponses sur ' + ps.tot + ' (' + Math.round(ps.ok / ps.tot * 100) + ' %).') : ''; })() +
      '<div class="levels">' + LEVELS.slice().reverse().map(l => '<div class="lv"><span class="medal ' + l.key + '"></span><span><b>Certificat ' + l.label + '</b> · à partir de ' + Math.round(l.min * 100) + ' % de bonnes réponses sur 40</span></div>').join('') + '</div>' +
      '</div>' +
      '<div class="card boardcard"><div class="eyebrow">Classement · Top 5</div><div id="homeBoard"><p class="note">Chargement…</p></div></div>';
    fillBoard('homeBoard').then(() => { const rows = document.querySelectorAll('#homeBoard tbody tr'); rows.forEach((r, i) => { if (i >= 5) r.remove(); }); });
  }

  /* ---------- Questions ---------- */
  function start(sc) {
    const input = document.getElementById('playerName');
    if (input) {
      const name = input.value.trim();
      if (!name) { document.getElementById('nameErr').hidden = false; input.focus(); return; }
      player = name; store.set('quizName', name);
    } else if (!player) player = store.get('quizName');
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
      '<div class="row"><span class="score">' + esc(player) + (SHOW_FEEDBACK ? ' · Score : ' + Object.values(answers).filter(Boolean).length + ' / ' + idx : '') + '</span>' +
      '<span style="display:flex;gap:8px"><button class="btn ghost" data-home>Accueil</button><button class="btn" id="next" disabled data-next>' + (idx === queue.length - 1 ? 'Voir le résultat' : 'Question suivante') + '</button></span></div>' +
      '</div>';
  }
  function answer(i) {
    const q = queue[idx]; if (answers[q.n] !== undefined) return;
    const ok = i === q.a; answers[q.n] = ok;
    if (SHOW_FEEDBACK) {
      app.querySelectorAll('.opt').forEach((b, k) => { b.disabled = true; b.classList.add(k === q.a ? 'good' : k === i ? 'bad' : 'dim'); });
      document.getElementById('fb').innerHTML = '<div class="fb ' + (ok ? 'ok' : 'ko') + '"><strong>' + (ok ? 'Bonne réponse.' : 'Réponse : ' + 'ABCD'[q.a] + '. ' + esc(q.opts[q.a])) + '</strong>' + esc(q.e) + '</div>';
    } else {
      app.querySelectorAll('.opt').forEach((b, k) => { b.disabled = true; b.classList.add(k === i ? 'chosen' : 'dim'); });
    }
    const nx = document.getElementById('next'); nx.disabled = false; nx.focus();
  }
  function next() { idx++; if (idx >= queue.length) return results(); renderQ(); }

  /* ---------- Résultats ---------- */
  function results() {
    idx = queue.length; setRail();
    const tot = queue.length, ok = queue.filter(q => answers[q.n]).length, ratio = ok / tot, m = mention(ratio);
    const rows = DATA.map((s, i) => {
      const qs = queue.filter(q => q.sec === i); if (!qs.length) return '';
      const k = qs.filter(q => answers[q.n]).length;
      return '<tr><td><b>' + s.letter + '</b> · ' + esc(s.title) + '<div class="bar"><i style="width:' + (k / qs.length * 100) + '%"></i></div></td><td class="num">' + k + ' / ' + qs.length + '</td></tr>';
    }).join('');
    let certHtml = '';
    if (scope === 'all') {
      record('Quiz complet', ok, tot);
      const lvl = levelFor(ratio);
      certHtml = lvl ? certBox(ok, tot, 'Vous avez obtenu ' + Math.round(ratio * 100) + ' % de bonnes réponses.')
        : '<p class="note">Un certificat (Bronze, Argent ou Or) est délivré à partir de 80 % de bonnes réponses sur le quiz complet. Il vous manque ' + (Math.ceil(tot * 0.8) - ok) + ' bonne(s) réponse(s) : retentez votre chance.</p>';
    } else {
      const prog = loadProgress(), si = scope, passed = ratio >= PASS - 1e-9, nextSec = DATA[si + 1];
      if (passed) {
        if (prog.best[si] === undefined || ratio > prog.best[si]) prog.best[si] = ratio;
        if (si + 1 > prog.unlocked) prog.unlocked = si + 1;
        saveProgress(prog);
      }
      const steps = DATA.map((s, i) => '<span class="step' + (prog.best[i] !== undefined ? ' ok' : i <= prog.unlocked ? ' open' : '') + (i === si ? ' cur' : '') + '">' + s.letter + '</span>').join('<i></i>');
      certHtml = '<div class="progress"><div class="steps">' + steps + '</div>' +
        (passed
          ? (nextSec
              ? '<h3>Section ' + DATA[si].letter + ' validée</h3><p>Vous avez atteint ' + Math.round(ratio * 100) + ' % : la section ' + nextSec.letter + ' est débloquée.</p><button class="btn gold" data-start="' + (si + 1) + '">Continuer : section ' + nextSec.letter + ' · ' + esc(nextSec.title) + '</button>'
              : '<h3>Parcours terminé</h3><p>Vous avez validé les quatre sections : votre certificat est disponible ci-dessous.</p>')
          : '<h3>Section ' + DATA[si].letter + ' non validée</h3><p>Il faut au moins ' + Math.ceil(tot * PASS) + ' bonnes réponses sur ' + tot + ' (80 %) pour passer à la section suivante. Vous en avez ' + ok + '. Recommencez la section.</p>') +
        '</div>';
      const ps = passed && !nextSec ? parcoursScore(prog) : null;
      if (ps) {
        record('Parcours par sections', ps.ok, ps.tot);
        certHtml += certBox(ps.ok, ps.tot, 'Total du parcours : ' + ps.ok + ' bonnes réponses sur ' + ps.tot + ' (' + Math.round(ps.ok / ps.tot * 100) + ' %), en cumulant vos meilleurs scores par section.');
      }
    }
    app.innerHTML = '<div class="card">' +
      '<div class="eyebrow">Résultat · ' + (scope === 'all' ? 'Quiz complet' : 'Section ' + DATA[scope].letter) + ' · ' + esc(player) + '</div>' +
      '<div class="big"><span class="n">' + ok + '</span><span class="d">/ ' + tot + '</span></div>' +
      '<div class="mention">' + m[0] + '<small>' + m[1] + '</small></div>' +
      certHtml +
      '<table><thead><tr><th>Section</th><th style="text-align:right">Score</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="row"><button class="btn" data-start="' + scope + '">Recommencer</button><span style="display:flex;gap:8px"><button class="btn ghost" data-home>Accueil</button><button class="btn ghost" data-board>Classement</button></span></div>' +
      '</div>';
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
    if (!pendingCert) return;
    const tot = pendingCert.tot, ok = pendingCert.ok, ratio = ok / tot, lvl = levelFor(ratio); if (!lvl) return;
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
    const done = () => { document.body.classList.remove('printing'); fitCert(); };
    window.addEventListener('afterprint', done, { once: true });
    setTimeout(() => {
      try { window.print(); } catch (e) { done(); alert('Impression indisponible dans cette fenêtre. Ouvrez le quiz dans votre navigateur (Chrome, Safari, Edge) puis réessayez.'); }
      setTimeout(done, 2000);
    }, 50);
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.start !== undefined) { const v = t.dataset.start; start(v === 'all' ? 'all' : +v); }
    else if (t.dataset.answer !== undefined) answer(+t.dataset.answer);
    else if (t.dataset.next !== undefined) next();
    else if (t.dataset.home !== undefined) home();
    else if (t.dataset.board !== undefined) showBoard();
    else if (t.dataset.cert !== undefined) openCert();
    else if (t.dataset.print !== undefined) printCert();
    else if (t.dataset.close !== undefined) closeCert();
    else if (t.dataset.reset !== undefined) { saveProgress({ unlocked: 0, best: {} }); home(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && certRoot.firstChild) closeCert();
    if (e.key === 'Enter' && e.target.id === 'certName') openCert();
    if (e.key === 'Enter' && e.target.id === 'playerName') start('all');
  });
  document.addEventListener('input', e => { if (e.target.id === 'playerName') { const err = document.getElementById('nameErr'); if (err) err.hidden = true; } });
  home();
})();
