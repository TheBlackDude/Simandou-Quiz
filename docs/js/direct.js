/* Gouvernement QCM — régie du concours en direct.
   - window.QCM_REGIE.mountAdmin(el, backend) : panneau de commande sur /admin (créer, activer, démarrer 10/7/5 min,
     bloquer, débloquer, clôturer et qualifier, étape suivante, repêchage, réinitialiser).
   - page /direct : écran de projection (classement en temps réel, compte à rebours, puis certificats des lauréats
     avec bouton Enregistrer / Imprimer). Les deux lisent events/{id} et ses tentatives en temps réel (administrateur). */
(function () {
  'use strict';
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad2 = n => (n < 10 ? '0' : '') + n, pad3 = n => String(n).padStart(3, '0');
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); };
  const dur = ms => { const s = Math.round(ms / 1000); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + pad2(s % 60) + ' s'; };
  const clock = ms => { const s = Math.floor(ms / 1000), c = Math.floor((ms % 1000) / 100); return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60) + ',' + c; };
  const ordinal = n => n === 1 ? '1er' : n + 'e';
  const errMsg = e => String((e && e.message) || e || '');
  const GRACE = 8000, AUTO_CLOSE = 12000;
  const STATUS = { waiting: 'En attente', open: 'En cours', blocked: 'Bloqué', closed: 'Étape clôturée', finished: 'Terminé' };
  const store = { get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const LIVE_PAGE = /\/direct\/?$/.test(location.pathname);
  const rankList = list => (list || []).filter(a => a && a.submitted).slice().sort((a, b) => (b.ok - a.ok) || (a.ms - b.ms) || (a.submittedMs - b.submittedMs) || ((a.num || 0) - (b.num || 0))).map((a, i) => Object.assign({}, a, { rank: i + 1 }));

  /* ---------- état partagé (une régie par page) ---------- */
  const S = { B: null, root: null, mode: 'admin', events: [], quizzes: [], id: '', ev: null, attempts: [], joined: 0, offset: 0, unEv: null, unAtt: null, unCnt: null, attStage: -1, msg: '', busy: false, form: null, confirmReset: false, autoClosing: false, tick: null };
  const now = () => Date.now() + S.offset;
  const sync = r => { if (r && typeof r.now === 'number') S.offset = r.now - Date.now(); };
  const titleOf = id => (S.quizzes.find(q => q.id === id) || {}).title || id;
  const stage = () => (S.ev && S.ev.stages[S.ev.stage]) || null;
  const inRoom = () => S.ev ? (S.ev.stage === 0 ? S.joined : (((S.ev.qualified || {})[S.ev.stage]) || []).length) : 0;
  const expired = () => !!(S.ev && S.ev.status === 'open' && S.ev.deadlineMs && now() > S.ev.deadlineMs + GRACE);

  async function call(action, data) {
    S.busy = true; render();
    try { const r = await S.B.concours(action, Object.assign({ id: S.id }, data || {})); sync(r); S.msg = ''; return r; }
    catch (e) { S.msg = 'Erreur : ' + humanErr(e); return null; }
    finally { S.busy = false; render(); }
  }
  function humanErr(e) { const m = errMsg(e); return { first: 'déjà à la première étape', last: 'dernière étape atteinte', active: 'désactivez d\'abord ce concours', finished: 'le concours est terminé', open: 'l\'étape est en cours', blocked: 'l\'étape est bloquée', closed: 'l\'étape est déjà clôturée', waiting: 'l\'étape n\'a pas démarré' }[m] || m; }
  async function loadList() {
    const r = await S.B.concours('list'); sync(r); S.events = r.events || []; S.quizzes = r.quizzes || [];
    if (!S.id || !S.events.find(e => e.id === S.id)) { const act = S.events.find(e => e.active); S.id = (LIVE_PAGE && new URLSearchParams(location.search).get('event')) || (act ? act.id : (S.events[0] || {}).id) || ''; }
    watch();
  }
  function watch() {
    if (S.unEv) { S.unEv(); S.unEv = null; } if (S.unAtt) { S.unAtt(); S.unAtt = null; } if (S.unCnt) { S.unCnt(); S.unCnt = null; }
    S.ev = null; S.attempts = []; S.attStage = -1; S.joined = 0; render();
    if (!S.id) return;
    S.unEv = S.B.watchEvent(S.id, ev => {
      const prev = S.ev; S.ev = ev;
      if (!ev) { S.id = ''; loadList().catch(console.warn); return; }
      if (ev.stage !== S.attStage) { S.attStage = ev.stage; if (S.unAtt) S.unAtt(); S.attempts = []; S.unAtt = S.B.watchAttempts(S.id, ev.stage, list => { S.attempts = list; render(); }, e => { S.msg = 'Lecture des tentatives refusée : ' + errMsg(e); render(); }); }
      if (!prev || prev.status !== ev.status || prev.stage !== ev.stage) S.autoClosing = false;
      render();
    }, e => { S.msg = 'Lecture du concours refusée (compte non administrateur ?) : ' + errMsg(e); render(); });
    S.unCnt = S.B.watchCounter(S.id, n => { S.joined = n; render(); });
  }
  function loop() {
    if (!S.ev) return;
    document.querySelectorAll('[data-rg-timer]').forEach(el => { const left = S.ev.deadlineMs ? S.ev.deadlineMs - now() : 0; el.textContent = S.ev.deadlineMs && S.ev.status !== 'waiting' ? mmss(left) : '—'; el.classList.toggle('warn', !!S.ev.deadlineMs && left < 60000 && left > 0); el.classList.toggle('zero', !!S.ev.deadlineMs && left <= 0); });
    document.querySelectorAll('[data-rg-elapsed]').forEach(el => { el.textContent = clock(Math.max(0, now() - Number(el.dataset.rgElapsed))); });
    // Fin du compte à rebours : le serveur refuse déjà tout envoi ; 12 s après, la régie clôture et qualifie automatiquement.
    if (S.ev.status === 'open' && S.ev.deadlineMs && now() > S.ev.deadlineMs + AUTO_CLOSE && !S.autoClosing && !S.busy) { S.autoClosing = true; call('close'); }
    else if (S.ev.status === 'open' && S.ev.deadlineMs && now() > S.ev.deadlineMs && !document.querySelector('[data-rg-expired]')) render();
  }

  /* ---------- rendu ---------- */
  function render() { if (!S.root) return; S.root.innerHTML = S.mode === 'live' ? liveHtml() : adminHtml(); afterRender(); }
  function afterRender() { fitCerts(); }
  const kpi = (v, l) => '<div class="kpi"><b>' + v + '</b><span>' + l + '</span></div>';
  function adminHtml() {
    const ev = S.ev, opts = S.events.map(e => '<option value="' + esc(e.id) + '"' + (e.id === S.id ? ' selected' : '') + '>' + esc(e.name) + (e.active ? ' · ACTIF' : '') + ' (' + STATUS[e.status] + (e.status !== 'finished' ? ', étape ' + (e.stage + 1) + '/' + e.stages.length : '') + ')</option>').join('');
    let h = '<div class="regie"><h3>Concours en direct</h3>' +
      '<div class="row" style="margin-top:0;justify-content:flex-start"><select id="rgSel" data-rg-select class="rgsel">' + (opts || '<option value="">Aucun concours</option>') + '</select>' +
      '<button class="btn small ghost" data-rg-new>Nouveau concours</button>' + (ev ? '<button class="btn small ghost" data-rg-edit>Modifier</button>' : '') +
      (ev && !ev.active ? '<button class="btn small" data-rg-activate>Activer (les participants le voient)</button>' : '') + (ev && ev.active ? '<button class="btn small ghost" data-rg-deactivate>Désactiver</button>' : '') +
      '<a class="btn small ghost" href="/direct' + (S.id ? '?event=' + encodeURIComponent(S.id) : '') + '" target="_blank" rel="noopener">Ouvrir l\'écran de projection</a></div>' +
      (S.msg ? '<p class="note" style="color:#B45309">' + esc(S.msg) + '</p>' : '') +
      (S.form ? formHtml() : '');
    if (ev) {
      const st = stage(), k = ev.stage, ranked = rankList(S.attempts), started = S.attempts.length, done = ranked.length, exp = expired();
      h += '<div class="rgpanel' + (ev.active ? ' on' : '') + '"><div class="rghead"><div><div class="eyebrow">' + esc(ev.name) + (ev.active ? ' · <span class="ok">actif</span>' : ' · inactif') + ' · lien participants : <span class="lnk">' + esc(location.host) + '/concours</span></div>' +
        '<h2 class="h2" style="margin:0">Étape ' + (k + 1) + ' / ' + ev.stages.length + ' · ' + esc(titleOf(st.quiz)) + '</h2><div class="muted">' + (k < ev.stages.length - 1 ? 'Les ' + st.quota + ' premiers se qualifient' : st.quota + ' lauréat' + (st.quota > 1 ? 's' : '')) + ' · statut : <b class="pill ' + ev.status + '">' + STATUS[ev.status] + (exp ? ' · temps écoulé' : '') + '</b>' + (ev.durationMin ? ' · durée ' + ev.durationMin + ' min' : '') + '</div></div>' +
        '<div class="rgtimer' + (ev.status === 'blocked' ? ' paused' : '') + '" data-rg-timer>—</div></div>' +
        '<div class="kpis">' + kpi(S.joined, 'Inscrits') + kpi(inRoom(), 'En lice à cette étape') + kpi(started - done, 'En cours') + kpi(done, 'Ont envoyé') + '</div>' +
        '<div class="rgbtns">' + buttons(ev, exp) + '</div>' +
        (ev.status === 'finished' ? '<p class="note">Concours terminé : les certificats des lauréats sont affichés sur l\'écran de projection.</p>' : '') +
        '<details' + (done ? ' open' : '') + '><summary>Classement en direct de l\'étape (' + done + ')</summary>' + boardHtml(ranked.slice(0, 20), st.quota, true) + '</details>' +
        '<div class="row" style="justify-content:flex-start"><label class="muted" style="font-size:13px">Repêcher un participant pour cette étape (n°) <input id="rgNum" type="number" min="1" style="width:90px;font:inherit;padding:6px"></label><button class="btn small ghost" data-rg-qualify' + (k === 0 ? ' disabled title="À la première étape, tous les inscrits sont en lice"' : '') + '>Repêcher</button>' +
        '<span style="flex:1"></span>' + (S.confirmReset ? '<span class="muted" style="font-size:13px">Supprimer inscrits et résultats de ce concours ?</span><button class="btn small" style="background:#C8432F;border-color:#C8432F" data-rg-reset-yes>Oui, réinitialiser</button><button class="btn small ghost" data-rg-reset-no>Annuler</button>' : '<button class="btn small ghost" data-rg-reset>Réinitialiser le concours</button>' + (!ev.active ? '<button class="btn small ghost" data-rg-delete>Supprimer</button>' : '')) + '</div>' +
        '</div>';
    }
    return h + '</div>';
  }
  function buttons(ev, exp) {
    const dis = S.busy ? ' disabled' : '', starts = [10, 7, 5].map(m => '<button class="btn" data-rg-open="' + m + '"' + dis + '>Démarrer · ' + m + ' min</button>').join('') + '<span class="custom"><input id="rgMin" type="number" min="1" max="180" placeholder="min" style="width:64px;font:inherit;padding:8px"><button class="btn ghost" data-rg-open="custom"' + dis + '>Démarrer</button></span>';
    const close = '<button class="btn gold" data-rg-close' + dis + '>Clôturer l\'étape et qualifier</button>';
    switch (ev.status) {
      case 'waiting': return starts;
      case 'open': return exp ? '<span class="muted" data-rg-expired>Temps écoulé : plus aucun envoi n\'est accepté · clôture automatique dans quelques secondes</span>' + close + starts.replace(/Démarrer · /g, 'Relancer · ')
        : '<button class="btn" style="background:#C8432F;border-color:#C8432F" data-rg-block' + dis + '>Bloquer</button>' + close;
      case 'blocked': return '<button class="btn" data-rg-unblock' + dis + '>Débloquer</button>' + close;
      case 'closed': return (ev.stage < ev.stages.length - 1 ? '<button class="btn gold" data-rg-next' + dis + '>Étape suivante → ' + esc(titleOf(ev.stages[ev.stage + 1].quiz)) + '</button>' : '') + '<details class="more"><summary>Autres actions</summary>' + starts.replace(/Démarrer · /g, 'Rejouer · ') + (ev.stage > 0 ? '<button class="btn ghost" data-rg-back' + dis + '>Revenir à l\'étape précédente</button>' : '') + '</details>';
      case 'finished': return '<details class="more"><summary>Autres actions</summary><button class="btn ghost" data-rg-back' + dis + '>Revenir à l\'étape précédente</button>' + starts.replace(/Démarrer · /g, 'Rejouer la finale · ') + '</details>';
    }
    return '';
  }
  function formHtml() {
    const f = S.form, rows = f.stages.map((s, i) => '<div class="stg"><b>' + (i + 1) + '</b><select data-f-quiz="' + i + '">' + S.quizzes.map(q => '<option value="' + q.id + '"' + (q.id === s.quiz ? ' selected' : '') + '>' + esc(q.title) + '</option>').join('') + '</select>' +
      '<label>' + (i === f.stages.length - 1 ? 'lauréats' : 'qualifiés') + ' <input type="number" min="1" max="1000" value="' + s.quota + '" data-f-quota="' + i + '"></label>' + (f.stages.length > 1 ? '<button class="link" data-f-del="' + i + '">retirer</button>' : '') + '</div>').join('');
    return '<div class="rgform"><h4>' + (f.id ? 'Modifier le concours' : 'Nouveau concours') + '</h4>' +
      '<div class="grid2"><label>Nom <input id="fName" value="' + esc(f.name) + '" maxlength="60" placeholder="Ex. : Concours SGG du 28 septembre"></label><label>Organisateur (signature des certificats) <input id="fOrg" value="' + esc(f.organizer) + '" maxlength="60"></label><label>Code d\'accès (chiffres, communiqué dans la salle) <input id="fPin" value="' + esc(f.pin) + '" maxlength="8" inputmode="numeric" placeholder="Ex. : 2810"></label></div>' +
      '<div class="stages">' + rows + '</div><button class="link" data-f-add>+ ajouter une étape</button>' +
      '<p class="note">Chaque étape : un quiz de 40 questions et le nombre de participants qui se qualifient pour la suivante (le dernier nombre est celui des lauréats). Pour un test à 5–15 personnes : par exemple 6, 3 puis 2 lauréats.' + (f.id ? ' Les étapes déjà jouées ne changent pas.' : '') + '</p>' +
      '<div class="row"><button class="btn ghost" data-f-cancel>Annuler</button><button class="btn" data-f-save' + (S.busy ? ' disabled' : '') + '>' + (f.id ? 'Enregistrer' : 'Créer') + '</button></div></div>';
  }
  function boardHtml(rows, quota, compact) {
    if (!rows.length) return '<p class="note">Aucune réponse envoyée pour le moment.</p>';
    return '<div class="tablewrap"><table class="board live' + (compact ? ' compact' : '') + '"><thead><tr><th>#</th><th>N°</th><th>Participant</th><th class="num">Score</th><th class="num">Temps</th></tr></thead><tbody>' +
      rows.map(a => '<tr class="' + (a.rank <= quota ? 'in' : 'out') + (a.rank === quota ? ' cut' : '') + '"><td class="rank">' + a.rank + '</td><td class="muted">' + pad3(a.num) + '</td><td>' + esc(a.name) + (a.auto ? ' <span class="muted" title="envoi automatique à la fin du temps">·</span>' : '') + '</td><td class="num"><b>' + a.ok + '</b><span class="pct"> / ' + a.tot + '</span></td><td class="num">' + dur(a.ms) + '</td></tr>').join('') + '</tbody></table></div>';
  }

  /* ---------- écran de projection ---------- */
  function liveHtml() {
    const B = S.B;
    if (!B || !B.enabled) return '<div class="card"><p class="note">Serveur indisponible.</p></div>';
    if (B.isAnonymous()) return '<div class="card livecard"><div class="eyebrow">Écran de projection · Gouvernement QCM</div><h2 class="h2">Connexion administrateur</h2><p>Cet écran affiche le classement en direct du concours. Connectez-vous avec un compte administrateur.</p><div class="row"><button class="btn" data-rg-signin>Se connecter avec Google</button></div></div>';
    const ev = S.ev;
    const bar = '<div class="livebar"><select data-rg-select class="rgsel">' + (S.events.map(e => '<option value="' + esc(e.id) + '"' + (e.id === S.id ? ' selected' : '') + '>' + esc(e.name) + (e.active ? ' · actif' : '') + '</option>').join('') || '<option value="">Aucun concours</option>') + '</select><span>' + esc(B.email()) + '</span><button class="btn small ghost" data-rg-full>Plein écran</button><a class="btn small ghost" href="/admin">Régie</a></div>';
    if (!ev) return bar + '<div class="card livecard"><p class="note">' + (S.msg ? esc(S.msg) : S.events.length ? 'Sélectionnez un concours.' : 'Aucun concours : créez-le depuis la page /admin.') + '</p></div>';
    const st = stage(), k = ev.stage, ranked = rankList(S.attempts), done = ranked.length, started = S.attempts.length, exp = expired(), last = k === ev.stages.length - 1;
    let h = bar + '<div class="live"><div class="livehead"><img class="arm" src="assets/armoiries.png" alt=""><div class="lt"><div class="eyebrow">République de Guinée · ' + esc(ev.organizer) + ' · Semaine de la Fête Nationale · An 68</div><h1>' + esc(ev.name) + '</h1>' +
      '<div class="stg">' + (ev.status === 'finished' ? 'Finale terminée · ' + esc(titleOf(st.quiz)) : 'Étape ' + (k + 1) + ' / ' + ev.stages.length + ' · ' + esc(titleOf(st.quiz)) + ' · ' + (last ? st.quota + ' lauréat' + (st.quota > 1 ? 's' : '') : 'les ' + st.quota + ' premiers se qualifient')) + '</div></div>' +
      '<div class="lclock' + (ev.status === 'blocked' ? ' paused' : '') + '"><div class="t" data-rg-timer>—</div><div class="s pill ' + ev.status + '">' + (exp ? 'Temps écoulé' : STATUS[ev.status]) + '</div></div></div>' +
      '<div class="lkpis">' + kpi(S.joined, 'Inscrits') + kpi(inRoom(), 'En lice') + kpi(Math.max(0, started - done), 'En cours') + kpi(done, 'Ont terminé') + '</div>';
    if (ev.status === 'finished' && ev.winners && ev.winners.length) h += winnersHtml(ev);
    h += '<div class="lboard">' + (ev.status === 'waiting' && !done ? '<p class="lwait">En attente du signal de départ…</p>' : boardHtml(ranked.slice(0, ev.status === 'finished' ? 20 : 30), st.quota)) + (done > 30 && ev.status !== 'finished' ? '<p class="note">… et ' + (done - 30) + ' autres participants.</p>' : '') + '</div>' +
      (S.msg ? '<p class="note" style="color:#B45309">' + esc(S.msg) + '</p>' : '') + '</div>';
    return h;
  }
  function winnersHtml(ev) {
    const w = ev.winners, n0 = ((ev.results || {})[0] || {}).joined || ((ev.results || {})[0] || {}).n || w.length;
    return '<div class="winners"><div class="eyebrow">Proclamation des résultats</div><h2>Lauréats du concours</h2>' +
      '<div class="podium">' + w.map(x => '<div class="wcard r' + x.rank + '"><span class="medal ' + medalKey(x.rank) + '">' + ordinal(x.rank) + '</span><b>' + esc(x.name) + '</b><span>N° ' + pad3(x.num) + ' · ' + x.ok + ' / ' + x.tot + ' · ' + dur(x.ms) + '</span></div>').join('') + '</div>' +
      '<div class="certs">' + w.map((x, i) => '<div class="certwrap"><div class="certstage"><div class="certbox2">' + certHtml(x, ev, n0) + '</div></div><button class="btn gold" data-rg-print="' + i + '">Enregistrer / Imprimer le certificat (PDF)</button></div>').join('') + '</div></div>';
  }
  const medalKey = r => r === 1 ? 'or' : r === 2 ? 'argent' : r === 3 ? 'bronze' : 'laur';
  function certId(x, ev) { let h = 0; const s = ev.id + '|' + x.uid + '|' + x.rank + '|' + (ev.finishedMs || 0); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'LAUR68-' + h.toString(16).toUpperCase().padStart(8, '0'); }
  function certHtml(x, ev, n0) {
    const dateFr = new Date(ev.finishedMs || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const epreuves = ev.stages.map(s => titleOf(s.quiz).replace(/^Quiz /, '')).join(', ');
    return '<div class="cert"><div class="flagstrip"></div><div class="frame"></div><i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i><div class="inner">' +
      '<img class="arm" src="assets/armoiries.png" alt=""><div class="rep">République de Guinée</div><div class="motto">Travail · Justice · Solidarité</div>' +
      '<div class="title">CERTIFICAT DE LAURÉAT</div><div class="subtitle">' + esc(ev.name) + ' · Semaine de la Fête Nationale · An 68</div>' +
      '<div class="decerne">est décerné à</div><div class="name">' + esc(x.name) + '</div>' +
      '<div class="for">classé·e <b>' + ordinal(x.rank) + '</b> sur <b>' + n0 + ' participants</b> au concours « ' + esc(ev.name) + ' », à l\'issue de ' + ev.stages.length + ' épreuve' + (ev.stages.length > 1 ? 's successives' : '') + ' (' + esc(epreuves) + '),<br>avec <b>' + x.ok + ' bonnes réponses sur ' + x.tot + '</b> à l\'épreuve finale (' + esc(titleOf(x.quiz)) + ') en <b>' + dur(x.ms) + '</b>.</div>' +
      '<div class="seal"><div class="medal ' + medalKey(x.rank) + '">' + ordinal(x.rank) + '</div><div><div class="lvl">' + (x.rank === 1 ? 'Premier prix' : x.rank === 2 ? 'Deuxième prix' : x.rank === 3 ? 'Troisième prix' : ordinal(x.rank) + ' lauréat') + '</div><div class="pct">' + x.ok + ' / ' + x.tot + ' bonnes réponses · ' + dur(x.ms) + '</div></div></div>' +
      '<div class="bottom"><div class="blk">Fait à Conakry<b>le ' + esc(dateFr) + '</b></div><div class="sig"><div class="ln"></div>' + esc(ev.organizer) + '</div><div class="logo"><img class="armoiries" src="assets/armoiries.png" alt=""><small>Gouvernement QCM · Guinée 68</small></div></div>' +
      '<div class="id">Certificat n° ' + certId(x, ev) + ' · Gouvernement QCM · Guinée 68 · Semaine de la Fête Nationale · 25 sept – 2 oct 2026</div></div></div>';
  }
  function fitCerts() {
    document.querySelectorAll('.certstage').forEach(st => { const c = st.querySelector('.cert'); if (!c) return; const w = c.offsetWidth, h = c.offsetHeight, scale = Math.min(1, st.clientWidth / w); c.style.transform = 'scale(' + scale + ')'; st.style.height = Math.round(h * scale) + 'px'; });
  }
  function printCert(i) {
    const w = S.ev && S.ev.winners && S.ev.winners[i]; if (!w) return;
    const root = document.getElementById('certRoot'); if (!root) return;
    root.innerHTML = '<div class="cert-overlay"><div class="cert-stage">' + certHtml(w, S.ev, ((S.ev.results || {})[0] || {}).joined || w.tot) + '</div></div>';
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; };
    window.addEventListener('afterprint', done, { once: true });
    setTimeout(() => { try { window.print(); } catch (e) { done(); } setTimeout(done, 3000); }, 80);
  }

  /* ---------- actions ---------- */
  function openForm(ev) {
    S.form = ev ? { id: ev.id, name: ev.name, organizer: ev.organizer, pin: '', stages: ev.stages.map(s => Object.assign({}, s)) }
      : { id: null, name: '', organizer: 'Secrétariat général du Gouvernement', pin: String(1000 + Math.floor(Math.random() * 9000)), stages: [{ quiz: 'histoire', quota: 100 }, { quiz: 'cnrd', quota: 20 }, { quiz: 'armee', quota: 10 }, { quiz: 'simandou', quota: 5 }] };
    render();
  }
  function readForm() { const f = S.form; f.name = document.getElementById('fName').value; f.organizer = document.getElementById('fOrg').value; f.pin = document.getElementById('fPin').value; f.stages.forEach((s, i) => { s.quiz = document.querySelector('[data-f-quiz="' + i + '"]').value; s.quota = Number(document.querySelector('[data-f-quota="' + i + '"]').value); }); }
  async function saveForm() {
    readForm(); const f = S.form, data = { name: f.name, organizer: f.organizer, stages: f.stages };
    if (!f.id || f.pin) data.pin = f.pin;
    const r = f.id ? await call('update', data) : await call('create', data);
    if (r) { S.form = null; if (r.id) S.id = r.id; await loadList(); }
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest('button,a'); if (!t || !S.root || !S.root.contains(t)) return;
    const d = t.dataset;
    if (d.rgSignin !== undefined) { try { await S.B.adminSignIn(); await loadList(); } catch (err) { S.msg = errMsg(err); render(); } }
    else if (d.rgFull !== undefined) { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); }
    else if (d.rgNew !== undefined) openForm(null);
    else if (d.rgEdit !== undefined) openForm(S.ev);
    else if (d.fCancel !== undefined) { S.form = null; render(); }
    else if (d.fSave !== undefined) saveForm();
    else if (d.fAdd !== undefined) { readForm(); S.form.stages.push({ quiz: 'sgg', quota: 5 }); render(); }
    else if (d.fDel !== undefined) { readForm(); S.form.stages.splice(+d.fDel, 1); render(); }
    else if (d.rgActivate !== undefined) { await call('activate', { on: true }); await loadList(); }
    else if (d.rgDeactivate !== undefined) { await call('activate', { on: false }); await loadList(); }
    else if (d.rgOpen !== undefined) { const m = d.rgOpen === 'custom' ? Number((document.getElementById('rgMin') || {}).value) : Number(d.rgOpen); if (!(m >= 1)) { S.msg = 'Indiquez une durée en minutes.'; render(); return; } S.autoClosing = false; await call('open', { minutes: m }); }
    else if (d.rgBlock !== undefined) await call('block');
    else if (d.rgUnblock !== undefined) await call('unblock');
    else if (d.rgClose !== undefined) { S.autoClosing = true; await call('close'); }
    else if (d.rgNext !== undefined) await call('next');
    else if (d.rgBack !== undefined) await call('back');
    else if (d.rgQualify !== undefined) { const n = Number((document.getElementById('rgNum') || {}).value); if (!(n >= 1)) { S.msg = 'Indiquez un numéro de participant.'; render(); return; } const r = await call('qualify', { num: n }); if (r) { S.msg = 'Participant n° ' + n + ' (' + r.name + ') repêché pour cette étape.'; render(); } }
    else if (d.rgReset !== undefined) { S.confirmReset = true; render(); }
    else if (d.rgResetNo !== undefined) { S.confirmReset = false; render(); }
    else if (d.rgResetYes !== undefined) { S.confirmReset = false; await call('reset'); }
    else if (d.rgDelete !== undefined) { const r = await call('delete'); if (r) { S.id = ''; await loadList(); } }
    else if (d.rgPrint !== undefined) printCert(+d.rgPrint);
  });
  document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-rg-select]') && S.root && S.root.contains(e.target)) { S.id = e.target.value; store.set('rgEvent', S.id); if (LIVE_PAGE) history.replaceState(null, '', '?event=' + encodeURIComponent(S.id)); watch(); } });
  window.addEventListener('resize', fitCerts);

  async function mount(el, backend, mode) {
    S.root = el; S.B = backend; S.mode = mode; render();
    if (!backend || !backend.enabled) return;
    if (mode === 'live' && backend.isAnonymous()) return;
    try { await loadList(); } catch (e) { S.msg = 'Régie indisponible : ' + humanErr(e); render(); }
    if (!S.tick) S.tick = setInterval(loop, 250);
  }
  window.QCM_REGIE = { mountAdmin: (el, b) => mount(el, b, 'admin') };
  if (LIVE_PAGE) {
    const wait = new Promise(res => { const done = () => res(window.QCM || null); if (window.QCM) return done(); window.addEventListener('qcm-ready', done, { once: true }); setTimeout(done, 15000); });
    wait.then(async b => { if (b) { try { await b.ready; } catch (e) {} } mount(document.getElementById('app'), b, 'live'); });
  }
})();
