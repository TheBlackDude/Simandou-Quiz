/* Reconstruit leaderboard/{quiz} à partir de la collection attempts (à lancer si un top semble incohérent). */
'use strict';
require('./lib').rebuildLeaderboards().catch(e => { console.error(e); process.exit(1); });
