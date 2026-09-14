/* Gouvernement QCM — liaison Firebase (module ES, chargé après app.js).
   Expose window.QCM : connexion anonyme automatique, appel des Cloud Functions (submit, state, reset),
   lecture du classement agrégé (leaderboard/{quiz}) et connexion Google pour les administrateurs.
   Sans configuration Firebase (apiKey vide) ou en cas d'échec réseau, QCM.enabled reste false et l'application
   retombe sur son fonctionnement local. */
const SDK = 'https://www.gstatic.com/firebasejs/12.15.0/';
const CFG = window.QUIZ_CONFIG || {}, FB = CFG.firebase || {};
const QCM = { enabled: false, user: null, error: null };
window.QCM = QCM;

function emit() { try { window.dispatchEvent(new Event('qcm-ready')); } catch (e) {} }

QCM.ready = (async () => {
  if (!FB.apiKey || !FB.projectId) { emit(); return QCM; }
  try {
    const [{ initializeApp }, auth, { getFirestore, doc, getDoc }, { getFunctions, httpsCallable }] = await Promise.all([
      import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore-lite.js'), import(SDK + 'firebase-functions.js')]);
    const app = initializeApp(FB);
    if (CFG.recaptchaSiteKey) {
      try { const { initializeAppCheck, ReCaptchaV3Provider } = await import(SDK + 'firebase-app-check.js'); initializeAppCheck(app, { provider: new ReCaptchaV3Provider(CFG.recaptchaSiteKey), isTokenAutoRefreshEnabled: true }); } catch (e) { console.warn('App Check indisponible', e); }
    }
    const a = auth.getAuth(app), db = getFirestore(app), fns = getFunctions(app, CFG.region || 'europe-west1');
    if (CFG.emulators) { // tests locaux : firebase emulators:start
      const { connectFirestoreEmulator } = await import(SDK + 'firebase-firestore-lite.js'), { connectFunctionsEmulator } = await import(SDK + 'firebase-functions.js');
      auth.connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080); connectFunctionsEmulator(fns, '127.0.0.1', 5001);
    }
    const call = name => { const f = httpsCallable(fns, name); return async data => (await f(data || {})).data; };
    const submit = call('submit'), state = call('state'), reset = call('reset'), adminStats = call('adminStats'), adminExport = call('adminExport');

    // Session : on attend l'état persistant ; sans utilisateur, connexion anonyme (un identifiant par appareil / navigateur).
    const first = await new Promise(res => { const off = auth.onAuthStateChanged(a, u => { off(); res(u); }); });
    QCM.user = first || (await auth.signInAnonymously(a)).user;
    auth.onAuthStateChanged(a, u => { QCM.user = u; });

    QCM.uid = () => QCM.user && QCM.user.uid;
    QCM.isAnonymous = () => !QCM.user || QCM.user.isAnonymous;
    QCM.email = () => (QCM.user && QCM.user.email) || '';
    QCM.state = quiz => state({ quiz });
    QCM.submit = payload => submit(payload);
    QCM.reset = quiz => reset({ quiz });
    QCM.stats = () => adminStats({});
    QCM.export = params => adminExport(params || {});
    QCM.top = async quiz => { const s = await getDoc(doc(db, 'leaderboard', quiz)); return (s.exists() && s.data().top) || []; };
    QCM.adminSignIn = async () => { const p = new auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); const r = await auth.signInWithPopup(a, p); QCM.user = r.user; return r.user; };
    QCM.signOut = async () => { await auth.signOut(a); QCM.user = (await auth.signInAnonymously(a)).user; };
    QCM.enabled = true;
  } catch (e) {
    QCM.error = e; console.warn('Firebase indisponible, mode local', e);
  }
  emit();
  return QCM;
})();
