/* Gouvernement QCM — tableau de bord administrateur (page /admin, après connexion Google d'un compte autorisé).
   Statistiques calculées par la Cloud Function adminStats ; export CSV paginé par adminExport. */
(function () {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n = x => (x === null || x === undefined) ? '—' : Number(x).toLocaleString('fr-FR');
  const pct = x => (x === null || x === undefined) ? '—' : Number(x).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  const fmtDate = d => { try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  let root = null, backend = null, quizzes = [], data = null;
  const titleOf = id => (quizzes.find(q => q.id === id) || {}).title || id;

  function render() {
    if (!data) return;
    const t = data.totals, best = data.quizzes.slice().sort((a, b) => b.attempts - a.attempts)[0];
    const bestAvg = data.quizzes.filter(q => q.avgPct !== null).sort((a, b) => b.avgPct - a.avgPct)[0];
    const dayKeys = Object.keys(data.days), maxDay = Math.max(1, ...dayKeys.map(k => data.days[k]));
    root.innerHTML = '<div class="dash">' +
      '<div class="row" style="margin-top:0"><span class="muted">Mis à jour ' + fmtDate(data.generatedAt) + ' · contenu ' + esc(data.version) + '</span><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small ghost" data-dash-refresh>Actualiser</button><button class="btn small" data-dash-export="">Exporter toutes les tentatives (CSV)</button><button class="btn small ghost" data-dash-export-top>Exporter les classements (CSV)</button></span></div>' +
      '<p class="note" id="dashMsg" hidden></p>' +
      '<h3>Vue d\'ensemble</h3><div class="kpis">' +
      kpi(n(t.attempts), 'Résultats enregistrés') + kpi(n(t.devices + t.legacyParticipants), 'Participants (appareils)') + kpi(pct(t.avgPct), 'Score moyen') + kpi(n(t.perfect), 'Scores parfaits 40/40') +
      kpi(best ? esc(best.title.replace(/^Quiz /, '')) : '—', 'Quiz le plus joué', true) + kpi(bestAvg ? esc(bestAvg.title.replace(/^Quiz /, '')) : '—', 'Meilleur score moyen', true) + '</div>' +
      '<h3>Résultats par jour (14 derniers jours)</h3><div class="days">' + dayKeys.map(k => '<div style="height:' + Math.round(data.days[k] / maxDay * 100) + '%" title="' + k + ' : ' + data.days[k] + '"><i>' + (data.days[k] || '') + '</i></div>').join('') + '</div>' +
      '<div class="dayslbl">' + dayKeys.map(k => '<span>' + k.slice(8) + '/' + k.slice(5, 7) + '</span>').join('') + '</div>' +
      '<h3>Par quiz</h3><div class="tablewrap"><table class="board"><thead><tr><th>Quiz</th><th class="num">Résultats</th><th class="num">Participants</th><th class="num">Quiz complet</th><th class="num">Parcours</th><th class="num">Score moyen</th><th class="num">Or</th><th class="num">Argent</th><th class="num">Bronze</th><th class="num">40/40</th><th></th></tr></thead><tbody>' +
      data.quizzes.map(q => '<tr><td>' + esc(q.title) + '</td><td class="num"><b>' + n(q.attempts) + '</b></td><td class="num">' + n(q.participants) + '</td><td class="num">' + n(q.full) + '</td><td class="num">' + n(q.parcours) + '</td><td class="num">' + pct(q.avgPct) + '</td><td class="num">' + n(q.levels.or) + '</td><td class="num">' + n(q.levels.argent) + '</td><td class="num">' + n(q.levels.bronze) + '</td><td class="num">' + n(q.perfect) + '</td><td><button class="btn small ghost" data-dash-export="' + esc(q.id) + '">CSV</button></td></tr>').join('') +
      '</tbody></table></div><p class="note">Participants = appareils distincts ayant enregistré un résultat, plus les noms distincts de l\'ancien classement importé. Les résultats des administrateurs sont exclus des statistiques.</p>' +
      '<h3>Meilleurs participants toutes épreuves</h3><div class="tablewrap"><table class="board"><thead><tr><th>#</th><th>Participant</th><th class="num">Quiz</th><th class="num">Total</th><th class="num">40/40</th>' + data.quizzes.map(q => '<th class="num">' + esc(q.title.replace(/^Quiz /, '').split(' ')[0]) + '</th>').join('') + '</tr></thead><tbody>' +
      data.performers.map((p, i) => '<tr><td class="rank">' + (i + 1) + '</td><td>' + esc(p.name) + '</td><td class="num">' + p.quizzes + '</td><td class="num"><b>' + p.ok + '</b> / ' + p.tot + '</td><td class="num">' + p.perfect + '</td>' + data.quizzes.map(q => '<td class="num">' + (p.detail[q.id] === undefined ? '<span class="muted">—</span>' : p.detail[q.id]) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div><p class="note">Cumul du meilleur résultat par quiz (participants présents dans les tops 100).</p>' +
      '<h3>Top 10 par quiz</h3>' + data.quizzes.map(q => '<details><summary>' + esc(q.title) + ' · ' + q.top.length + ' meilleurs</summary><div class="tablewrap"><table class="board"><tbody>' + q.top.map((e, i) => '<tr><td class="rank">' + (i + 1) + '</td><td>' + esc(e.name) + '</td><td class="num"><b>' + e.ok + '</b> / ' + e.tot + '</td><td>' + esc(e.mode) + '</td><td>' + fmtDate(e.date) + '</td></tr>').join('') + '</tbody></table></div></details>').join('') +
      '<h3>Derniers résultats</h3><div class="tablewrap"><table class="board"><thead><tr><th>Date</th><th>Participant</th><th>Quiz</th><th class="num">Score</th><th>Mode</th></tr></thead><tbody>' +
      data.recent.map(e => '<tr><td>' + fmtDate(e.date) + '</td><td>' + esc(e.name) + (e.admin ? ' <span class="muted">(admin)</span>' : '') + (e.legacy ? ' <span class="muted">(import)</span>' : '') + '</td><td>' + esc(titleOf(e.quiz).replace(/^Quiz /, '')) + '</td><td class="num"><b>' + e.ok + '</b> / ' + e.tot + '</td><td>' + esc(e.mode) + '</td></tr>').join('') +
      '</tbody></table></div></div>';
  }
  function kpi(v, label, text) { return '<div class="kpi"><b' + (text ? ' class="txt"' : '') + '>' + v + '</b><span>' + label + '</span></div>'; }
  function msg(text, warn) { const el = document.getElementById('dashMsg'); if (!el) return; el.textContent = text || ''; el.hidden = !text; el.style.color = warn ? '#B45309' : ''; }

  async function load() {
    try { data = await backend.stats(); render(); }
    catch (e) { const c = String(e.code || ''); root.innerHTML = '<p class="note">' + (c.indexOf('permission-denied') > -1 ? 'Ce compte n\'est pas administrateur : le tableau de bord est réservé aux comptes autorisés.' : 'Tableau de bord indisponible : ' + esc(e.message || e)) + '</p>'; }
  }
  const csvCell = v => { const s = String(v === undefined || v === null ? '' : v); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function download(name, lines) {
    const blob = new Blob(['﻿' + lines.map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  async function exportAttempts(quiz) {
    const lines = [['quiz', 'date', 'nom', 'score', 'total', 'mode', 'appareil', 'admin', 'import']]; let cursor = null, pages = 0;
    try {
      do { const r = await backend.export({ quiz: quiz || null, cursor: cursor, limit: 5000 }); r.rows.forEach(row => lines.push(row)); cursor = r.cursor; pages++; msg('Export en cours… ' + (lines.length - 1).toLocaleString('fr-FR') + ' lignes'); } while (cursor && pages < 400);
      download('gouvernement-qcm-' + (quiz || 'tous-les-quiz') + '-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
      msg((lines.length - 1).toLocaleString('fr-FR') + ' lignes exportées.');
    } catch (e) { msg('Export interrompu : ' + (e.message || e), true); }
  }
  async function exportTops() {
    const lines = [['quiz', 'rang', 'nom', 'score', 'total', 'mode', 'date']];
    try {
      for (const q of data.quizzes) { const top = await backend.top(q.id); top.forEach((e, i) => lines.push([q.id, i + 1, e.name, e.ok, e.tot, e.mode, e.date])); }
      download('gouvernement-qcm-classements-' + new Date().toISOString().slice(0, 10) + '.csv', lines); msg((lines.length - 1) + ' lignes de classement exportées.');
    } catch (e) { msg('Export interrompu : ' + (e.message || e), true); }
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !root) return;
    if (t.dataset.dashRefresh !== undefined) { root.innerHTML = '<p class="note">Actualisation…</p>'; load(); }
    else if (t.dataset.dashExport !== undefined) exportAttempts(t.dataset.dashExport);
    else if (t.dataset.dashExportTop !== undefined) exportTops();
  });
  window.QCM_ADMIN = {
    mount(el, b, qz) { root = el; backend = b; quizzes = qz || []; if (!b || !b.enabled) { root.innerHTML = '<p class="note">Serveur indisponible.</p>'; return; } load(); }
  };
})();
