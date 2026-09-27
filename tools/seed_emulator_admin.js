/* Émulateur : crée admins/{email} avec exempt = true (tests locaux de la régie). Usage : node tools/seed_emulator_admin.js email */
'use strict';
const path = require('path'); process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const NM = path.join(__dirname, '..', 'functions', 'node_modules');
const { initializeApp } = require(path.join(NM, 'firebase-admin', 'lib', 'app')); const { getFirestore } = require(path.join(NM, 'firebase-admin', 'lib', 'firestore'));
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-gouvernement-qcm' });
getFirestore().doc('admins/' + String(process.argv[2] || 'admin@test.local').toLowerCase()).set({ exempt: true }).then(() => { console.log('OK'); process.exit(0); });
