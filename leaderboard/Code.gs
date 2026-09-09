/**
 * Classement partagé du Government Quiz (tous les modules) — Google Apps Script.
 * 1. Créer une feuille Google Sheets vide, puis Extensions → Apps Script, coller ce code.
 * 2. Déployer → Nouveau déploiement → Type : Application web
 *    Exécuter en tant que : Moi · Accès : Tout le monde (anonyme)
 * 3. Copier l'URL de l'application web dans docs/js/config.js (leaderboardUrl).
 * La feuille reçoit une ligne par résultat : date, nom, score, total, mode, quiz (simandou / histoire / armee).
 * Après une modification de ce code : Déployer → Gérer les déploiements → Modifier → Version : Nouvelle version → Déployer.
 */
const SHEET = 'Scores';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(['date', 'name', 'ok', 'tot', 'mode', 'quiz']); }
  if (sh.getLastColumn() < 6) sh.getRange(1, 6).setValue('quiz'); // feuille créée avant l'ajout des modules
  return sh;
}

function iso_(v) { try { const d = new Date(v); return isNaN(d) ? String(v) : d.toISOString(); } catch (e) { return String(v); } }

function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1)
    .filter(r => r[1] && r[3] > 0)
    .map(r => ({ date: iso_(r[0]), name: String(r[1]).slice(0, 60), ok: Number(r[2]), tot: Number(r[3]), mode: String(r[4]), quiz: String(r[5] || '') }));
  return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const name = String(d.name || '').trim().slice(0, 60), ok = Number(d.ok), tot = Number(d.tot);
    if (!name || !(ok >= 0) || !(tot > 0) || ok > tot) return ContentService.createTextOutput('rejected');
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    sheet_().appendRow([new Date(), name, ok, tot, String(d.mode || '').slice(0, 40), String(d.quiz || '').slice(0, 20)]);
    lock.releaseLock();
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}
