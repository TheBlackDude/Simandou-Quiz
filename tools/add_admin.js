/* Ajoute (ou retire) un compte administrateur exempté de la limite de tentatives.
   Usage : node tools/add_admin.js email@exemple.com [--remove]
   Le compte doit ensuite se connecter avec Google depuis le lien « Administration » du site. */
'use strict';
const { db, FieldValue } = require('./lib');
const email = String(process.argv[2] || '').trim().toLowerCase(), remove = process.argv.includes('--remove');
if (!email.includes('@')) { console.error('Usage : node tools/add_admin.js email@exemple.com [--remove]'); process.exit(1); }
(remove ? db.doc('admins/' + email).delete() : db.doc('admins/' + email).set({ exempt: true, addedAt: FieldValue.serverTimestamp() }))
  .then(() => console.log((remove ? 'Retiré : ' : 'Administrateur ajouté : ') + email)).catch(e => { console.error(e); process.exit(1); });
