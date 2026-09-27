/* Gouvernement QCM — page participant du concours en direct (/concours).
   Le participant rejoint l'épreuve active (code d'accès + nom), attend le signal de l'organisateur, répond aux questions
   dans le temps imparti, puis voit son score, son rang et sa qualification. Tout est décidé par le serveur (Cloud Function
   « concours ») ; l'état de l'épreuve (étape, statut, compte à rebours) arrive en temps réel (events/{id}). */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad2 = n => (n < 10 ? '0' : '') + n;
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); };
  const dur = ms => { const s = Math.round(ms / 1000); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + pad2(s % 60) + ' s'; };
  const ordinal = n => n === 1 ? '1er' : n + 'e';
  const store = { get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const errCode = e => String((e && e.code) || '').replace(/^functions\//, '');
  const errMsg = e => String((e && e.message) || e || '');
  const GRACE = 8000;

  let B = null, ev = null, me = null, history = [], offset = 0, unwatch = null, uid = '';
  let quiz = null, answers = [], idx = 0, submitted = null, submitting = false, confirmFinish = false, note = '', tick = null;
  const now = () => Date.now() + offset;
  const sync = r => { if (r && typeof r.now === 'number') offset = r.now - Date.now(); };
  const stageOf = k => (ev && ev.stages && ev.stages[k]) || null;
  const titleOf = id => ({ simandou: 'Quiz Simandou', histoire: 'Quiz Histoire de la Guinée', armee: 'Quiz Armée et Gendarmerie', cnrd: 'Quiz Bilan du CNRD 2021-2026', sgg: 'Quiz Secrétariat général du Gouvernement' })[id] || id;
  const qualifiedFor = k => !!(me && (k === 0 || (((ev.qualified || {})[k]) || []).indexOf(uid) > -1));
  const attemptOf = k => history.find(a => a.stage === k) || null;
  const key = () => 'cc_' + (ev ? ev.id : '') + '_' + (ev ? ev.stage : 0);
  const expired = () => !!(ev && ev.deadlineMs && now() > ev.deadlineMs);

  /* ---------- serveur ---------- */
  async function backend() {
    const wait = new Promise(res => { const done = () => res(window.QCM || null); if (window.QCM) return done(); window.addEventListener('qcm-ready', done, { once: true }); setTimeout(done, 15000); });
    const b = await wait; if (!b) return null; try { await b.ready; } catch (e) {} return b.enabled ? b : null;
  }
  async function refresh() {
    const r = await B.concours('state'); sync(r);
    ev = r.event; me = r.me; history = r.attempts || [];
    if (ev && !unwatch) unwatch = B.watchEvent(ev.id, onEvent, e => console.warn('Écoute indisponible', e));
    if (!ev && unwatch) { unwatch(); unwatch = null; }
    render();
  }
  function onEvent(e) {
    const prev = ev; ev = e;
    if (!ev) { if (unwatch) { unwatch(); unwatch = null; } refresh().catch(console.warn); return; }
    if (!prev || prev.stage !== ev.stage) { quiz = null; answers = []; idx = 0; submitted = null; confirmFinish = false; note = ''; }
    if (prev && prev.status !== ev.status && (ev.status === 'closed' || ev.status === 'finished')) B.concours('state').then(r => { sync(r); history = r.attempts || history; me = r.me || me; render(); }).catch(console.warn);
    render();
  }
  async function join() {
    const name = (document.getElementById('ccName').value || '').trim(), pin = (document.getElementById('ccPin').value || '').trim(), phone = (document.getElementById('ccPhone').value || '').trim();
    const err = document.getElementById('ccErr'); err.hidden = true;
    if (name.length < 2) { err.textContent = 'Indiquez votre nom et prénom(s).'; err.hidden = false; return; }
    const btn = document.getElementById('ccJoin'); btn.disabled = true; btn.textContent = 'Inscription…';
    try { const r = await B.concours('join', { name, pin, phone }); sync(r); me = r.me; store.set('quizName', name); render(); }
    catch (e) { const c = errCode(e), m = errMsg(e); err.textContent = c === 'permission-denied' || m === 'pin' ? 'Code d\'accès incorrect.' : m === 'closed' ? 'Les inscriptions sont closes : la première épreuve est terminée.' : m === 'no-event' ? 'Aucun concours n\'est ouvert.' : 'Inscription impossible : ' + m; err.hidden = false; btn.disabled = false; btn.textContent = 'Rejoindre le concours'; }
  }
  async function start() {
    const btn = document.getElementById('ccStart'); if (btn) { btn.disabled = true; btn.textContent = 'Chargement des questions…'; }
    try {
      const r = await B.concours('start'); sync(r); quiz = r;
      try { const saved = JSON.parse(store.get(key()) || 'null'); if (saved && saved.answers && saved.answers.length === r.tot) { answers = saved.answers; idx = Math.min(saved.idx || 0, r.tot - 1); } else { answers = new Array(r.tot).fill(null); idx = 0; } } catch (e) { answers = new Array(r.tot).fill(null); idx = 0; }
      render();
    } catch (e) { note = startError(e); render(); }
  }
  function startError(e) {
    const m = errMsg(e);
    return { waiting: 'L\'épreuve n\'a pas encore démarré.', blocked: 'L\'épreuve est bloquée par l\'organisateur.', closed: 'L\'épreuve est terminée.', expired: 'Le temps imparti est écoulé.', 'not-qualified': 'Vous n\'êtes pas qualifié·e pour cette étape.', 'not-joined': 'Inscription introuvable : rejoignez d\'abord le concours.', done: 'Vous avez déjà envoyé vos réponses pour cette étape.', 'no-event': 'Aucun concours n\'est ouvert.' }[m] || 'Impossible de démarrer : ' + m;
  }
  async function submit(auto) {
    if (!quiz || submitted || submitting) return; submitting = true; confirmFinish = false; render();
    const payload = { answers: answers.map(a => Number.isInteger(a) ? a : null), stage: quiz.stage, auto: !!auto };
    let lastErr = null;
    for (let i = 0; i < 4 && !submitted; i++) {
      try { const r = await B.concours('submit', payload); sync(r); submitted = r; store.del(key()); }
      catch (e) { lastErr = e; const c = errCode(e); if (c === 'failed-precondition' || c === 'permission-denied' || c === 'invalid-argument') break; await new Promise(res => setTimeout(res, 1200)); }
    }
    submitting = false;
    if (!submitted) {
      const m = errMsg(lastErr);
      if (m === 'done') { quiz = null; await refresh().catch(console.warn); return; }
      note = { expired: 'Temps écoulé : vos réponses sont arrivées trop tard et n\'ont pas pu être prises en compte.', blocked: 'L\'épreuve est bloquée par l\'organisateur : vos réponses sont conservées sur cet appareil, attendez la reprise.', closed: 'L\'épreuve est clôturée : vos réponses n\'ont pas pu être prises en compte.', waiting: 'L\'épreuve n\'est pas ouverte.', stage: 'L\'organisateur est passé à l\'étape suivante.' }[m] || 'Envoi impossible (' + m + '). Vérifiez la connexion puis réessayez.';
      if (m === 'expired' || m === 'closed' || m === 'stage') { quiz = null; }
    }
    render();
  }

  /* ---------- écrans ---------- */
  function render() {
    if (!ev) return show('<div class="card"><div class="eyebrow">Concours en direct</div><h2 class="h2">Aucun concours n\'est ouvert pour le moment</h2><p>Revenez sur cette page lorsque l\'organisateur aura ouvert les inscriptions.</p><div class="row"><button class="btn ghost" data-cc-refresh>Actualiser</button><a class="btn ghost" href="/">Aller au quiz public</a></div></div>');
    const k = ev.stage, st = stageOf(k), nst = ev.stages.length, title = st ? titleOf(st.quiz) : '';
    const head = '<div class="eyebrow">' + esc(ev.name) + ' · Étape ' + (k + 1) + ' / ' + nst + '</div>';
    if (!me) return show('<div class="card landing">' + head + '<h2 class="h2">Inscription au concours</h2>' +
      (k > 0 || ev.status === 'closed' || ev.status === 'finished' ? '<p>Les inscriptions sont closes : la première épreuve est terminée.</p><p class="note">Si vous avez déjà participé sur un autre appareil ou navigateur, reprenez sur celui-ci : votre inscription est liée à l\'appareil utilisé.</p>' :
      '<p>Indiquez le <b>code d\'accès</b> communiqué dans la salle et votre <b>nom</b> tel qu\'il doit apparaître à l\'écran et sur le certificat. Utilisez ce même appareil et ce même navigateur pendant toute la durée du concours.</p>' +
      '<div class="who"><label for="ccPin">Code d\'accès</label><input id="ccPin" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Ex. : 2810"></div>' +
      '<div class="who"><label for="ccName">Nom et prénom(s)</label><input id="ccName" type="text" maxlength="60" autocomplete="name" placeholder="Ex. : Mariama Camara" value="' + esc(store.get('quizName')) + '"></div>' +
      '<div class="who"><label for="ccPhone">Téléphone <small>facultatif, pour vous joindre en cas de prix</small></label><input id="ccPhone" type="tel" maxlength="20" autocomplete="tel" placeholder="Ex. : 620 00 00 00"><span class="err" id="ccErr" hidden></span></div>' +
      '<div class="row"><button class="btn" id="ccJoin" data-cc-join>Rejoindre le concours</button></div>') +
      '<p class="rules">' + ev.stages.map((s, i) => '<b>' + (i + 1) + '.</b> ' + esc(titleOf(s.quiz)) + (i < nst - 1 ? ' → les ' + s.quota + ' premiers' : ' → ' + s.quota + ' lauréat' + (s.quota > 1 ? 's' : ''))).join(' · ') + '</p></div>');
    const who = '<div class="ccwho"><span class="num">N° ' + pad3(me.num) + '</span><span>' + esc(me.name) + '</span></div>';
    const att = attemptOf(k);
    if (ev.status === 'finished') return show(finishedCard(head, who));
    if (!qualifiedFor(k)) { // éliminé·e à une étape précédente
      let last = null; for (let j = k - 1; j >= 0 && !last; j--) last = attemptOf(j) ? { a: attemptOf(j), j } : (qualifiedFor(j) ? { a: null, j } : null);
      const r = last && last.a && last.a.rank, res = last && (ev.results || {})[last.j];
      return show('<div class="card">' + head + who + '<h2 class="h2">Votre parcours s\'est arrêté à l\'étape ' + ((last ? last.j : 0) + 1) + '</h2>' +
        (r ? '<div class="big"><span class="n">' + ordinal(r) + '</span><span class="d">sur ' + (res ? res.n : '—') + ' participants</span></div><p>Score : <b>' + last.a.ok + ' / ' + last.a.tot + '</b> en ' + dur(last.a.ms) + ' au ' + esc(titleOf(last.a.quiz)) + '.</p>' : '<p>Aucune réponse enregistrée à cette étape.</p>') +
        '<p>Merci pour votre participation. Suivez la suite du concours à l\'écran.</p><p class="note">En cours : étape ' + (k + 1) + ' · ' + esc(title) + '.</p></div>');
    }
    if (submitted || (att && att.submitted && !quiz)) {
      const a = submitted ? { ok: submitted.ok, tot: submitted.tot, ms: submitted.ms, rank: att && att.rank, answered: submitted.answered } : att;
      const closed = ev.status === 'closed', nextOk = closed && qualifiedFor(k + 1), res = (ev.results || {})[k];
      return show('<div class="card">' + head + who + '<div class="eyebrow">' + esc(title) + '</div>' +
        (closed ? '<h2 class="h2">' + (nextOk ? 'Qualifié·e pour l\'étape suivante !' : 'Étape terminée') + '</h2>' : '<h2 class="h2">Réponses envoyées</h2>') +
        '<div class="big"><span class="n">' + a.ok + '</span><span class="d">/ ' + a.tot + ' bonnes réponses</span></div>' +
        '<p>Temps : <b>' + dur(a.ms) + '</b>' + (a.rank ? ' · Rang : <b>' + ordinal(a.rank) + '</b>' + (res ? ' sur ' + res.n : '') : '') + (a.answered !== null && a.answered !== undefined && a.answered < a.tot ? ' · ' + a.answered + ' questions répondues' : '') + '</p>' +
        (closed ? (nextOk ? '<p>Restez sur cette page : l\'étape ' + (k + 2) + ' (' + esc(titleOf(stageOf(k + 1).quiz)) + ') démarrera au signal de l\'organisateur.</p>' : '<p>Votre parcours s\'arrête ici : seuls les ' + st.quota + ' premiers poursuivent. Merci pour votre participation !</p>') : '<p>Le classement s\'affiche à l\'écran en temps réel. Attendez la clôture de l\'étape pour connaître votre rang.</p>') +
        '</div>');
    }
    if (quiz && ev.status === 'blocked') return show('<div class="card">' + head + who + '<h2 class="h2">Épreuve suspendue</h2><p>L\'organisateur a bloqué l\'épreuve. Vos réponses sont conservées sur cet appareil : ne fermez pas cette page, elle reprendra automatiquement.</p><div class="bigtimer paused" id="ccTimer">' + mmss(ev.deadlineMs - now()) + '</div></div>');
    if (quiz && ev.status === 'open') return question();
    // en attente / prêt à démarrer
    const open = ev.status === 'open', blocked = ev.status === 'blocked', closed = ev.status === 'closed';
    return show('<div class="card">' + head + who + '<div class="eyebrow">' + esc(title) + ' · 40 questions</div>' +
      (closed ? '<h2 class="h2">Étape clôturée</h2><p>Vous n\'avez pas envoyé de réponses à cette étape.</p>' :
       blocked ? '<h2 class="h2">Épreuve bloquée</h2><p>L\'organisateur a bloqué l\'épreuve. Attendez la reprise.</p>' :
       open ? (expired() ? '<h2 class="h2">Temps écoulé</h2><p>Le compte à rebours est terminé : il n\'est plus possible de commencer.</p>' :
              '<h2 class="h2">À vous de jouer</h2><div class="bigtimer" id="ccTimer">' + mmss(ev.deadlineMs - now()) + '</div><p>Temps restant pour tout le monde. Le chrono personnel démarre quand vous appuyez sur <b>Commencer</b> : en cas d\'égalité de score, le plus rapide l\'emporte.</p><div class="row"><button class="btn gold" id="ccStart" data-cc-start>Commencer</button></div>') :
       '<h2 class="h2">En attente du signal</h2><p>L\'épreuve démarrera lorsque l\'organisateur lancera le compte à rebours. Gardez cette page ouverte et l\'écran allumé.</p>') +
      (note ? '<p class="note sync warn">' + esc(note) + '</p>' : '') +
      '<p class="rules">Une seule bonne réponse par question · 1 point par bonne réponse · Une seule tentative par étape · Classement : score, puis rapidité. À la fin du compte à rebours, les réponses déjà données sont envoyées automatiquement.</p></div>');
  }
  function finishedCard(head, who) {
    const w = ev.winners || [], mine = w.find(x => x.uid === uid), res = (ev.results || {})[ev.stage], att = attemptOf(ev.stage);
    return '<div class="card">' + head + who + '<h2 class="h2">' + (mine ? 'Félicitations : vous êtes lauréat·e !' : 'Le concours est terminé') + '</h2>' +
      (mine ? '<div class="big"><span class="n">' + ordinal(mine.rank) + '</span><span class="d">sur ' + (res ? res.n : w.length) + ' finalistes</span></div><p>' + mine.ok + ' / ' + mine.tot + ' au ' + esc(titleOf(mine.quiz)) + ' en ' + dur(mine.ms) + '. Votre certificat est remis par l\'organisateur.</p>' :
        att && att.submitted ? '<p>Finale : <b>' + att.ok + ' / ' + att.tot + '</b> en ' + dur(att.ms) + (att.rank ? ' · ' + ordinal(att.rank) + (res ? ' sur ' + res.n : '') : '') + '.</p>' : '') +
      '<h3 style="margin:18px 0 6px">Lauréats</h3><div class="tablewrap"><table class="board" style="min-width:0"><tbody>' + w.map(x => '<tr' + (x.uid === uid ? ' class="me"' : '') + '><td class="rank">' + x.rank + '</td><td>' + esc(x.name) + '</td><td class="num"><b>' + x.ok + '</b> / ' + x.tot + '</td><td class="num">' + dur(x.ms) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p>Merci à toutes et à tous pour votre participation.</p></div>';
  }
  function question() {
    const q = quiz.questions[idx], tot = quiz.tot, done = answers.filter(a => Number.isInteger(a)).length, last = idx === tot - 1;
    show('<div class="card ccquiz">' +
      '<div class="cbar"><span>' + esc(titleOf(quiz.quiz)) + ' · ' + esc(me.name) + '</span><span class="timer" id="ccTimer">' + mmss(quiz.deadlineMs - now()) + '</span></div>' +
      '<div class="qnum">Question ' + pad2(idx + 1) + ' / ' + tot + ' · ' + done + ' répondue' + (done > 1 ? 's' : '') + '</div>' +
      '<div class="q">' + esc(q.q) + '</div>' +
      '<div class="opts">' + q.opts.map((o, i) => '<button class="opt' + (answers[idx] === i ? ' chosen' : '') + '" data-cc-answer="' + i + '"><span class="k">' + 'ABCD'[i] + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>' +
      (confirmFinish ? '<div class="fb"><strong>Il reste ' + (tot - done) + ' question' + (tot - done > 1 ? 's' : '') + ' sans réponse.</strong>Envoyer quand même ? Les questions sans réponse comptent zéro.<div class="row" style="margin-top:10px"><button class="btn ghost" data-cc-continue>Continuer à répondre</button><button class="btn" data-cc-send>Envoyer maintenant</button></div></div>' : '') +
      (submitting ? '<p class="note sync">Envoi des réponses…</p>' : note ? '<p class="note sync warn">' + esc(note) + '</p>' : '') +
      '<div class="row"><button class="btn ghost" data-cc-prev' + (idx === 0 ? ' disabled' : '') + '>Précédent</button><span style="display:flex;gap:8px">' +
      (last ? '' : '<button class="btn ghost" data-cc-next>Suivant</button>') +
      '<button class="btn' + (done === tot || last ? ' gold' : ' ghost') + '" data-cc-finish' + (submitting ? ' disabled' : '') + '>Terminer et envoyer</button></span></div>' +
      '<div class="ccgrid">' + quiz.questions.map((_, i) => '<button class="cell' + (Number.isInteger(answers[i]) ? ' ok' : '') + (i === idx ? ' cur' : '') + '" data-cc-goto="' + i + '" aria-label="Question ' + (i + 1) + '">' + (i + 1) + '</button>').join('') + '</div>' +
      '</div>');
  }
  function answer(i) {
    if (!quiz || submitting || submitted) return;
    answers[idx] = i; persist();
    const btns = app.querySelectorAll('.opt'); btns.forEach((b, k) => b.classList.toggle('chosen', k === i));
    if (idx < quiz.tot - 1) setTimeout(() => { if (quiz && !submitted) { idx++; persist(); question(); } }, 180); else question();
  }
  function persist() { store.set(key(), JSON.stringify({ answers, idx })); }
  function pad3(n) { return String(n).padStart(3, '0'); }
  function show(html) { app.innerHTML = html; window.scrollTo({ top: 0 }); }

  /* ---------- horloge : compte à rebours + envoi automatique à zéro ---------- */
  let lastPoll = 0;
  function loop() {
    if (!ev) { if (Date.now() - lastPoll > 15000) { lastPoll = Date.now(); refresh().catch(console.warn); } return; } // aucun concours actif : on revérifie toutes les 15 s
    const el = document.getElementById('ccTimer');
    if (el && ev.deadlineMs) { const left = ev.deadlineMs - now(); el.textContent = mmss(left); el.classList.toggle('warn', left < 60000); }
    if (quiz && !submitted && !submitting && ev.status === 'open' && ev.deadlineMs && now() >= ev.deadlineMs) submit(true);
    else if (!quiz && ev.status === 'open' && ev.deadlineMs && document.getElementById('ccStart') && now() > ev.deadlineMs) render();
  }

  /* ---------- événements ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.ccJoin !== undefined) join();
    else if (t.dataset.ccStart !== undefined) { note = ''; start(); }
    else if (t.dataset.ccAnswer !== undefined) answer(+t.dataset.ccAnswer);
    else if (t.dataset.ccPrev !== undefined) { if (idx > 0) { idx--; persist(); question(); } }
    else if (t.dataset.ccNext !== undefined) { if (quiz && idx < quiz.tot - 1) { idx++; persist(); question(); } }
    else if (t.dataset.ccGoto !== undefined) { idx = +t.dataset.ccGoto; persist(); question(); }
    else if (t.dataset.ccFinish !== undefined) { if (!quiz) return; if (answers.filter(a => Number.isInteger(a)).length < quiz.tot) { confirmFinish = true; question(); } else submit(false); }
    else if (t.dataset.ccContinue !== undefined) { confirmFinish = false; question(); }
    else if (t.dataset.ccSend !== undefined) submit(false);
    else if (t.dataset.ccRefresh !== undefined) refresh().catch(console.warn);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && /^cc(Pin|Name|Phone)$/.test(e.target.id)) join(); });
  window.addEventListener('online', () => { if (ev) refresh().catch(console.warn); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ev) { loop(); B.concours('state').then(r => { sync(r); if (!quiz && !submitted) { me = r.me; history = r.attempts || history; render(); } }).catch(console.warn); } });

  (async () => {
    B = await backend();
    if (!B) return show('<div class="card"><h2 class="h2">Serveur indisponible</h2><p>Le concours nécessite une connexion au serveur. Vérifiez votre connexion puis rechargez la page.</p><div class="row"><button class="btn" onclick="location.reload()">Recharger</button></div></div>');
    uid = B.uid();
    try { await refresh(); } catch (e) { show('<div class="card"><h2 class="h2">Connexion impossible</h2><p>' + esc(errMsg(e)) + '</p><div class="row"><button class="btn" data-cc-refresh>Réessayer</button></div></div>'); }
    tick = setInterval(loop, 500);
  })();
})();
