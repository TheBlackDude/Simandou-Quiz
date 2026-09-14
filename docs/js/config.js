/* Configuration du Gouvernement QCM.
   firebase      : paramètres web du projet Firebase (console → Paramètres du projet → Vos applications). Si apiKey est vide,
                   l'application fonctionne sans serveur (classement local, aucune limite de tentatives).
   recaptchaSiteKey : clé de site reCAPTCHA v3 pour App Check (facultatif ; laisser vide tant qu'App Check n'est pas activé).
   leaderboardUrl : ancien classement Google Apps Script, utilisé uniquement si Firebase n'est pas configuré. */
window.QUIZ_CONFIG = {
  firebase: {
    apiKey: 'AIzaSyBaw1W0t82M2br5ULl5rhP91u7Q6KFCrUQ',
    authDomain: 'gouvernement-qcm.firebaseapp.com',
    projectId: 'gouvernement-qcm',
    appId: '1:628990126729:web:5798de23bd4778bc69b458'
  },
  region: 'europe-west1',
  recaptchaSiteKey: '',
  leaderboardUrl: 'https://script.google.com/macros/s/AKfycbztjKiwTNlce3mmkeUMRLHlkv1v8a4uRK3uv7Rmam6oWAIvdb92ruubgzWNVk2lX8D5/exec'
};
