/* ==========================================================================
   LOUP-GAROU — app.js
   Vanilla JS, aucune dépendance.

   Sommaire
     1.  Configuration
     2.  Base de données des rôles
     3.  Modes de jeu (logique modulaire)
     4.  Stockage local
     5.  Moteur d'équilibrage
     6.  Icônes & visuels (dos de carte, décor)
     7.  Composants de cartes
     8.  État & navigation
     9.  Écrans
     10. Logique « Pour une Nuit »
     11. Logique « Classique »
     12. Éléments partagés : chronomètre, vote, voix, vibrations
     13. Actions (délégation d'événements)
     14. Démarrage (splash, service worker)
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   1. CONFIGURATION
   -------------------------------------------------------------------------- */
const CONFIG = {
  version: '2.1.0',
  imgDir: './assets/images/',
  cardBack: './assets/images/dos-de-carte.jpg',
  splashMin: 2200,          // durée mini de l'écran de chargement (ms)
  minPlayers: 4,
  maxPlayers: 20,
  maxCustomDecks: 3,        // decks personnalisés par mode
  storagePrefix: 'lg2.',
};

/* --------------------------------------------------------------------------
   2. BASE DE DONNÉES DES RÔLES
   Champs :
     id                   identifiant (= nom du fichier image)
     nom                  nom affiché
     camp                 'Village' | 'Loup' | 'Neutre'
     description          pouvoir (mode « Pour une Nuit » par défaut)
     description_classique pouvoir propre au mode Classique (facultatif)
     image_url            ./assets/images/{id}.jpg
     modes                modes dans lesquels le rôle existe
     multiple             plusieurs exemplaires autorisés dans un deck
     icone                icône du placeholder
   -------------------------------------------------------------------------- */
const ROLES = [
  { id: 'loup-garou-alpha', nom: 'Loup-Garou Alpha', camp: 'Loup', modes: ['nuit'], icone: 'crown',
    description: "Réveillez-vous avec les autres Loups. Puis échangez une carte du centre avec la carte d'un joueur qui n'est pas Loup : il rejoint peut-être la meute sans le savoir.",
    image_url: './assets/images/loup-garou-alpha.jpg' },
  { id: 'loup-garou-mystique', nom: 'Loup-Garou Mystique', camp: 'Loup', modes: ['nuit'], icone: 'spark',
    description: "Réveillez-vous avec les autres Loups. Puis, seul, regardez la carte d'un autre joueur.",
    image_url: './assets/images/loup-garou-mystique.jpg' },
  { id: 'loup-garou-reveur', nom: 'Loup-Garou Rêveur', camp: 'Loup', modes: ['nuit'], icone: 'moon',
    description: "Vous ne vous réveillez pas avec la meute : gardez les yeux fermés et tendez le pouce pour que les Loups sachent que vous êtes des leurs.",
    image_url: './assets/images/loup-garou-reveur.jpg' },
  { id: 'sbire', nom: 'Sbire', camp: 'Loup', modes: ['nuit'], icone: 'dagger',
    description: "Vous savez qui sont les Loups-Garous, eux ne vous connaissent pas. Vous gagnez avec eux, même si vous mourez. S'il n'y a aucun Loup en jeu, vous gagnez si quelqu'un d'autre que vous meurt.",
    image_url: './assets/images/sbire.jpg' },
  { id: 'sorciere', nom: 'Sorcière', camp: 'Village', modes: ['nuit', 'classique'], icone: 'potion',
    description: "Regardez une carte du centre. Vous pouvez ensuite l'échanger avec la carte de n'importe quel joueur, y compris la vôtre.",
    description_classique: "Vous possédez deux potions à usage unique : la potion de vie sauve la victime des Loups, la potion de mort élimine le joueur de votre choix.",
    image_url: './assets/images/sorciere.jpg' },
  { id: 'apprentie-voyante', nom: 'Apprentie Voyante', camp: 'Village', modes: ['nuit'], icone: 'orb',
    description: "Regardez une seule carte du centre.",
    image_url: './assets/images/apprentie-voyante.jpg' },
  { id: 'enqueteur', nom: 'Enquêteur', camp: 'Village', modes: ['nuit'], icone: 'search',
    description: "Regardez la carte d'un joueur, puis éventuellement d'un second. Si vous découvrez un Loup ou le Tanneur, arrêtez-vous : vous rejoignez son camp.",
    image_url: './assets/images/enqueteur.jpg' },
  { id: 'revelateur', nom: 'Révélateur', camp: 'Village', modes: ['nuit'], icone: 'sun',
    description: "Retournez face visible la carte d'un autre joueur. Si c'est un Loup ou le Tanneur, retournez-la à nouveau face cachée.",
    image_url: './assets/images/revelateur.jpg' },
  { id: 'casse-pieds', nom: 'Casse-pieds', camp: 'Village', modes: ['nuit'], icone: 'shuffle',
    description: "Échangez les cartes de deux autres joueurs, sans les regarder.",
    image_url: './assets/images/casse-pieds.jpg' },
  { id: 'soulard', nom: 'Soûlard', camp: 'Village', modes: ['nuit'], icone: 'drink',
    description: "Échangez votre carte avec une carte du centre, sans regarder votre nouveau rôle.",
    image_url: './assets/images/soulard.jpg' },
  { id: 'insomniaque', nom: 'Insomniaque', camp: 'Village', modes: ['nuit'], icone: 'insomnia',
    description: "À la fin de la nuit, regardez à nouveau votre carte pour savoir si elle a changé.",
    image_url: './assets/images/insomniaque.jpg' },
  { id: 'idiot-du-village', nom: 'Idiot du village', camp: 'Village', modes: ['nuit', 'classique'], icone: 'jester',
    description: "Vous pouvez décaler toutes les cartes des autres joueurs d'un cran, vers la gauche ou vers la droite.",
    description_classique: "Si le village vote contre vous, vous êtes démasqué et gracié… mais vous perdez définitivement votre droit de vote.",
    image_url: './assets/images/idiot-du-village.jpg' },
  { id: 'chasseur', nom: 'Chasseur', camp: 'Village', modes: ['nuit', 'classique'], icone: 'target',
    description: "Si vous mourez au vote, le joueur pour lequel vous avez voté meurt avec vous.",
    description_classique: "Quand vous mourez, vous tirez une dernière balle : le joueur de votre choix meurt avec vous.",
    image_url: './assets/images/chasseur.jpg' },
  { id: 'tanneur', nom: 'Tanneur', camp: 'Neutre', modes: ['nuit'], icone: 'skull',
    description: "Vous détestez votre métier. Vous gagnez uniquement si vous êtes éliminé au vote — et dans ce cas, les Loups perdent.",
    image_url: './assets/images/tanneur.jpg' },
  { id: 'garde-du-corps', nom: 'Garde du corps', camp: 'Village', modes: ['nuit', 'classique'], icone: 'guard',
    description: "Le joueur pour lequel vous votez ne peut pas mourir. S'il recueille le plus de voix, c'est le suivant qui est éliminé.",
    description_classique: "Chaque nuit, protégez un joueur de l'attaque des Loups. Vous pouvez vous protéger vous-même, mais jamais deux nuits de suite la même personne.",
    image_url: './assets/images/garde-du-corps.jpg' },
  { id: 'sentinelle', nom: 'Sentinelle', camp: 'Village', modes: ['nuit'], icone: 'shield',
    description: "Placez un bouclier sur la carte d'un autre joueur : personne ne pourra la regarder ni la déplacer cette nuit.",
    image_url: './assets/images/sentinelle.jpg' },
  { id: 'franc-macon', nom: 'Franc-maçon', camp: 'Village', modes: ['nuit', 'classique'], icone: 'mason', multiple: true,
    description: "Réveillez-vous et cherchez l'autre Franc-maçon. Si vous êtes seul, l'autre carte dort au centre.",
    description_classique: "La première nuit, les Francs-maçons ouvrent les yeux et se reconnaissent. Ils savent qu'ils peuvent se faire confiance.",
    image_url: './assets/images/franc-macon.jpg' },
  { id: 'curateur', nom: 'Curateur', camp: 'Village', modes: ['nuit'], icone: 'gem',
    description: "Placez un artefact face cachée sur la carte d'un autre joueur. L'artefact peut bouleverser son identité ou ses conditions de victoire.",
    image_url: './assets/images/curateur.jpg' },
  { id: 'doppelganger', nom: 'Doppelgänger', camp: 'Neutre', modes: ['nuit'], icone: 'mask',
    description: "Regardez la carte d'un autre joueur : vous devenez ce rôle, appliquez son pouvoir et rejoignez son camp.",
    image_url: './assets/images/doppelganger.jpg' },
  { id: 'villageois', nom: 'Villageois', camp: 'Village', modes: ['nuit', 'classique'], icone: 'house', multiple: true,
    description: "Vous n'avez aucun pouvoir, sinon votre flair. Écoutez, observez, et démasquez les Loups.",
    image_url: './assets/images/villageois.jpg' },
  { id: 'maire', nom: 'Maire', camp: 'Village', modes: ['nuit', 'classique'], icone: 'medal',
    description: "Votre voix compte double lors du vote final.",
    description_classique: "Votre voix compte double. En cas d'égalité, c'est vous qui tranchez.",
    image_url: './assets/images/maire.jpg' },
  { id: 'enfant-sauvage', nom: 'Enfant Sauvage', camp: 'Village', modes: ['classique'], icone: 'leaf',
    description: "La première nuit, choisissez secrètement un modèle. Tant qu'il vit, vous êtes Villageois ; s'il meurt, vous devenez Loup-Garou.",
    image_url: './assets/images/enfant-sauvage.jpg' },
  { id: 'voyante', nom: 'Voyante', camp: 'Village', modes: ['nuit', 'classique'], icone: 'eye',
    description: "Regardez la carte d'un autre joueur, OU deux cartes du centre.",
    description_classique: "Chaque nuit, découvrez la véritable identité d'un joueur de votre choix.",
    image_url: './assets/images/voyante.jpg' },
  { id: 'voleur', nom: 'Voleur', camp: 'Village', modes: ['nuit', 'classique'], icone: 'swap',
    description: "Échangez votre carte avec celle d'un autre joueur, puis regardez votre nouvelle carte : vous changez de camp avec elle.",
    description_classique: "La première nuit, vous pouvez échanger votre carte contre l'une des deux cartes laissées au centre. Si ce sont deux Loups, vous devez en prendre un.",
    image_url: './assets/images/voleur.jpg' },
  { id: 'loup-garou-classique', nom: 'Loup-Garou', camp: 'Loup', modes: ['nuit', 'classique'], icone: 'wolf', multiple: true,
    description: "Réveillez-vous avec les autres Loups-Garous. Si vous êtes le seul Loup, vous pouvez regarder une carte du centre.",
    description_classique: "Chaque nuit, la meute se réveille et désigne en silence sa victime. Le jour, cachez-vous parmi les villageois.",
    image_url: './assets/images/loup-garou-classique.jpg' },
];

/* Index + numéro de carte (chiffre romain sur la carte) */
const R = Object.fromEntries(ROLES.map((r, i) => [r.id, { ...r, numero: i + 1 }]));
const ROLE_ORDER = Object.fromEntries(ROLES.map((r, i) => [r.id, i]));
const WOLVES = ['loup-garou-classique', 'loup-garou-alpha', 'loup-garou-mystique', 'loup-garou-reveur'];
const CAMP_CLASS = { Village: 'village', Loup: 'loup', Neutre: 'neutre' };
const CAMP_LABEL = { Village: 'Village', Loup: 'Loups-Garous', Neutre: 'Neutre' };
const cc = id => CAMP_CLASS[R[id].camp];
const descOf = (id, mode) => (mode === 'classique' && R[id].description_classique) || R[id].description;
const isWolfId = id => WOLVES.includes(id);

/* --------------------------------------------------------------------------
   3. MODES DE JEU
   Chaque mode décrit : pool de rôles, règle de taille du paquet,
   cible de Loups, ordres d'ajout/retrait pour l'équilibrage,
   ordre d'appel de nuit et decks par défaut.
   Ajouter un mode = ajouter une entrée ici + ses écrans de flux.
   -------------------------------------------------------------------------- */
const counts = obj => obj; // simple alias lisible pour les decks

const MODES = {
  classique: {
    id: 'classique',
    nom: 'Loup-Garou Classique',
    court: 'Classique',
    numeral: 'I',
    icone: 'sunmoon',
    accroche: "Nuits et jours s'enchaînent jusqu'à ce qu'un camp soit anéanti.",
    meta: 'Plusieurs nuits · MJ',
    /* Une carte par joueur ; +2 cartes au centre si le Voleur est présent */
    centerFor: cards => (cards.includes('voleur') ? 2 : 0),
    /* ≈ 1 Loup pour 4,5 joueurs : 4–6 → 1 · 7–11 → 2 · 12–15 → 3 · 16–20 → 4 */
    wolfTarget: (n) => Math.max(1, Math.round(n / 4.5)),
    maxCopies: { 'loup-garou-classique': 6, villageois: 12, 'franc-macon': 2 },
    wolfAdd: ['loup-garou-classique'],
    wolfRemove: ['loup-garou-classique'],
    removeOrder: ['villageois', 'idiot-du-village', 'franc-macon', 'enfant-sauvage', 'maire', 'garde-du-corps', 'voleur', 'chasseur', 'sorciere', 'voyante'],
    addOrder: ['voyante', 'sorciere', 'chasseur', 'garde-du-corps', 'maire', 'enfant-sauvage', 'idiot-du-village'],
    filler: 'villageois',
    defaultDecks: [
      { id: 'classique-base', name: 'Thiercelieux', counts: counts({ 'loup-garou-classique': 2, voyante: 1, sorciere: 1, chasseur: 1, voleur: 1, villageois: 4 }) },
      { id: 'classique-complet', name: 'Grand village', counts: counts({ 'loup-garou-classique': 3, voyante: 1, sorciere: 1, chasseur: 1, voleur: 1, maire: 1, 'enfant-sauvage': 1, 'garde-du-corps': 1, 'idiot-du-village': 1, 'franc-macon': 2, villageois: 2 }) },
    ],
  },
  nuit: {
    id: 'nuit',
    nom: 'Loup-Garou pour une Nuit',
    court: 'Une Nuit',
    numeral: 'II',
    icone: 'moon',
    accroche: 'Une seule nuit, un seul vote. Personne n\'est sûr de son rôle au réveil.',
    meta: 'Partie de 10 min',
    /* Règle d'or : joueurs + 3 cartes (3 dorment au centre) */
    centerFor: () => 3,
    /* Sur le total de cartes : 7–10 → 2 · 11–14 → 3 · 15–18 → 4 · 19+ → 5 */
    wolfTarget: (n, total) => Math.min(5, Math.max(1, Math.floor((total + 1) / 4))),
    maxCopies: { 'loup-garou-classique': 3, villageois: 6, 'franc-macon': 2 },
    wolfAdd: ['loup-garou-classique', 'loup-garou-mystique', 'loup-garou-reveur', 'loup-garou-alpha'],
    wolfRemove: ['loup-garou-alpha', 'loup-garou-reveur', 'loup-garou-mystique', 'loup-garou-classique'],
    removeOrder: ['villageois', 'curateur', 'enqueteur', 'idiot-du-village', 'revelateur', 'sentinelle', 'garde-du-corps', 'doppelganger', 'maire', 'sorciere', 'apprentie-voyante', 'sbire', 'tanneur', 'chasseur', 'soulard', 'insomniaque', 'franc-macon', 'casse-pieds', 'voleur', 'voyante'],
    addOrder: ['voyante', 'voleur', 'casse-pieds', 'insomniaque', 'soulard', 'chasseur', 'franc-macon', 'apprentie-voyante', 'sorciere', 'tanneur', 'sbire', 'garde-du-corps', 'sentinelle', 'revelateur', 'maire'],
    filler: 'villageois',
    defaultDecks: [
      { id: 'nuit-base', name: 'Première nuit', counts: counts({ 'loup-garou-classique': 2, sbire: 1, 'franc-macon': 2, voyante: 1, voleur: 1, 'casse-pieds': 1, soulard: 1, insomniaque: 1, chasseur: 1, tanneur: 1, villageois: 3 }) },
      { id: 'nuit-complet', name: 'Nuit complète', counts: Object.fromEntries(ROLES.filter(r => r.modes.includes('nuit')).map(r => [r.id, r.id === 'villageois' ? 3 : r.id === 'franc-macon' ? 2 : r.id === 'loup-garou-classique' ? 2 : 1])) },
    ],
  },
};
const MODE_LIST = ['classique', 'nuit'];
const poolOf = mode => ROLES.filter(r => r.modes.includes(mode));

/* Ordre d'appel — Pour une Nuit (rôles présents dans le paquet, y compris au centre) */
const NIGHT_NUIT = [
  { ids: ['doppelganger'], title: 'Doppelgänger', tool: 'Regarder', text: "Doppelgänger, ouvre les yeux. Regarde la carte d'un autre joueur : tu deviens ce rôle. S'il agit la nuit, fais-le maintenant. Rendors-toi." },
  { ids: ['sentinelle'], title: 'Sentinelle', text: "Sentinelle, ouvre les yeux. Tu peux placer un bouclier sur la carte d'un autre joueur. Rendors-toi." },
  { ids: WOLVES, title: 'Loups-Garous', tool: 'Regarder', text: "Loups-Garous, ouvrez les yeux et reconnaissez-vous. Loup-Garou Rêveur, garde les yeux fermés et tends le pouce. Si un Loup est seul, il peut regarder une carte du centre. Rendormez-vous." },
  { ids: ['loup-garou-alpha'], title: 'Loup-Garou Alpha', tool: 'Échanger', text: "Loup-Garou Alpha, ouvre les yeux. Échange une carte du centre avec la carte d'un joueur qui n'est pas Loup. Rendors-toi." },
  { ids: ['loup-garou-mystique'], title: 'Loup-Garou Mystique', tool: 'Regarder', text: "Loup-Garou Mystique, ouvre les yeux. Tu peux regarder la carte d'un autre joueur. Rendors-toi." },
  { ids: ['sbire'], title: 'Sbire', text: "Sbire, ouvre les yeux. Loups-Garous, tendez le pouce sans ouvrir les yeux. Loups, baissez le pouce. Sbire, rendors-toi." },
  { ids: ['franc-macon'], title: 'Francs-maçons', text: "Francs-maçons, ouvrez les yeux et reconnaissez-vous. Rendormez-vous." },
  { ids: ['voyante'], title: 'Voyante', tool: 'Regarder', text: "Voyante, ouvre les yeux. Tu peux regarder la carte d'un autre joueur, ou deux cartes du centre. Rendors-toi." },
  { ids: ['apprentie-voyante'], title: 'Apprentie Voyante', tool: 'Regarder', text: "Apprentie Voyante, ouvre les yeux. Tu peux regarder une carte du centre. Rendors-toi." },
  { ids: ['enqueteur'], title: 'Enquêteur', tool: 'Regarder', text: "Enquêteur, ouvre les yeux. Tu peux regarder jusqu'à deux cartes de joueurs, une par une. Rendors-toi." },
  { ids: ['voleur'], title: 'Voleur', tool: 'Échanger', text: "Voleur, ouvre les yeux. Tu peux échanger ta carte avec celle d'un autre joueur, puis regarder ta nouvelle carte. Rendors-toi." },
  { ids: ['sorciere'], title: 'Sorcière', tool: 'Échanger', text: "Sorcière, ouvre les yeux. Regarde une carte du centre. Tu peux l'échanger avec la carte d'un joueur. Rendors-toi." },
  { ids: ['casse-pieds'], title: 'Casse-pieds', tool: 'Échanger', text: "Casse-pieds, ouvre les yeux. Tu peux échanger les cartes de deux autres joueurs. Rendors-toi." },
  { ids: ['idiot-du-village'], title: 'Idiot du village', tool: 'Décaler', text: "Idiot du village, ouvre les yeux. Tu peux décaler toutes les cartes des autres joueurs d'un cran. Rendors-toi." },
  { ids: ['soulard'], title: 'Soûlard', tool: 'Échanger', text: "Soûlard, ouvre les yeux. Échange ta carte avec une carte du centre, sans la regarder. Rendors-toi." },
  { ids: ['insomniaque'], title: 'Insomniaque', tool: 'Regarder', text: "Insomniaque, ouvre les yeux. Regarde ta propre carte. Rendors-toi." },
  { ids: ['revelateur'], title: 'Révélateur', tool: 'Regarder', text: "Révélateur, ouvre les yeux. Retourne la carte d'un autre joueur. Si c'est un Loup ou le Tanneur, retourne-la face cachée. Rendors-toi." },
  { ids: ['curateur'], title: 'Curateur', text: "Curateur, ouvre les yeux. Place un artefact sur la carte d'un autre joueur. Rendors-toi." },
];

/* Ordre d'appel — Classique (filtré dynamiquement selon les rôles vivants) */
const NIGHT_CLASSIQUE = [
  { id: 'voleur', ids: ['voleur'], first: true, action: 'voleur', title: 'Voleur',
    text: "Voleur, ouvre les yeux. Tu peux échanger ta carte contre l'une des deux cartes du centre. Rendors-toi." },
  { id: 'franc-macon', ids: ['franc-macon'], first: true, title: 'Francs-maçons',
    text: "Francs-maçons, ouvrez les yeux et reconnaissez-vous. Rendormez-vous." },
  { id: 'enfant', ids: ['enfant-sauvage'], first: true, action: 'enfant', title: 'Enfant Sauvage',
    text: "Enfant Sauvage, ouvre les yeux et désigne ton modèle. Rendors-toi." },
  { id: 'garde', ids: ['garde-du-corps'], action: 'garde', title: 'Garde du corps',
    text: "Garde du corps, ouvre les yeux et désigne le joueur que tu protèges cette nuit. Rendors-toi." },
  { id: 'loups', ids: WOLVES, action: 'loups', title: 'Loups-Garous',
    text: "Loups-Garous, ouvrez les yeux. Mettez-vous d'accord en silence et désignez votre victime. Rendormez-vous." },
  { id: 'voyante', ids: ['voyante'], action: 'voyante', title: 'Voyante',
    text: "Voyante, ouvre les yeux et désigne le joueur dont tu veux connaître l'identité. Rendors-toi." },
  { id: 'sorciere', ids: ['sorciere'], action: 'sorciere', title: 'Sorcière',
    text: "Sorcière, ouvre les yeux. Voici la victime de cette nuit. Veux-tu utiliser une potion ? Rendors-toi." },
];

/* --------------------------------------------------------------------------
   4. STOCKAGE LOCAL (localStorage, tolérant aux erreurs : navigation privée…)
   -------------------------------------------------------------------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(CONFIG.storagePrefix + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(CONFIG.storagePrefix + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
};

/* --------------------------------------------------------------------------
   5. MOTEUR D'ÉQUILIBRAGE
   Entrée : mode, composition du deck { roleId: nombre }, nombre de joueurs.
   Sortie : liste exacte de cartes + journal des ajustements.
   Étapes :
     1. Filtrage : rôles du mode uniquement, plafonds d'exemplaires.
     2. Francs-maçons : 0 ou 2, jamais 1.
     3. Meute : on ajoute/retire des Loups jusqu'à la cible du mode.
     4. Paquet trop grand : retrait par priorité (Villageois d'abord),
        la meute n'est jamais touchée.
     5. Paquet trop petit : ajout par priorité (rôles d'information d'abord),
        puis Villageois en complément.
   La taille cible est recalculée à chaque tour : en Classique, retirer le
   Voleur fait disparaître les 2 cartes du centre.
   -------------------------------------------------------------------------- */
function balanceDeck(modeId, deckCounts, n) {
  const M = MODES[modeId];
  const log = [];
  const cap = id => (R[id].multiple ? (M.maxCopies[id] ?? 8) : 1);
  let cards = [];
  for (const [id, c] of Object.entries(deckCounts || {})) {
    if (!R[id] || !R[id].modes.includes(modeId)) continue;
    for (let k = 0; k < Math.min(c, cap(id)); k++) cards.push(id);
  }
  const count = id => cards.filter(x => x === id).length;
  const has = id => cards.includes(id);
  const add = (id, why) => { cards.push(id); log.push({ t: '+', id, why }); };
  const del = (id, why) => { const k = cards.lastIndexOf(id); if (k >= 0) { cards.splice(k, 1); log.push({ t: '−', id, why }); } };
  const target = () => n + M.centerFor(cards);
  const wolves = () => cards.filter(isWolfId).length;

  // 2. Francs-maçons par paire
  if (count('franc-macon') === 1) {
    if (cards.length < target()) add('franc-macon', 'les Francs-maçons vont par paire');
    else del('franc-macon', 'un Franc-maçon seul est inutile');
  }

  // 3. Taille de la meute
  const wt = M.wolfTarget(n, target());
  let guard = 0;
  while (wolves() < wt && guard++ < 30) {
    const id = M.wolfAdd.find(x => count(x) < cap(x));
    if (!id) break;
    add(id, `meute ajustée à ${wt} Loup${wt > 1 ? 's' : ''}`);
  }
  while (wolves() > wt && guard++ < 60) {
    const id = M.wolfRemove.find(has);
    if (!id) break;
    del(id, `meute limitée à ${wt} Loup${wt > 1 ? 's' : ''}`);
  }

  // 4. Paquet trop grand
  guard = 0;
  while (cards.length > target() && guard++ < 80) {
    const over = cards.length - target();
    const id = M.removeOrder.find(x => has(x) && !(x === 'franc-macon' && over < 2));
    if (!id) break;
    del(id, 'paquet trop grand');
    if (id === 'franc-macon') del(id, 'paquet trop grand');
  }

  // 5. Paquet trop petit
  guard = 0;
  while (cards.length < target() && guard++ < 80) {
    const missing = target() - cards.length;
    const id = M.addOrder.find(x => !has(x) && !(x === 'franc-macon' && missing < 2));
    if (id === 'franc-macon') { add(id, 'complément (paire)'); add(id, 'complément (paire)'); continue; }
    add(id || M.filler, 'complément du paquet');
  }

  cards.sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
  const total = cards.length, center = M.centerFor(cards);
  return { cards, log, target: total, center, wolves: wolves(), wolfTarget: wt, expected: wolves() * n / total };
}

/* Regroupe les lignes identiques du journal : « + Villageois ×3 — complément » */
function groupLog(log) {
  const out = [];
  log.forEach(l => {
    const last = out.find(o => o.t === l.t && o.id === l.id && o.why === l.why);
    if (last) last.n++; else out.push({ ...l, n: 1 });
  });
  return out;
}

/* --------------------------------------------------------------------------
   6. ICÔNES & VISUELS
   -------------------------------------------------------------------------- */
const ICONS = {
  wolf: '<path d="M4 3l4 5h8l4-5v9a8 8 0 0 1-16 0z"/><path d="M9 12.5h.01M15 12.5h.01"/><path d="M10.5 16.5h3L12 18z"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M5 16h14"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/><circle cx="12" cy="12" r="2"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
  sunmoon: '<circle cx="9" cy="12" r="4"/><path d="M9 3.5v2M9 18.5v2M2.5 12h2M3.6 6.6l1.4 1.4M3.6 17.4l1.4-1.4"/><path d="M21 15a6 6 0 1 1-6-9 4.6 4.6 0 0 0 6 9z"/>',
  dagger: '<path d="M14.5 3.5l6 6-9.5 9.5-6-6z"/><path d="M8 16l-4.5 4.5M5 12l7 7"/>',
  potion: '<path d="M9 3h6M10 3v5.5L5 17a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-8.5V3"/><path d="M7 15h10"/>',
  orb: '<circle cx="12" cy="10" r="7"/><path d="M7 21h10M8.5 16.5L7 21M15.5 16.5L17 21M9 8a3 3 0 0 1 3-2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  shuffle: '<path d="M3 6h4l10 12h4M3 18h4l3-3.5M14 9.5L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3"/>',
  drink: '<path d="M6 3h12l-1.5 9a4.5 4.5 0 0 1-9 0z"/><path d="M12 16.5V21M8 21h8M7 7h10"/>',
  insomnia: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  jester: '<path d="M4 9l4-5 4 4 4-4 4 5-2 3H6z"/><path d="M6 12v2a6 6 0 0 0 12 0v-2"/><circle cx="4" cy="9" r="1"/><circle cx="20" cy="9" r="1"/><circle cx="12" cy="8" r="1"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  skull: '<path d="M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 21v-2.5M14 21v-2.5"/>',
  guard: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M12 8v8M8 12h8"/>',
  mason: '<path d="M12 3l9.5 16.5h-19z"/><circle cx="12" cy="14" r="2.5"/>',
  gem: '<path d="M6.5 3.5h11L22 9l-10 12L2 9z"/><path d="M2 9h20M9.5 3.5L12 21l2.5-17.5"/>',
  mask: '<path d="M3 5.5c5-2 13-2 18 0V11c0 5.5-4.5 9-9 9s-9-3.5-9-9z"/><path d="M7.5 10.5h3M13.5 10.5h3M9 15.5c2 1.2 4 1.2 6 0"/>',
  house: '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 3l3.5 6.5L15.5 3"/><path d="M12 12.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l8-8"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  swap: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  cards: '<rect x="3" y="6" width="12" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  speaker: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  board: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  scale: '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
  vote: '<path d="M4 13h16v8H4z"/><path d="M8 13V5h8v8M10 9l1.5 1.5L14 8"/>',
  hide: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  flip: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.house}</svg>`;

/* Dos de carte commun (placeholder vectoriel) : géométrie occulte + lune dorée, sans texte */
const BACK_SVG = (() => {
  // Format 3:4 (180×240), identique aux illustrations des rôles
  const cx = 90, cy = 120;
  let rays = '';
  for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12, r1 = 56, r2 = k % 2 ? 60 : 66;
    rays += `<line x1="${(cx + r1 * Math.cos(a)).toFixed(1)}" y1="${(cy + r1 * Math.sin(a)).toFixed(1)}" x2="${(cx + r2 * Math.cos(a)).toFixed(1)}" y2="${(cy + r2 * Math.sin(a)).toFixed(1)}"/>`;
  }
  let stars = '';
  [[28, 44], [152, 48], [34, 196], [148, 200], [62, 30], [118, 212], [22, 120], [158, 120], [40, 92], [140, 150]].forEach(([x, y]) => { stars += `<circle cx="${x}" cy="${y}" r=".9"/>`; });
  return `<svg viewBox="0 0 180 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <radialGradient id="bkBg" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1B2544"/><stop offset="1" stop-color="#070A12"/></radialGradient>
    <radialGradient id="bkMoon" cx="38%" cy="34%" r="72%"><stop offset="0" stop-color="#FFF4C4"/><stop offset=".5" stop-color="#E4C252"/><stop offset="1" stop-color="#94741F"/></radialGradient>
    <pattern id="bkPat" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 0L12 6L6 12L0 6Z" fill="none" stroke="#D4AF37" stroke-opacity=".09" stroke-width=".5"/></pattern>
  </defs>
  <rect width="180" height="240" fill="url(#bkBg)"/>
  <rect width="180" height="240" fill="url(#bkPat)"/>
  <g fill="none" stroke="#D4AF37" stroke-linecap="round">
    <rect x="7" y="7" width="166" height="226" rx="6" stroke-opacity=".85" stroke-width=".8"/>
    <rect x="11" y="11" width="158" height="218" rx="4" stroke-opacity=".35" stroke-width=".5"/>
    <path d="M17 17h14M17 17v14M163 17h-14M163 17v14M17 223h14M17 223v-14M163 223h-14M163 223v-14" stroke-width=".9"/>
    <path d="M17 17l9 9M163 17l-9 9M17 223l9-9M163 223l-9-9" stroke-opacity=".5" stroke-width=".5"/>
    <circle cx="${cx}" cy="${cy}" r="54" stroke-opacity=".6" stroke-width=".6"/>
    <circle cx="${cx}" cy="${cy}" r="48" stroke-opacity=".35" stroke-width=".5" stroke-dasharray="1.2 2.4"/>
    <g stroke-opacity=".55" stroke-width=".5">${rays}</g>
    <rect x="58" y="88" width="64" height="64" stroke-opacity=".55" stroke-width=".6"/>
    <rect x="58" y="88" width="64" height="64" stroke-opacity=".55" stroke-width=".6" transform="rotate(45 ${cx} ${cy})"/>
    <path d="M90 82L124 140H56Z M90 158L56 100H124Z" stroke-opacity=".38" stroke-width=".55"/>
    <circle cx="${cx}" cy="${cy}" r="25" stroke-opacity=".75" stroke-width=".7"/>
    <path d="M90 20v36M90 184v36" stroke-opacity=".5" stroke-width=".5"/>
    <path d="M90 20l-5 8h10zM90 220l-5-8h10z" stroke-opacity=".7" stroke-width=".6"/>
    <path d="M82 44a8 8 0 1 0 8-8 6 6 0 1 1-8 8z" stroke-opacity=".7" stroke-width=".6"/>
    <path d="M98 196a8 8 0 1 1-8 8 6 6 0 1 0 8-8z" stroke-opacity=".7" stroke-width=".6"/>
    <path d="M24 60v120M156 60v120" stroke-opacity=".25" stroke-width=".5" stroke-dasharray="2 3"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="18" fill="#D4AF37" opacity=".18"/>
  <circle cx="${cx}" cy="${cy}" r="16" fill="url(#bkMoon)"/>
  <g fill="#9C7A22" opacity=".45"><circle cx="85" cy="116" r="2.7"/><circle cx="94" cy="125" r="3.3"/><circle cx="93" cy="113" r="1.4"/></g>
  <g fill="#F1D98A">${stars}</g>
</svg>`;
})();

/* Décor vectoriel de l'accueil (remplacé par accueil.jpg s'il existe) :
   ciel étoilé, lune gibbeuse, ravin + loup hurlant, village illuminé, forêt de sapins */
function buildScene() {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const fir = (x, base, h, fill) => {
    const w = h * 0.42;
    return `<path fill="${fill}" d="M${x} ${base - h} L${x + w * .55} ${base - h * .45} L${x + w * .3} ${base - h * .45} L${x + w * .75} ${base - h * .1} L${x + w * .4} ${base - h * .1} L${x + w} ${base} L${x - w} ${base} L${x - w * .4} ${base - h * .1} L${x - w * .75} ${base - h * .1} L${x - w * .3} ${base - h * .45} L${x - w * .55} ${base - h * .45} Z"/>`;
  };
  let farTrees = '', nearTrees = '';
  for (let x = 150; x < 420; x += 9 + rand() * 8) farTrees += fir(x, 700 + rand() * 10, 26 + rand() * 18, '#0b1222');
  for (let x = -10; x < 420; x += 16 + rand() * 14) nearTrees += fir(x, 845, 70 + rand() * 60, '#03050a');
  const houses = [[205, 690, 26, 18], [236, 696, 20, 14], [262, 686, 30, 22], [300, 694, 22, 16], [330, 690, 26, 18], [360, 697, 18, 13]];
  let village = '', lights = '';
  houses.forEach(([x, y, w, h]) => {
    village += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}"/><path d="M${x - 3} ${y - h} L${x + w / 2} ${y - h - w * .45} L${x + w + 3} ${y - h} Z"/>`;
    lights += `<rect class="lit" x="${x + w * .2}" y="${y - h * .65}" width="4" height="5" rx="1"/><rect class="lit" x="${x + w * .62}" y="${y - h * .65}" width="4" height="5" rx="1"/>`;
  });
  // clocher
  village += '<rect x="286" y="640" width="12" height="40"/><path d="M283 640 L292 612 L301 640Z"/>';
  lights += '<rect class="lit" x="289.5" y="650" width="5" height="8" rx="2.5"/>';

  document.getElementById('scene-svg').innerHTML = `
  <svg class="scene-svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F7E7B0" stop-opacity=".35"/><stop offset="1" stop-color="#F7E7B0" stop-opacity="0"/></radialGradient>
      <radialGradient id="moonFace" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#FFF8DE"/><stop offset=".6" stop-color="#EEDDA4"/><stop offset="1" stop-color="#C9B271"/></radialGradient>
      <mask id="gibbous"><rect width="390" height="844" fill="#fff"/><circle cx="218" cy="190" r="52" fill="#000"/></mask>
      <radialGradient id="villageGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFB547" stop-opacity=".35"/><stop offset="1" stop-color="#FFB547" stop-opacity="0"/></radialGradient>
      <linearGradient id="valley" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141d33"/><stop offset="1" stop-color="#070a12"/></linearGradient>
    </defs>
    <circle cx="282" cy="186" r="130" fill="url(#moonGlow)"/>
    <g mask="url(#gibbous)">
      <circle cx="282" cy="186" r="48" fill="url(#moonFace)"/>
      <g fill="#B49A57" opacity=".35"><circle cx="296" cy="176" r="7"/><circle cx="286" cy="204" r="9"/><circle cx="307" cy="198" r="4"/><circle cx="274" cy="168" r="3"/></g>
    </g>
    <path fill="#0d1428" d="M0 560 L60 520 L110 545 L170 500 L230 540 L290 505 L350 535 L390 515 V844 H0Z" opacity=".9"/>
    <path fill="url(#valley)" d="M150 690 Q 230 668 300 684 T 390 680 V844 H150Z"/>
    <ellipse cx="285" cy="685" rx="120" ry="40" fill="url(#villageGlow)"/>
    ${farTrees}
    <g fill="#05070d">${village}</g>
    <g fill="#FFC560">${lights}</g>
    <path fill="#04060c" d="M0 575 L120 568 L150 572 L162 590 L168 640 L180 700 L192 760 L200 844 H0Z"/>
    <g transform="translate(122 570) scale(1.25)" fill="#04060c">
      <path d="M-14 0C-12-4-8-6-5-6C-6-10-5-14-2-16C1-19 4-22 6-27L5-33L6-37L8-33L12-36L13-34L10-30C11-26 11-22 10-18C9-12 10-6 11 0L8 0C7-5 5-8 3-8C1-6 0-3 0 0Z"/>
    </g>
    ${nearTrees}
  </svg>`;
}

/* Étoiles en box-shadow (un seul élément DOM pour des centaines d'étoiles) */
function makeStars() {
  const w = innerWidth, h = innerHeight * .62;
  const gen = (count, max) => Array.from({ length: count }, () =>
    `${Math.round(Math.random() * w)}px ${Math.round(Math.random() * h)}px 0 0 rgba(255,246,220,${(Math.random() * max + .2).toFixed(2)})`).join(',');
  document.getElementById('stars').style.boxShadow = gen(Math.round(w * h / 4200), .6);
  document.getElementById('stars-2').style.boxShadow = gen(Math.round(w * h / 20000), .7);
}

/* --------------------------------------------------------------------------
   7. COMPOSANTS DE CARTES
   Toutes les cartes partagent le ratio 7:12 et la même structure :
   .art (overflow hidden + border-radius) > placeholder + <img object-fit:cover>
   -------------------------------------------------------------------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BROKEN = new Set(); // images absentes : on ne les redemande pas

function roman(n) {
  const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return s;
}
function imgTag(src) { return BROKEN.has(src) ? '' : `<img src="${esc(src)}" alt="" decoding="async">`; }

function roleArt(id) {
  const r = R[id];
  return `<div class="art camp-${cc(id)}">
    <div class="art-fallback">${icon(r.icone)}<span class="ph-num">${roman(r.numero)}</span></div>
    ${imgTag(r.image_url)}
  </div>`;
}
function backArt() {
  return `<div class="art art-back"><div class="art-fallback">${BACK_SVG}</div>${imgTag(CONFIG.cardBack)}</div>`;
}
function miniCard(id, opts = {}) {
  return `<div class="mcard camp-${cc(id)} ${opts.dead ? 'dead' : ''}">
    ${roleArt(id)}<div class="shade"></div><div class="frame"></div>
    <span class="mname">${esc(R[id].nom)}</span>${opts.count > 1 ? `<span class="mcount">×${opts.count}</span>` : ''}
  </div>`;
}
function miniBack(label) {
  return `<div class="mcard">${backArt()}${label ? `<span class="mname">${esc(label)}</span>` : ''}</div>`;
}
/* Grande carte retournable (distribution) */
function bigCard(id) {
  const r = R[id];
  return `<div class="tcard" id="tcard" data-act="flip" role="button" aria-label="Retourner la carte">
    <div class="tcard-inner">
      <div class="tcard-face tcard-back">${backArt()}<div class="glint"></div></div>
      <div class="tcard-face tcard-front camp-${cc(id)}">
        ${roleArt(id)}<div class="shade"></div><div class="frame"></div>
        <div class="top-num">${roman(r.numero)}</div>
        <div class="plate"><h2>${esc(r.nom)}</h2><span class="rule"></span><span class="badge"><i class="dot"></i>${CAMP_LABEL[r.camp]}</span></div>
      </div>
    </div>
  </div>`;
}
function avatar(name, cls = '') {
  return `<span class="av ${cls}">${esc(name.trim().charAt(0).toUpperCase())}</span>`;
}
function campBar(cards) {
  const s = { Loup: 0, Village: 0, Neutre: 0 };
  cards.forEach(id => s[R[id].camp]++);
  const keys = Object.keys(s).filter(k => s[k]);
  return `<div class="bbar">${keys.map(k => `<i class="camp-${CAMP_CLASS[k]}" style="flex:${s[k]}"></i>`).join('')}</div>
    <div class="blegend">${keys.map(k => `<span class="camp-${CAMP_CLASS[k]}"><i class="dot"></i>${CAMP_LABEL[k]} · ${s[k]}</span>`).join('')}</div>`;
}
/* Regroupe une liste de cartes en {id, n} pour l'affichage */
function stack(cards) {
  const m = new Map(); cards.forEach(id => m.set(id, (m.get(id) || 0) + 1));
  return [...m].map(([id, n]) => ({ id, n }));
}

/* --------------------------------------------------------------------------
   8. ÉTAT & NAVIGATION
   -------------------------------------------------------------------------- */
const DEFAULT_SETTINGS = { timer: 300, voice: true, haptics: true, secretVote: true };

const S = {
  screen: 'home',
  stack: [],
  mode: store.get('mode', 'nuit'),
  players: store.get('players', []),
  deckSel: store.get('deckSel', { classique: 'classique-base', nuit: 'nuit-base' }),
  custom: store.get('decks', []),
  settings: { ...DEFAULT_SETTINGS, ...store.get('settings', {}) },
  draft: null,
  sheet: null,      // callbacks de la feuille ouverte
  focusName: false,
};
let G = null;      // partie en cours

const saveAll = () => {
  store.set('mode', S.mode); store.set('players', S.players); store.set('deckSel', S.deckSel);
  store.set('decks', S.custom); store.set('settings', S.settings);
};
const decksFor = mode => [
  ...MODES[mode].defaultDecks.map(d => ({ ...d, mode, builtin: true })),
  ...S.custom.filter(d => d.mode === mode),
];
const currentDeck = () => decksFor(S.mode).find(d => d.id === S.deckSel[S.mode]) || decksFor(S.mode)[0];
const deckSize = d => Object.values(d.counts).reduce((a, b) => a + b, 0);
const deckCards = d => Object.entries(d.counts).flatMap(([id, c]) => Array(c).fill(id)).sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);

const TITLES = {
  home: '', setup: 'Nouvelle partie', decks: 'Mes decks', deckEdit: 'Éditeur de deck', deal: 'Distribution',
  night: 'La nuit', cnight: 'La nuit', announce: 'Le village', day: 'Le jour', vote: 'Le vote', result: 'Dénouement',
  settings: 'Paramètres', rules: 'Règles',
};
const PHASE = { night: 'night', cnight: 'night', day: 'day', vote: 'day', announce: 'day', result: 'day' };
const IN_GAME = ['deal', 'night', 'cnight', 'announce', 'day', 'vote'];

function render() {
  const view = $('#view');
  const same = view.dataset.screen === S.screen;
  const keep = same ? view.scrollTop : 0;
  const out = SCREENS[S.screen]();
  const o = typeof out === 'string' ? { body: out } : out;
  view.innerHTML = `<div class="page ${same ? '' : 'enter'}">${o.body}</div>`;
  view.dataset.screen = S.screen;
  $('#dock').innerHTML = o.dock ? `<div class="dock-row">${o.dock}</div>` : '';
  view.scrollTop = keep;
  let title = TITLES[S.screen] || '';
  if (G && G.mode === 'classique' && (S.screen === 'cnight')) title = `Nuit ${G.round}`;
  if (G && G.mode === 'classique' && (S.screen === 'day' || S.screen === 'vote')) title = `Jour ${G.round}`;
  $('#title').textContent = title;
  $('#backBtn').style.visibility = S.screen === 'home' ? 'hidden' : 'visible';
  document.body.dataset.screen = S.screen;
  document.body.dataset.phase = PHASE[S.screen] || '';
  AFTER[S.screen] && AFTER[S.screen]();
}
function go(screen, opts = {}) {
  if (S.screen === 'day' && screen !== 'day') stopTimer();
  if (!opts.replace) S.stack.push(S.screen);
  S.screen = screen;
  closeSheet();
  render();
}
function back() {
  if (IN_GAME.includes(S.screen)) {
    confirmSheet('Quitter la partie ?', 'La partie en cours sera perdue.', 'Quitter', endGame);
  } else if (S.screen === 'result') {
    endGame();
  } else {
    go(S.stack.pop() || 'home', { replace: true });
  }
}
function endGame() { stopTimer(); keepAwake(false); G = null; S.stack = []; go('home', { replace: true }); }

/* --------------------------------------------------------------------------
   9. ÉCRANS
   -------------------------------------------------------------------------- */
const SCREENS = {};
const AFTER = {};

/* 9.1 Accueil : choix du mode */
SCREENS.home = () => {
  const modeCard = m => {
    const M = MODES[m];
    return `<button class="mode-card ${S.mode === m ? 'on' : ''}" data-act="setMode" data-mode="${m}" aria-pressed="${S.mode === m}">
      <span class="check">${icon('check')}</span>
      <span class="num">${M.numeral}</span>
      <span class="ico">${icon(M.icone)}</span>
      <h3>${M.court}</h3>
      <p>${M.accroche}</p>
      <span class="meta">${M.meta}</span>
    </button>`;
  };
  return {
    body: `<header class="home-head">
        <p class="eyebrow">Choisissez votre rituel</p>
        <h1 class="logo-title">Loup-Garou</h1>
        <div class="ornament"><span></span><i></i><span></span></div>
      </header>
      <div class="modes">${MODE_LIST.map(modeCard).join('')}</div>
      <div class="home-links">
        <button class="btn" data-act="goto" data-to="decks">${icon('cards')}Mes decks</button>
        <button class="btn" data-act="goto" data-to="rules">${icon('book')}Règles</button>
        <button class="btn" data-act="goto" data-to="settings">${icon('gear')}Réglages</button>
      </div>
      <p class="version">${ROLES.length} rôles · v${CONFIG.version}</p>`,
    dock: `<button class="btn btn-gold glow" data-act="goto" data-to="setup">${icon('play')}Nouvelle partie · ${MODES[S.mode].court}</button>`,
  };
};

/* 9.2 Préparation : joueurs + deck + aperçu équilibré */
SCREENS.setup = () => {
  const n = S.players.length, deck = currentDeck(), M = MODES[S.mode];
  let preview;
  if (n < CONFIG.minPlayers) {
    preview = `<p class="muted small center">Ajoutez au moins ${CONFIG.minPlayers} joueurs pour voir la composition équilibrée.</p>
      <div class="cards-grid" style="margin-top:14px">${stack(deckCards(deck)).map(s => miniCard(s.id, { count: s.n })).join('')}</div>`;
  } else {
    const b = balanceDeck(S.mode, deck.counts, n);
    const lines = groupLog(b.log);
    preview = `<div class="formula">
        <span><b>${n}</b>joueurs</span>
        ${b.center ? `<span class="op">+</span><span><b>${b.center}</b>au centre</span>` : ''}
        <span class="op">=</span><span><b>${b.target}</b>cartes</span>
      </div>
      ${campBar(b.cards)}
      <p class="note">Meute : <b>${b.wolves} Loup${b.wolves > 1 ? 's' : ''}</b>${b.center ? ` · ≈ ${b.expected.toFixed(1).replace('.', ',')} réellement en jeu (${b.center} cartes restent au centre)` : ''}.</p>
      <ul class="adj">${lines.length ? lines.map(l => `<li><em class="${l.t === '−' ? 'minus' : ''}">${l.t}</em><span>${esc(R[l.id].nom)}${l.n > 1 ? ' ×' + l.n : ''} — ${esc(l.why)}</span></li>`).join('') : `<li><em>✓</em><span>Deck déjà équilibré pour ${n} joueurs.</span></li>`}</ul>
      <div class="cards-grid" style="margin-top:14px">${stack(b.cards).map(s => miniCard(s.id, { count: s.n })).join('')}</div>`;
  }
  return {
    body: `<div class="seg">${MODE_LIST.map(m => `<button class="${S.mode === m ? 'on' : ''}" data-act="setMode" data-mode="${m}">${icon(MODES[m].icone)}${MODES[m].court}</button>`).join('')}</div>
      <div class="setup-grid">
        <section class="panel ornate">
          <div class="panel-title">${icon('users')}Joueurs · ${n}</div>
          <div class="add-row">
            <input class="field" id="pName" maxlength="16" placeholder="Prénom du joueur" autocomplete="off" autocapitalize="words" enterkeyhint="done">
            <button class="btn btn-gold icon" data-act="addPlayer" aria-label="Ajouter">${icon('plus')}</button>
          </div>
          <div class="chips" style="margin-top:14px">${S.players.map((p, i) => `<span class="chip">${avatar(p)}${esc(p)}<button data-act="rmPlayer" data-i="${i}" aria-label="Retirer ${esc(p)}">${icon('x')}</button></span>`).join('')}</div>
          ${n ? '<button class="btn btn-ghost sm" style="margin-top:8px" data-act="clearPlayers">Vider la liste</button>' : ''}
          <div class="panel-title" style="margin-top:20px">${icon('cards')}Deck</div>
          <div class="pills">${decksFor(S.mode).map(d => `<button class="pill ${d.id === deck.id ? 'on' : ''}" data-act="pickDeck" data-id="${d.id}">${esc(d.name)} · ${deckSize(d)}</button>`).join('')}</div>
        </section>
        <section class="panel ornate">
          <div class="panel-title">${icon('scale')}Équilibrage · ${M.court}</div>
          ${preview}
        </section>
      </div>`,
    dock: `<button class="btn btn-gold ${n >= CONFIG.minPlayers ? 'glow' : ''}" data-act="startGame" ${n >= CONFIG.minPlayers ? '' : 'disabled'}>${icon('cards')}Distribuer les cartes</button>`,
  };
};
AFTER.setup = () => { if (S.focusName) { const i = $('#pName'); i && i.focus(); S.focusName = false; } };

/* 9.3 Mes decks */
SCREENS.decks = () => {
  const own = S.custom.filter(d => d.mode === S.mode).length;
  const full = own >= CONFIG.maxCustomDecks;
  const card = d => `<article class="panel deck">
      <div class="row between"><h3>${esc(d.name)}</h3><span class="badge">${d.builtin ? 'Par défaut' : 'Perso'}</span></div>
      <p class="meta">${deckSize(d)} cartes · ${d.counts['loup-garou-classique'] || 0} Loup-Garou${(d.counts['loup-garou-classique'] || 0) > 1 ? 's' : ''} de base</p>
      <div class="strip">${deckCards(d).slice(0, 16).map(id => miniCard(id)).join('')}</div>
      ${campBar(deckCards(d))}
      <div class="row wrap" style="margin-top:14px">
        ${d.builtin ? '' : `<button class="btn sm" data-act="editDeck" data-id="${d.id}">${icon('edit')}Modifier</button>`}
        <button class="btn sm" data-act="dupDeck" data-id="${d.id}" ${full ? 'disabled' : ''}>${icon('copy')}Dupliquer</button>
        ${d.builtin ? '' : `<button class="btn sm btn-danger" data-act="delDeck" data-id="${d.id}" aria-label="Supprimer">${icon('trash')}</button>`}
      </div>
    </article>`;
  return {
    body: `<div class="seg">${MODE_LIST.map(m => `<button class="${S.mode === m ? 'on' : ''}" data-act="setMode" data-mode="${m}">${icon(MODES[m].icone)}${MODES[m].court}</button>`).join('')}</div>
      <p class="muted small center">${own}/${CONFIG.maxCustomDecks} decks personnalisés pour ce mode</p>
      <div class="decks">${decksFor(S.mode).map(card).join('')}</div>`,
    dock: `<button class="btn btn-gold" data-act="newDeck" ${full ? 'disabled' : ''}>${icon('plus')}${full ? 'Emplacements pleins' : 'Nouveau deck'}</button>`,
  };
};

/* 9.4 Éditeur de deck */
SCREENS.deckEdit = () => {
  const d = S.draft, M = MODES[d.mode];
  const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
  const tile = r => {
    const c = d.counts[r.id] || 0, max = r.multiple ? (M.maxCopies[r.id] ?? 8) : 1;
    return `<div class="pick ${c ? 'on' : ''}">
      <button class="pick-card" data-act="toggleRole" data-id="${r.id}" aria-label="${esc(r.nom)}">${miniCard(r.id, { count: c })}</button>
      <button class="info" data-act="roleInfo" data-id="${r.id}" aria-label="Pouvoir">${icon('info')}</button>
      ${r.multiple ? `<div class="stepper"><button data-act="dec" data-id="${r.id}" aria-label="Retirer">−</button><span>${c}/${max}</span><button data-act="inc" data-id="${r.id}" aria-label="Ajouter">+</button></div>` : ''}
    </div>`;
  };
  return {
    body: `<input class="field" id="dName" maxlength="28" placeholder="Nom du deck" value="${esc(d.name)}">
      <div class="row between"><span class="kicker">${MODES[d.mode].court}</span><span class="muted small"><b style="color:var(--gold-light)">${total}</b> cartes</span></div>
      <div class="cards-grid">${poolOf(d.mode).map(tile).join('')}</div>`,
    dock: `<button class="btn btn-gold" data-act="saveDeck">${icon('check')}Enregistrer</button>`,
  };
};

/* 9.5 Distribution « Pass & Play » (commune aux deux modes) */
SCREENS.deal = () => {
  const d = G.deal, P = G.players, p = P[d.i];
  const dots = `<div class="progress">${P.map((_, k) => `<i class="${k < d.i ? 'done' : k === d.i ? 'cur' : ''}"></i>`).join('')}</div>`;
  if (d.stage === 'handoff') {
    return {
      body: `<div class="handoff panel ornate">
          ${avatar(p.name, 'lg')}
          <p class="kicker">Passez le téléphone à</p>
          <h2>${esc(p.name)}</h2>
          <p class="faint small">Joueur ${d.i + 1} sur ${P.length} — les autres, détournez le regard.</p>
          ${dots}
        </div>`,
      dock: `<button class="btn btn-gold" data-act="iAm">C'est moi, ${esc(p.name)}</button>`,
    };
  }
  return {
    body: `<div class="deal">
        <p class="who">Ta carte<b>${esc(p.name)}</b></p>
        ${bigCard(p.role)}
        <p class="hint" id="dealHint">Touche la carte pour la retourner</p>
        <div class="reveal-info panel ornate" id="revealInfo">
          <div class="row"><span class="badge camp-${cc(p.role)}"><i class="dot"></i>${CAMP_LABEL[R[p.role].camp]}</span></div>
          <p>${esc(descOf(p.role, G.mode))}</p>
        </div>
        ${dots}
      </div>`,
    dock: '<div id="dealDock" class="dock-row" style="flex:1"></div>',
  };
};
AFTER.deal = () => { if (G.deal.stage === 'card') updateDealUI(); };

function updateDealUI() {
  const d = G.deal, last = d.i === G.players.length - 1;
  $('#tcard').classList.toggle('is-flipped', d.flipped);
  $('#revealInfo').classList.toggle('show', d.flipped);
  $('#dealHint').textContent = d.flipped ? 'Mémorise ton rôle, puis cache ta carte.' : (d.seen ? 'Carte cachée. Tu peux passer le téléphone.' : 'Touche la carte pour la retourner');
  $('#dealDock').innerHTML = d.flipped
    ? `<button class="btn" data-act="hideCard">${icon('hide')}Cacher</button>`
    : d.seen
      ? `<button class="btn btn-gold" data-act="nextDeal">${last ? 'Tout le monde a vu son rôle' : 'Joueur suivant'}</button>`
      : `<button class="btn" data-act="flip">${icon('flip')}Retourner</button>`;
}

/* 9.6 Nuit — Pour une Nuit (liste du maître du jeu + plateau) */
SCREENS.night = () => {
  const steps = nightStepsNuit(), done = steps.filter((_, k) => G.night.done[k]).length;
  if (!G.night.started) {
    return {
      body: `<div class="night-intro panel ornate">
          <div class="moon-ico">${icon('moon')}</div>
          <h2 class="h2">La nuit tombe…</h2>
          <p class="muted">Le maître du jeu garde le téléphone. ${steps.length} rôle${steps.length > 1 ? 's seront appelés' : ' sera appelé'}, y compris ceux qui dorment au centre, pour ne rien trahir.</p>
        </div>`,
      dock: `<button class="btn btn-gold glow" data-act="sleep">${icon('moon')}Le village s'endort</button>`,
    };
  }
  const cur = steps.findIndex((_, k) => !G.night.done[k]);
  const tags = s => stack(G.cards.filter(id => s.ids.includes(id))).map(x => `<span class="badge camp-${cc(x.id)}">${esc(R[x.id].nom)}${x.n > 1 ? ' ×' + x.n : ''}</span>`).join('');
  return {
    body: `<div class="panel nprog"><b>${done}/${steps.length}</b><div class="bar"><i style="width:${steps.length ? done / steps.length * 100 : 100}%"></i></div><span class="faint tiny">appels</span></div>
      <ol class="steps">${steps.map((s, k) => `<li class="panel step ${G.night.done[k] ? 'done' : ''} ${k === cur ? 'current' : ''}">
          <button class="chk" data-act="checkStep" data-k="${k}" aria-label="Valider">${icon('check')}</button>
          <div class="step-body">
            <div class="step-title"><span class="n">${roman(k + 1)}</span>${esc(s.title)}</div>
            <p>${esc(s.text)}</p>
            <div class="tags">${tags(s)}${s.tool ? `<span class="badge">Plateau : ${s.tool}</span>` : ''}</div>
          </div>
          <div class="acts"><button class="btn icon" data-act="speak" data-k="${k}" aria-label="Lire à voix haute">${icon('speaker')}</button></div>
        </li>`).join('')}</ol>`,
    dock: `<button class="btn" data-act="openBoard">${icon('board')}Plateau</button><button class="btn btn-gold ${cur === -1 ? 'glow' : ''}" data-act="dawnNuit">${icon('sun')}Le jour se lève</button>`,
  };
};

/* 9.7 Nuit — Classique (appels + actions du MJ) */
SCREENS.cnight = () => {
  const steps = nightStepsClassique();
  if (!G.nightStarted) {
    return {
      body: `<div class="night-intro panel ornate">
          <div class="moon-ico">${icon('moon')}</div>
          <p class="kicker">Nuit ${roman(G.round)}</p>
          <h2 class="h2">${G.round === 1 ? 'La première nuit tombe…' : 'La nuit retombe sur le village…'}</h2>
          <p class="muted">${G.players.filter(p => p.alive).length} survivants. Le maître du jeu garde le téléphone et appelle ${steps.length} rôle${steps.length > 1 ? 's' : ''}.</p>
        </div>`,
      dock: `<button class="btn btn-gold glow" data-act="sleepC">${icon('moon')}Le village s'endort</button>`,
    };
  }
  const done = steps.filter(s => G.cdone[s.id]).length;
  const cur = steps.findIndex(s => !G.cdone[s.id]);
  return {
    body: `<div class="panel nprog"><b>${done}/${steps.length}</b><div class="bar"><i style="width:${steps.length ? done / steps.length * 100 : 100}%"></i></div><span class="faint tiny">appels</span></div>
      <ol class="steps">${steps.map((s, k) => {
        const who = G.players.filter(p => p.alive && stepRoles(s).includes(p.role)).map(p => p.name);
        const status = stepStatus(s);
        return `<li class="panel step ${G.cdone[s.id] ? 'done' : ''} ${k === cur ? 'current' : ''}">
          <button class="chk" data-act="checkC" data-id="${s.id}" aria-label="Valider">${icon('check')}</button>
          <div class="step-body">
            <div class="step-title"><span class="n">${roman(k + 1)}</span>${esc(s.title)}</div>
            <p>${esc(s.text)}</p>
            <div class="tags">${who.map(w => `<span class="badge">${esc(w)}</span>`).join('')}</div>
            ${status ? `<p class="status">${status}</p>` : ''}
          </div>
          <div class="acts">
            <button class="btn icon" data-act="speakC" data-id="${s.id}" aria-label="Lire à voix haute">${icon('speaker')}</button>
            ${s.action ? `<button class="btn icon btn-gold" data-act="actC" data-id="${s.id}" aria-label="Agir">${icon(s.action === 'voyante' ? 'eye' : s.action === 'sorciere' ? 'potion' : 'target')}</button>` : ''}
          </div>
        </li>`;
      }).join('')}</ol>`,
    dock: `<button class="btn btn-gold ${cur === -1 ? 'glow' : ''}" data-act="dawnC">${icon('sun')}Le jour se lève</button>`,
  };
};

/* 9.8 Annonce (Classique) : morts de la nuit, verdict du vote, tir du Chasseur */
SCREENS.announce = () => {
  const A = G.announce, P = G.players;
  const pend = G.pending[0];
  const CAUSE = { nuit: 'retrouvé·e sans vie à l\'aube', vote: 'éliminé·e par le village', chasseur: 'abattu·e par le Chasseur' };
  let choice = '';
  if (pend) {
    const head = pend.type === 'hunter'
      ? `<b>${esc(P[pend.who].name)}</b> était Chasseur ! Il désigne la cible de sa dernière balle.`
      : `Égalité ! <b>${esc(P[pend.who].name)}</b>, le Maire, tranche entre les ex æquo.`;
    const opts = pend.type === 'hunter' ? P.map((p, i) => (p.alive ? i : -1)).filter(i => i >= 0) : pend.options;
    choice = `<section class="panel ornate">
        <div class="panel-title">${icon(pend.type === 'hunter' ? 'target' : 'medal')}${pend.type === 'hunter' ? 'Dernière balle' : 'Le Maire tranche'}</div>
        <p class="sheet-sub">${head}</p>
        <div class="choice-grid">${opts.map(i => `<button class="choice" data-act="resolvePending" data-i="${i}">${avatar(P[i].name)}<b>${esc(P[i].name)}</b></button>`).join('')}</div>
      </section>`;
  }
  const deaths = A.deaths.length
    ? `<div class="deaths">${A.deaths.map(i => `<div class="death">${miniCard(P[i].role, { dead: true })}<b>${esc(P[i].name)}</b><small>${CAUSE[P[i].cause] || ''}</small></div>`).join('')}</div>`
    : '';
  const quiet = !A.deaths.length && !A.lines.length && !pend
    ? `<p class="center muted">${A.kind === 'dawn' ? 'Miracle : personne n\'est mort cette nuit.' : 'Personne n\'est éliminé.'}</p>` : '';
  return {
    body: `<section class="panel ornate banner">
        <p class="kicker">${esc(A.kicker)}</p>
        <h2 style="margin-top:8px">${esc(A.title)}</h2>
        ${A.lines.map(l => `<p>${l}</p>`).join('')}
      </section>
      ${deaths}${quiet}${choice}`,
    dock: `<button class="btn btn-gold" data-act="continueC" ${pend ? 'disabled' : ''}>${A.kind === 'dawn' ? `${icon('sun')}Ouvrir le débat` : `${icon('moon')}Continuer`}</button>`,
  };
};

/* 9.9 Jour : chronomètre de débat */
SCREENS.day = () => {
  const t = G.timer, C = 2 * Math.PI * 90;
  const alive = G.mode === 'classique' ? `<section class="panel"><div class="panel-title">${icon('users')}Survivants · ${G.players.filter(p => p.alive).length}</div>
      <div class="chips">${G.players.map(p => `<span class="chip ${p.alive ? '' : 'dead'}">${avatar(p.name, p.alive ? '' : 'dead')}${esc(p.name)}${p.pardoned ? ' · sans vote' : ''}</span>`).join('')}</div></section>` : '';
  return {
    body: `<div class="day-grid">
        <div class="panel timer ${t.left <= 0 ? 'over' : ''}">
          <svg class="ring" viewBox="0 0 200 200" aria-hidden="true">
            <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F5DE8E"/><stop offset="1" stop-color="#8E7224"/></linearGradient></defs>
            <circle class="track" cx="100" cy="100" r="90"/>
            <circle class="ticks" cx="100" cy="100" r="78"/>
            <circle id="ring" cx="100" cy="100" r="90" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - t.left / t.total)}"/>
          </svg>
          <div class="tc"><div id="tText">${fmtTime(Math.ceil(t.left))}</div><p class="kicker">Débat</p></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="t-ctrl">
            <button class="btn icon" data-act="tAdj" data-d="-30" aria-label="Retirer 30 secondes">−30</button>
            <button class="btn btn-gold icon play" id="tPlay" data-act="tToggle" aria-label="Lecture ou pause">${icon(t.running ? 'pause' : 'play')}</button>
            <button class="btn icon" data-act="tAdj" data-d="30" aria-label="Ajouter 30 secondes">+30</button>
          </div>
          <button class="btn btn-ghost sm" style="align-self:center" data-act="tReset">${icon('reset')}Réinitialiser</button>
          <section class="panel ornate"><p class="muted small">${G.mode === 'nuit'
            ? 'Le village se réveille. Chacun peut <b>dire la vérité… ou mentir</b>. Confrontez vos informations : personne n\'est sûr d\'avoir gardé sa carte.'
            : 'Le village se réveille et débat. Accusez, défendez-vous, et préparez le vote : un seul joueur sera éliminé.'}</p></section>
          ${alive}
        </div>
      </div>`,
    dock: `<button class="btn btn-gold" data-act="toVote">${icon('vote')}Passer au vote</button>`,
  };
};
AFTER.day = () => { updateTimerUI(); if (G.timer.running) runTimer(); };

/* 9.10 Vote (secret, pass & play) */
SCREENS.vote = () => {
  const V = G.vote, P = G.players, vi = V.voters[V.k], voter = P[vi];
  const dots = `<div class="progress">${V.voters.map((_, k) => `<i class="${k < V.k ? 'done' : k === V.k ? 'cur' : ''}"></i>`).join('')}</div>`;
  if (V.stage === 'handoff') {
    return {
      body: `<div class="handoff panel ornate">${avatar(voter.name, 'lg')}<p class="kicker">Vote secret — passez le téléphone à</p><h2>${esc(voter.name)}</h2>${dots}</div>`,
      dock: `<button class="btn btn-gold" data-act="iAmVoter">C'est moi, ${esc(voter.name)}</button>`,
    };
  }
  const targets = P.map((p, i) => i).filter(i => i !== vi && (G.mode === 'nuit' || P[i].alive));
  return {
    body: `<div class="center"><p class="kicker">${esc(voter.name)}${voter.role === 'maire' && (G.mode === 'nuit' || voter.alive) ? ' · voix double' : ''}</p><h2 class="h2" style="margin-top:6px">Qui éliminez-vous ?</h2></div>
      <div class="vote-grid">${targets.map(i => `<button class="vtile ${V.sel === i ? 'sel' : ''}" data-act="pickVote" data-i="${i}">${avatar(P[i].name)}<b>${esc(P[i].name)}</b></button>`).join('')}</div>
      ${dots}`,
    dock: `<button class="btn btn-danger" id="confirmVote" data-act="confirmVote" ${V.sel == null ? 'disabled' : ''}>${icon('check')}Confirmer mon vote</button>`,
  };
};

/* 9.11 Dénouement */
SCREENS.result = () => (G.mode === 'nuit' ? resultNuit() : resultClassique());

function resultNuit() {
  const P = G.players, Rz = G.result;
  const TXT = { village: 'Le village triomphe', loup: 'La meute l\'emporte', neutre: 'Le Tanneur gagne' };
  const main = Rz.winCamps[0] || 'neutre';
  const title = Rz.winCamps.length ? Rz.winCamps.map(c => TXT[c]).join(' & ') : 'Personne ne gagne';
  const dead = Rz.dead.map(i => `<b>${esc(P[i].name)}</b>`);
  const sub = dead.length ? `${dead.join(', ')} ${dead.length > 1 ? 'sont éliminés' : 'est éliminé·e'}.` : 'Personne n\'est éliminé : aucun joueur n\'a recueilli au moins deux voix.';
  const maxV = Math.max(1, ...Rz.counts);
  const order = Rz.counts.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]);
  const flag = i => { const w = playerWinsNuit(i); return w === null ? '<span class="flag unk">À vérifier</span>' : w ? '<span class="flag win">Gagnant</span>' : '<span class="flag lose">Perdant</span>'; };
  return {
    body: `<section class="panel ornate banner camp-${main}">
        <div class="ico">${icon(main === 'loup' ? 'wolf' : main === 'neutre' ? 'skull' : 'trophy')}</div>
        <h2>${title}</h2><p>${sub}</p>
        ${Rz.hunterShots.length ? `<p>Le Chasseur emporte ${Rz.hunterShots.map(i => `<b>${esc(P[i].name)}</b>`).join(', ')} dans sa chute.</p>` : ''}
        ${Rz.saved.length ? `<p>Protégé par le Garde du corps : ${Rz.saved.map(i => `<b>${esc(P[i].name)}</b>`).join(', ')}.</p>` : ''}
      </section>
      <div class="result-grid">
        <section class="panel"><div class="panel-title">${icon('vote')}Votes</div>
          <div class="vbars">${order.map(([c, i]) => `<div class="vbar"><span class="nm">${esc(P[i].name)}</span><span class="tr"><i style="width:${c / maxV * 100}%"></i></span><span class="ct">${c}</span></div>`).join('')}</div></section>
        <section class="panel"><div class="panel-title">${icon('cards')}Cartes du centre</div>
          <div class="center-cards">${G.center.map(id => miniCard(id)).join('')}</div></section>
      </div>
      <section class="roster">${P.map((p, i) => `<div class="panel rv">${miniCard(p.role)}<div class="info"><b>${esc(p.name)}</b>
          <small>${p.role === p.start ? esc(R[p.role].nom) : `${esc(R[p.start].nom)} → <b style="display:inline;font-size:12.5px">${esc(R[p.role].nom)}</b>`}</small>
          <small class="faint">Vote : ${G.vote.ballots[i] != null ? esc(P[G.vote.ballots[i]].name) : '—'}</small></div>
          <div class="flags">${Rz.dead.includes(i) ? '<span class="flag dead">Éliminé</span>' : ''}${flag(i)}</div></div>`).join('')}</section>`,
    dock: `<button class="btn" data-act="goHome">Accueil</button><button class="btn btn-gold" data-act="replay">${icon('reset')}Rejouer</button>`,
  };
}

function resultClassique() {
  const P = G.players, w = G.winner;
  const TXT = { village: 'Le village est sauvé', loup: 'Les Loups dévorent le village', aucun: 'Le village est désert' };
  const cls = w === 'loup' ? 'loup' : 'village';
  const wins = p => (w === 'aucun' ? false : (isWolfTeam(p) ? w === 'loup' : w === 'village'));
  return {
    body: `<section class="panel ornate banner camp-${cls}">
        <div class="ico">${icon(w === 'loup' ? 'wolf' : 'trophy')}</div>
        <h2>${TXT[w]}</h2>
        <p>Fin de partie au ${G.lastPhase === 'vote' ? 'jour' : 'matin du jour'} ${G.round} · ${P.filter(p => p.alive).length} survivant${P.filter(p => p.alive).length > 1 ? 's' : ''}.</p>
      </section>
      <section class="roster">${P.map(p => `<div class="panel rv">${miniCard(p.role, { dead: !p.alive })}<div class="info"><b>${esc(p.name)}</b>
          <small>${p.role === p.start ? esc(R[p.role].nom) : `${esc(R[p.start].nom)} → ${esc(R[p.role].nom)}`}${p.role === 'enfant-sauvage' && G.wildTurned ? ' (devenu Loup)' : ''}</small></div>
          <div class="flags">${p.alive ? '' : '<span class="flag dead">Mort</span>'}${wins(p) ? '<span class="flag win">Gagnant</span>' : '<span class="flag lose">Perdant</span>'}</div></div>`).join('')}</section>
      <section class="panel"><div class="panel-title">${icon('book')}Chronique</div>
        <ul class="chronicle">${G.chronicle.map(c => `<li>${c}</li>`).join('')}</ul></section>`,
    dock: `<button class="btn" data-act="goHome">Accueil</button><button class="btn btn-gold" data-act="replay">${icon('reset')}Rejouer</button>`,
  };
}

/* 9.12 Paramètres */
SCREENS.settings = () => {
  const st = S.settings;
  const sw = (k, t, s) => `<label class="setting"><span><b>${t}</b><small>${s}</small></span><input type="checkbox" class="switch" data-set="${k}" ${st[k] ? 'checked' : ''}></label>`;
  return `<section class="panel ornate">
      <div class="panel-title">${icon('sun')}Débat</div>
      <div class="row between"><span><b>Durée par défaut</b></span><b id="timerVal" style="font-family:var(--f-title);color:var(--gold-light)">${fmtTime(st.timer)}</b></div>
      <input type="range" class="range" min="60" max="900" step="30" value="${st.timer}" data-set="timer" aria-label="Durée du débat">
    </section>
    <section class="panel ornate">
      <div class="panel-title">${icon('gear')}Partie</div>
      ${sw('voice', 'Narration vocale', 'Le téléphone lit les appels de nuit (voix française)')}
      ${sw('haptics', 'Vibrations', 'Retours haptiques sur les appareils compatibles')}
      ${sw('secretVote', 'Vote secret', 'Chaque joueur vote seul en se passant le téléphone')}
    </section>
    <section class="panel">
      <div class="panel-title">${icon('trash')}Données</div>
      <div class="row wrap"><button class="btn sm btn-danger" data-act="resetDecks">Supprimer mes decks</button><button class="btn sm" data-act="clearPlayers">Oublier les joueurs</button></div>
    </section>`;
};

/* 9.13 Règles */
SCREENS.rules = () => `<div class="rules">
    <section class="panel ornate"><div class="panel-title">${icon('sunmoon')}Mode Classique</div>
      <p>Une carte par joueur (deux de plus au centre si le <b>Voleur</b> est présent). Les nuits et les jours s'enchaînent :</p>
      <ul><li><b>La nuit</b>, le maître du jeu appelle les rôles. Les Loups désignent une victime, la Voyante sonde un joueur, la Sorcière peut sauver ou empoisonner.</li>
        <li><b>À l'aube</b>, les morts sont révélés. Le Chasseur tire une dernière balle.</li>
        <li><b>Le jour</b>, débat chronométré puis vote. Le Maire compte double et tranche les égalités.</li>
        <li>Le <b>village</b> gagne quand tous les Loups sont morts ; les <b>Loups</b> gagnent dès qu'ils sont aussi nombreux que les autres survivants.</li></ul></section>
    <section class="panel ornate"><div class="panel-title">${icon('moon')}Pour une Nuit</div>
      <p>Le paquet contient toujours <b>joueurs + 3</b> cartes : 3 dorment au centre. Une seule nuit, où les cartes peuvent être échangées, puis un seul vote.</p>
      <ul><li>On gagne avec la carte qu'on a <b>à la fin de la nuit</b>, pas celle reçue au départ.</li>
        <li>Le joueur le plus désigné meurt (au moins deux voix ; égalité = tous les ex æquo).</li>
        <li><b>Village</b> : au moins un Loup meurt. <b>Loups</b> : aucun Loup ni le Tanneur ne meurt. <b>Tanneur</b> : il est éliminé.</li></ul></section>
    <section class="panel ornate"><div class="panel-title">${icon('scale')}Équilibrage automatique</div>
      <p>L'application complète ou réduit votre deck pour obtenir exactement le bon nombre de cartes, ajuste la meute (Une Nuit : 2 Loups jusqu'à 7 joueurs, puis 3, 4, 5 ; Classique : environ 1 Loup pour 4 à 5 joueurs) et garde toujours les Francs-maçons par paire.</p></section>
  </div>`;

/* --------------------------------------------------------------------------
   10. LOGIQUE « POUR UNE NUIT »
   -------------------------------------------------------------------------- */
function nightStepsNuit() { return NIGHT_NUIT.filter(s => s.ids.some(id => G.cards.includes(id))); }

/* Plateau du MJ : positions 0..n-1 = joueurs, n..n+2 = centre */
const getCard = pos => (pos < G.players.length ? G.players[pos].role : G.center[pos - G.players.length]);
const setCard = (pos, id) => { if (pos < G.players.length) G.players[pos].role = id; else G.center[pos - G.players.length] = id; };
const posLabel = pos => (pos < G.players.length ? G.players[pos].name : `Centre ${pos - G.players.length + 1}`);
let peekTimer;
function renderBoard() {
  const B = G.board, n = G.players.length;
  const slots = [...G.players.map((_, i) => i), n, n + 1, n + 2];
  openSheet(`<div class="sheet-head"><h3>Plateau du MJ</h3><button class="btn icon btn-ghost" data-act="closeSheet" aria-label="Fermer">${icon('x')}</button></div>
    <p class="sheet-sub">Seul le joueur appelé regarde l'écran. Les échanges modifient les cartes réelles de fin de nuit.</p>
    <div class="seg">
      <button class="${B.mode === 'peek' ? 'on' : ''}" data-act="boardMode" data-m="peek">${icon('eye')}Regarder</button>
      <button class="${B.mode === 'swap' ? 'on' : ''}" data-act="boardMode" data-m="swap">${icon('swap')}Échanger</button>
    </div>
    <div class="slots">${slots.map(pos => `<button class="slot ${B.sel === pos ? 'sel' : ''}" data-act="slot" data-pos="${pos}">
        ${B.peek === pos ? miniCard(getCard(pos)) : miniBack()}<span class="slot-label">${esc(posLabel(pos))}</span></button>`).join('')}</div>
    <div class="row"><button class="btn sm grow" data-act="shift" data-d="-1">${icon('left')}Décaler</button><button class="btn sm grow" data-act="shift" data-d="1">Décaler${icon('right')}</button></div>
    <p class="tiny faint" style="margin-top:8px">« Décaler » applique le pouvoir de l'Idiot du village à toutes les cartes des joueurs.</p>
    <div class="blog">${B.log.slice(-4).reverse().map(l => `<div>• ${esc(l)}</div>`).join('')}</div>`);
}

function evaluateNuit() {
  const P = G.players, n = P.length, ballots = G.vote.ballots;
  const counts = Array(n).fill(0);
  P.forEach((p, i) => { const t = ballots[i]; if (t != null) counts[t] += p.role === 'maire' ? 2 : 1; });
  // Garde du corps : sa cible ne peut pas mourir
  const prot = new Set(P.map((p, i) => (p.role === 'garde-du-corps' ? ballots[i] : null)).filter(x => x != null));
  let maxC = 0; counts.forEach((c, i) => { if (!prot.has(i)) maxC = Math.max(maxC, c); });
  let dead = maxC >= 2 ? counts.map((c, i) => (c === maxC && !prot.has(i) ? i : -1)).filter(i => i >= 0) : [];
  const top = Math.max(...counts);
  const saved = [...prot].filter(i => counts[i] === top && top >= 2);
  // Chasseur : sa cible meurt avec lui
  const hunterShots = [];
  dead.forEach(d => { if (P[d].role === 'chasseur') { const t = ballots[d]; if (t != null && !dead.includes(t) && !prot.has(t) && !hunterShots.includes(t)) hunterShots.push(t); } });
  dead = [...dead, ...hunterShots];

  const isW = i => isWolfId(P[i].role);
  const wolvesInPlay = P.some((_, i) => isW(i));
  const sbire = P.findIndex(p => p.role === 'sbire');
  const tannerDead = dead.some(i => P[i].role === 'tanneur');
  let villageWins, wolvesWin;
  if (wolvesInPlay) {
    villageWins = dead.some(isW);
    wolvesWin = !villageWins && !tannerDead;
  } else if (sbire >= 0) {
    villageWins = dead.includes(sbire) || dead.length === 0;
    wolvesWin = !dead.includes(sbire) && !tannerDead && dead.length > 0;
  } else {
    villageWins = dead.length === 0;
    wolvesWin = false;
  }
  const winCamps = [];
  if (tannerDead) winCamps.push('neutre');
  if (villageWins) winCamps.push('village');
  if (wolvesWin) winCamps.push('loup');
  return { counts, dead, saved, hunterShots, villageWins, wolvesWin, tannerDead, winCamps };
}
function playerWinsNuit(i) {
  const p = G.players[i], Rz = G.result;
  if (p.role === 'doppelganger' || p.role === 'enqueteur') return null; // dépend de ce qu'ils ont vu
  if (p.role === 'tanneur') return Rz.dead.includes(i);
  return R[p.role].camp === 'Loup' ? Rz.wolvesWin : Rz.villageWins;
}

/* --------------------------------------------------------------------------
   11. LOGIQUE « CLASSIQUE »
   -------------------------------------------------------------------------- */
const isWolfTeam = p => isWolfId(p.role) || (p.role === 'enfant-sauvage' && G.wildTurned);
const stepRoles = s => (s.id === 'loups' && G.wildTurned ? [...s.ids, 'enfant-sauvage'] : s.ids);

function nightStepsClassique() {
  return NIGHT_CLASSIQUE.filter(s => {
    if (s.first && G.round !== 1) return false;
    if (s.id === 'voleur') return G.players.some(p => p.alive && p.start === 'voleur');
    return G.players.some(p => p.alive && stepRoles(s).includes(p.role));
  });
}
function stepStatus(s) {
  const P = G.players, N = G.na;
  const nm = i => `<b>${esc(P[i].name)}</b>`;
  switch (s.id) {
    case 'voleur': return N.thief == null ? '' : N.thief === 'keep' ? 'A gardé sa carte.' : `Nouvelle carte : <b>${esc(R[N.thief].nom)}</b>`;
    case 'enfant': return G.wildModel != null ? `Modèle : ${nm(G.wildModel)}` : '';
    case 'garde': return N.guard != null ? `Protégé : ${nm(N.guard)}` : (G.lastGuard != null ? `<span class="faint">Ne peut pas protéger ${esc(P[G.lastGuard].name)} deux fois de suite</span>` : '');
    case 'loups': return N.victim != null ? `Victime : ${nm(N.victim)}` : '';
    case 'voyante': return N.seen != null ? `Sondé : ${nm(N.seen)} — ${esc(R[P[N.seen].role].nom)}` : '';
    case 'sorciere': {
      const bits = [];
      if (N.save) bits.push('Potion de vie utilisée');
      if (N.poison != null) bits.push(`Empoisonné : ${nm(N.poison)}`);
      if (!bits.length) bits.push(`Potions : ${G.potions.life ? 'vie ✓' : 'vie ✗'} · ${G.potions.death ? 'mort ✓' : 'mort ✗'}`);
      return bits.join(' · ');
    }
    default: return '';
  }
}

/* Feuille « choisir un joueur » réutilisable */
function pickPlayer({ title, sub, allow, onPick, selected }) {
  const P = G.players;
  S.sheet = { onPick };
  openSheet(`<div class="sheet-head"><h3>${esc(title)}</h3><button class="btn icon btn-ghost" data-act="closeSheet" aria-label="Fermer">${icon('x')}</button></div>
    ${sub ? `<p class="sheet-sub">${sub}</p>` : ''}
    <div class="choice-grid">${P.map((p, i) => p.alive ? `<button class="choice ${selected === i ? 'on' : ''}" data-act="pickDone" data-i="${i}" ${allow(i) ? '' : 'disabled'}>${avatar(p.name)}<b>${esc(p.name)}</b></button>` : '').join('')}</div>`);
}

/* Actions de nuit (bouton doré de chaque étape) */
function actClassique(id) {
  const P = G.players, N = G.na;
  const selfIdx = role => P.findIndex(p => p.alive && p.role === role);
  const mark = () => { G.cdone[id] = true; closeSheet(); render(); };
  switch (id) {
    case 'voleur': {
      const thief = P.findIndex(p => p.alive && p.start === 'voleur');
      const bothWolves = G.center.every(isWolfId);
      S.sheet = {
        onSlot: k => {
          const taken = G.center[k]; G.center[k] = P[thief].role; P[thief].role = taken; N.thief = taken; mark();
          toast(`Le Voleur devient ${R[taken].nom}`);
        },
        onKeep: () => { N.thief = 'keep'; mark(); },
      };
      openSheet(`<div class="sheet-head"><h3>Les cartes du centre</h3><button class="btn icon btn-ghost" data-act="closeSheet">${icon('x')}</button></div>
        <p class="sheet-sub">Montrez cet écran au Voleur (${esc(P[thief].name)}). Il touche la carte qu'il prend.${bothWolves ? ' <b>Deux Loups : il doit en prendre un.</b>' : ''}</p>
        <div class="center-cards" style="grid-template-columns:repeat(2,minmax(0,120px))">${G.center.map((cid, k) => `<button data-act="thiefSlot" data-k="${k}">${miniCard(cid)}</button>`).join('')}</div>
        <button class="btn block" style="margin-top:16px" data-act="thiefKeep" ${bothWolves ? 'disabled' : ''}>Garder ma carte</button>`);
      break;
    }
    case 'enfant': {
      const me = selfIdx('enfant-sauvage');
      pickPlayer({ title: 'Modèle de l\'Enfant Sauvage', sub: 'S\'il meurt, l\'Enfant Sauvage rejoindra la meute.', allow: i => i !== me, selected: G.wildModel,
        onPick: i => { G.wildModel = i; mark(); } });
      break;
    }
    case 'garde':
      pickPlayer({ title: 'Protection de la nuit', sub: 'Le joueur protégé ne peut pas être dévoré cette nuit.', allow: i => i !== G.lastGuard, selected: N.guard,
        onPick: i => { N.guard = i; mark(); } });
      break;
    case 'loups':
      pickPlayer({ title: 'Victime des Loups', sub: 'Les Loups désignent en silence le joueur à dévorer.', allow: i => !isWolfTeam(P[i]), selected: N.victim,
        onPick: i => { N.victim = i; mark(); } });
      break;
    case 'voyante': {
      const me = selfIdx('voyante');
      pickPlayer({ title: 'Vision de la Voyante', sub: 'Touchez un joueur : son rôle s\'affichera pour la Voyante.', allow: i => i !== me, selected: N.seen,
        onPick: i => {
          N.seen = i; G.cdone[id] = true;
          S.sheet = null;
          openSheet(`<div class="role-sheet">${miniCard(P[i].role)}<p class="kicker">${esc(P[i].name)} est</p><h3>${esc(R[P[i].role].nom)}</h3>
            <button class="btn btn-gold block" data-act="closeSheetRender">J'ai vu</button></div>`);
        } });
      break;
    }
    case 'sorciere': {
      const v = N.victim;
      const me = selfIdx('sorciere');
      S.sheet = {
        onSave: () => { N.save = true; G.potions.life = false; toast('Potion de vie utilisée'); actClassique('sorciere'); render(); },
        onPoison: () => pickPlayer({ title: 'Potion de mort', sub: 'Le joueur empoisonné mourra à l\'aube.', allow: i => i !== me, selected: N.poison,
          onPick: i => { N.poison = i; G.potions.death = false; mark(); toast('Potion de mort utilisée'); } }),
        onDone: () => mark(),
      };
      openSheet(`<div class="sheet-head"><h3>La Sorcière</h3><button class="btn icon btn-ghost" data-act="closeSheet">${icon('x')}</button></div>
        <p class="sheet-sub">${v != null ? `Victime des Loups cette nuit : <b>${esc(P[v].name)}</b>${N.save ? ' — sauvée ✓' : ''}` : 'Les Loups n\'ont désigné aucune victime.'}</p>
        <div style="display:grid;gap:10px">
          <button class="btn" data-act="witchSave" ${G.potions.life && v != null && !N.save ? '' : 'disabled'}>${icon('potion')}Potion de vie${G.potions.life ? '' : ' (utilisée)'}</button>
          <button class="btn btn-danger" data-act="witchPoison" ${G.potions.death ? '' : 'disabled'}>${icon('skull')}Potion de mort${G.potions.death ? '' : ' (utilisée)'}</button>
          <button class="btn btn-gold" data-act="witchDone">Terminer</button>
        </div>`);
      break;
    }
  }
}

function startClassicNight() {
  G.nightStarted = false;
  G.na = { guard: null, victim: null, save: false, poison: null, seen: null, thief: null };
  G.cdone = {};
  go('cnight', { replace: true });
}

/* Mort d'un joueur (Classique) : révélation, Chasseur, Enfant Sauvage */
function kill(i, cause) {
  const p = G.players[i];
  if (!p.alive) return;
  p.alive = false; p.cause = cause;
  G.announce.deaths.push(i);
  const when = G.announce.kind === 'dawn' ? `Nuit ${G.round}` : `Jour ${G.round}`;
  const how = { nuit: 'mort·e dans la nuit', vote: 'éliminé·e au vote', chasseur: 'abattu·e par le Chasseur' }[cause];
  G.chronicle.push(`${when} — <b>${esc(p.name)}</b> (${esc(R[p.role].nom)}) ${how}.`);
  if (p.role === 'chasseur') G.pending.push({ type: 'hunter', who: i });
  if (G.wildModel === i && G.players.some(q => q.alive && q.role === 'enfant-sauvage') && !G.wildTurned) {
    G.wildTurned = true;
    G.chronicle.push(`${when} — l'Enfant Sauvage perd son modèle et rejoint secrètement la meute.`);
  }
}

function resolveNightClassique() {
  const N = G.na;
  G.announce = { kind: 'dawn', kicker: `Aube du jour ${roman(G.round)}`, title: 'Le village se réveille…', deaths: [], lines: [] };
  G.pending = [];
  if (N.victim != null && N.victim !== N.guard && !N.save) kill(N.victim, 'nuit');
  if (N.poison != null) kill(N.poison, 'nuit');
  G.lastGuard = N.guard;
  if (!G.announce.deaths.length) G.chronicle.push(`Nuit ${G.round} — personne ne meurt.`);
  say(G.announce.deaths.length ? `Le village se réveille. Cette nuit, ${G.announce.deaths.map(i => G.players[i].name).join(' et ')} ${G.announce.deaths.length > 1 ? 'sont morts' : 'est mort'}.` : 'Le village se réveille. Personne n\'est mort cette nuit.');
  go('announce', { replace: true });
}

function classicVoteDone() {
  const P = G.players, b = G.vote.ballots, counts = Array(P.length).fill(0);
  Object.entries(b).forEach(([v, t]) => { counts[t] += P[v].role === 'maire' ? 2 : 1; });
  const max = Math.max(0, ...counts);
  const top = max > 0 ? counts.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0) : [];
  G.announce = { kind: 'vote', kicker: `Jour ${roman(G.round)}`, title: 'Le verdict du village', deaths: [], lines: [] };
  G.pending = [];
  G.lastPhase = 'vote';
  const tally = counts.map((c, i) => [c, i]).filter(x => x[0] > 0).sort((a, b2) => b2[0] - a[0]).map(([c, i]) => `${esc(P[i].name)} ${c}`).join(' · ');
  if (tally) G.announce.lines.push(`<span class="faint">${tally}</span>`);
  if (top.length === 1) eliminate(top[0]);
  else if (top.length > 1) {
    const mayor = P.findIndex(p => p.alive && p.role === 'maire');
    if (mayor >= 0) G.pending.push({ type: 'tiebreak', who: mayor, options: top });
    else { G.announce.lines.push('Égalité : le village n\'arrive pas à se décider. Personne n\'est éliminé.'); G.chronicle.push(`Jour ${G.round} — égalité, personne n'est éliminé.`); }
  }
  go('announce', { replace: true });
}

function eliminate(i) {
  const p = G.players[i];
  if (p.role === 'idiot-du-village' && !p.pardoned) {
    p.pardoned = true; p.canVote = false;
    G.announce.lines.push(`<b>${esc(p.name)}</b> est l'Idiot du village ! Le village l'épargne… mais il ne votera plus jamais.`);
    G.chronicle.push(`Jour ${G.round} — <b>${esc(p.name)}</b>, Idiot du village, est gracié.`);
    return;
  }
  kill(i, 'vote');
}

function checkWinClassique() {
  const alive = G.players.filter(p => p.alive);
  const w = alive.filter(isWolfTeam).length, o = alive.length - w;
  if (!alive.length) return 'aucun';
  if (w === 0) return 'village';
  if (w >= o) return 'loup';
  return null;
}

/* --------------------------------------------------------------------------
   12. ÉLÉMENTS PARTAGÉS
   -------------------------------------------------------------------------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1); crypto.getRandomValues(r);
    const j = r[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  const n = S.players.length;
  if (n < CONFIG.minPlayers) return toast(`Minimum ${CONFIG.minPlayers} joueurs`);
  const b = balanceDeck(S.mode, currentDeck().counts, n);
  const dealt = shuffle(b.cards);
  G = {
    mode: S.mode,
    cards: b.cards,
    players: S.players.map((name, i) => ({ name, role: dealt[i], start: dealt[i], alive: true, canVote: true })),
    center: dealt.slice(n),
    deal: { i: 0, stage: 'handoff', flipped: false, seen: false },
    timer: { total: S.settings.timer, left: S.settings.timer, running: false, end: 0 },
    vote: null,
    // Une Nuit
    night: { started: false, done: {} },
    board: { mode: 'peek', sel: null, peek: null, log: [] },
    // Classique
    round: 1, potions: { life: true, death: true }, lastGuard: null, wildModel: null, wildTurned: false,
    chronicle: [], pending: [], announce: null,
  };
  keepAwake(true);
  S.stack = [];
  go('deal', { replace: true });
}

function startDay() {
  G.timer = { total: S.settings.timer, left: S.settings.timer, running: false, end: 0 };
  go('day', { replace: true });
}

function startVote() {
  stopTimer();
  const voters = G.mode === 'nuit'
    ? G.players.map((_, i) => i)
    : G.players.map((p, i) => (p.alive && p.canVote ? i : -1)).filter(i => i >= 0);
  G.vote = { voters, k: 0, stage: S.settings.secretVote ? 'handoff' : 'pick', ballots: {}, sel: null };
  if (!voters.length) return finishVote();
  say('Le débat est clos. Votez maintenant.');
  go('vote', { replace: true });
}
function finishVote() {
  if (G.mode === 'nuit') { G.result = evaluateNuit(); keepAwake(false); go('result', { replace: true }); }
  else classicVoteDone();
}

/* Chronomètre (basé sur l'horloge réelle : fiable même si l'écran se met en veille) */
let timerInt = null;
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function runTimer() { clearInterval(timerInt); timerInt = setInterval(tick, 200); }
function startTimer() { const t = G.timer; if (t.left <= 0) t.left = t.total; t.running = true; t.end = Date.now() + t.left * 1000; runTimer(); updateTimerUI(); }
function pauseTimer() { const t = G.timer; t.left = Math.max(0, (t.end - Date.now()) / 1000); t.running = false; clearInterval(timerInt); updateTimerUI(); }
function stopTimer() { if (G && G.timer && G.timer.running) pauseTimer(); clearInterval(timerInt); }
function tick() {
  const t = G && G.timer; if (!t) { clearInterval(timerInt); return; }
  t.left = Math.max(0, (t.end - Date.now()) / 1000);
  if (t.left <= 0) { t.running = false; clearInterval(timerInt); chime(); haptic([250, 120, 250]); say('Le temps est écoulé. Passez au vote.'); }
  updateTimerUI();
}
function updateTimerUI() {
  const t = G && G.timer, el = $('#tText'); if (!t || !el) return;
  el.textContent = fmtTime(Math.ceil(t.left));
  const C = 2 * Math.PI * 90;
  $('#ring').style.strokeDashoffset = C * (1 - t.left / t.total);
  $('#tPlay').innerHTML = icon(t.running ? 'pause' : 'play');
  const box = $('.timer');
  box.classList.toggle('urgent', t.left <= 30 && t.left > 0);
  box.classList.toggle('over', t.left <= 0);
}

/* Voix (synthèse vocale française) */
function say(text) {
  if (!S.settings.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = .92; u.pitch = .85;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { /* voix indisponible */ }
}
/* Carillon de fin de débat (Web Audio, débloqué au premier geste) */
let AC = null;
function unlockAudio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume(); } catch (e) { /* audio indisponible */ } }
function chime() {
  if (!AC) return;
  try {
    [523.25, 659.25, 783.99].forEach((f, k) => {
      const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + k * .22;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.28, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .9);
      o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + 1);
    });
  } catch (e) { /* ignore */ }
}
const haptic = p => { if (S.settings.haptics && navigator.vibrate) navigator.vibrate(p); };
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { /* non supporté */ }
}

/* Feuille modale, confirmation, toast */
function openSheet(html) {
  const sh = $('#sheet');
  sh.querySelector('.sheet-card').innerHTML = html;
  sh.classList.add('open'); sh.setAttribute('aria-hidden', 'false');
}
function closeSheet() {
  const sh = $('#sheet');
  sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true');
  S.sheet = null; clearTimeout(peekTimer);
}
function confirmSheet(title, text, ok, cb) {
  S.sheet = { onOk: cb };
  openSheet(`<div class="sheet-head"><h3>${esc(title)}</h3></div><p class="sheet-sub">${esc(text)}</p>
    <div class="row"><button class="btn grow" data-act="closeSheet">Annuler</button><button class="btn btn-danger grow" data-act="sheetOk">${esc(ok)}</button></div>`);
}
function roleSheet(id, mode) {
  openSheet(`<div class="sheet-head"><span></span><button class="btn icon btn-ghost" data-act="closeSheet" aria-label="Fermer">${icon('x')}</button></div>
    <div class="role-sheet camp-${cc(id)}">${miniCard(id)}<span class="badge"><i class="dot"></i>${CAMP_LABEL[R[id].camp]}</span>
    <h3>${esc(R[id].nom)}</h3><p>${esc(descOf(id, mode))}</p></div>`);
}
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2300);
}

/* --------------------------------------------------------------------------
   13. ACTIONS (un seul écouteur, attribut data-act)
   -------------------------------------------------------------------------- */
const A = {
  back,
  goto: el => go(el.dataset.to),
  goHome: endGame,
  setMode(el) { S.mode = el.dataset.mode; saveAll(); haptic(8); render(); },

  /* Feuilles */
  sheetBg(el, e) { if (e.target === el) closeSheet(); },
  closeSheet,
  closeSheetRender() { closeSheet(); render(); },
  sheetOk() { const cb = S.sheet && S.sheet.onOk; closeSheet(); cb && cb(); },
  roleInfo(el) { roleSheet(el.dataset.id, S.draft ? S.draft.mode : S.mode); },
  pickDone(el) { const cb = S.sheet && S.sheet.onPick; cb && cb(+el.dataset.i); },

  /* Préparation */
  addPlayer() {
    const inp = $('#pName'); const v = (inp.value || '').trim().replace(/\s+/g, ' ');
    if (!v) return inp.focus();
    if (S.players.length >= CONFIG.maxPlayers) return toast(`${CONFIG.maxPlayers} joueurs maximum`);
    if (S.players.some(p => p.toLowerCase() === v.toLowerCase())) return toast('Ce prénom est déjà pris');
    S.players.push(v); saveAll(); S.focusName = true; haptic(10); render();
  },
  rmPlayer(el) { S.players.splice(+el.dataset.i, 1); saveAll(); render(); },
  clearPlayers() { S.players = []; saveAll(); render(); toast('Liste des joueurs vidée'); },
  pickDeck(el) { S.deckSel[S.mode] = el.dataset.id; saveAll(); render(); },
  startGame,

  /* Decks */
  newDeck() { S.draft = { id: 'u' + Date.now(), mode: S.mode, name: '', counts: {} }; go('deckEdit'); },
  editDeck(el) { const d = S.custom.find(x => x.id === el.dataset.id); if (!d) return; S.draft = { ...d, counts: { ...d.counts } }; go('deckEdit'); },
  dupDeck(el) {
    const d = decksFor(S.mode).find(x => x.id === el.dataset.id); if (!d) return;
    S.draft = { id: 'u' + Date.now(), mode: S.mode, name: `${d.name} (copie)`.slice(0, 28), counts: { ...d.counts } }; go('deckEdit');
  },
  delDeck(el) {
    const d = S.custom.find(x => x.id === el.dataset.id); if (!d) return;
    confirmSheet('Supprimer ce deck ?', `« ${d.name} » sera définitivement supprimé.`, 'Supprimer', () => {
      S.custom = S.custom.filter(x => x.id !== d.id);
      if (S.deckSel[d.mode] === d.id) S.deckSel[d.mode] = MODES[d.mode].defaultDecks[0].id;
      saveAll(); render(); toast('Deck supprimé');
    });
  },
  toggleRole(el) {
    const id = el.dataset.id, c = S.draft.counts;
    if (R[id].multiple) { A.inc(el); return; }
    if (c[id]) delete c[id]; else c[id] = 1;
    haptic(8); render();
  },
  inc(el) {
    const id = el.dataset.id, c = S.draft.counts, max = MODES[S.draft.mode].maxCopies[id] ?? 8;
    c[id] = Math.min(max, (c[id] || 0) + 1); haptic(8); render();
  },
  dec(el) { const id = el.dataset.id, c = S.draft.counts; if (c[id] > 1) c[id]--; else delete c[id]; haptic(8); render(); },
  saveDeck() {
    const d = S.draft, name = ($('#dName').value || '').trim();
    const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
    if (!name) { $('#dName').focus(); return toast('Donnez un nom au deck'); }
    if (total < 3) return toast('Choisissez au moins 3 cartes');
    const deck = { id: d.id, mode: d.mode, name, counts: { ...d.counts } };
    const k = S.custom.findIndex(x => x.id === d.id);
    if (k >= 0) S.custom[k] = deck;
    else {
      if (S.custom.filter(x => x.mode === d.mode).length >= CONFIG.maxCustomDecks) return toast(`${CONFIG.maxCustomDecks} decks maximum par mode`);
      S.custom.push(deck);
    }
    S.deckSel[d.mode] = deck.id; saveAll(); S.draft = null; toast('Deck enregistré'); back();
  },

  /* Distribution */
  iAm() { G.deal.stage = 'card'; render(); },
  flip() {
    const d = G.deal;
    if (d.flipped) return;            // retourner face cachée = bouton « Cacher »
    d.flipped = true; d.seen = true; haptic(15); updateDealUI();
    // Petits écrans (iPhone SE) : amène la description du pouvoir à l'écran
    setTimeout(() => { const ri = $('#revealInfo'); ri && ri.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 650);
  },
  hideCard() { G.deal.flipped = false; haptic(10); updateDealUI(); },
  nextDeal() {
    const d = G.deal;
    if (d.i >= G.players.length - 1) {
      if (G.mode === 'nuit') go('night', { replace: true }); else startClassicNight();
      return;
    }
    G.deal = { i: d.i + 1, stage: 'handoff', flipped: false, seen: false }; render();
  },

  /* Nuit — Une Nuit */
  sleep() {
    const steps = nightStepsNuit(); G.night.started = true; unlockAudio();
    say(`Tout le monde ferme les yeux. Le village s'endort. ${steps[0] ? steps[0].text : ''}`); render();
  },
  checkStep(el) {
    const k = +el.dataset.k, steps = nightStepsNuit();
    G.night.done[k] = !G.night.done[k]; haptic(10);
    if (G.night.done[k]) { const nx = steps.findIndex((_, j) => !G.night.done[j]); say(nx === -1 ? 'Tous les rôles ont été appelés.' : steps[nx].text); }
    render();
  },
  speak(el) { const s = nightStepsNuit()[+el.dataset.k]; s && say(s.text); },
  openBoard() { G.board.sel = null; G.board.peek = null; renderBoard(); },
  boardMode(el) { G.board.mode = el.dataset.m; G.board.sel = null; G.board.peek = null; renderBoard(); },
  slot(el) {
    const B = G.board, pos = +el.dataset.pos;
    if (B.mode === 'peek') {
      B.peek = pos; haptic(10); renderBoard(); clearTimeout(peekTimer);
      peekTimer = setTimeout(() => { B.peek = null; if ($('#sheet').classList.contains('open') && $('.slots')) renderBoard(); }, 2600);
      return;
    }
    if (B.sel == null) B.sel = pos;
    else if (B.sel === pos) B.sel = null;
    else {
      const a = getCard(B.sel), c = getCard(pos); setCard(B.sel, c); setCard(pos, a);
      B.log.push(`Échange : ${posLabel(B.sel)} ↔ ${posLabel(pos)}`); B.sel = null; haptic([15, 40, 15]); toast('Cartes échangées');
    }
    renderBoard();
  },
  shift(el) {
    const P = G.players, n = P.length, d = +el.dataset.d, old = P.map(p => p.role);
    P.forEach((p, i) => { p.role = old[(i - d + n) % n]; });
    G.board.log.push(`Décalage vers la ${d > 0 ? 'droite' : 'gauche'}`); haptic(20); toast('Cartes décalées'); renderBoard();
  },
  dawnNuit() {
    const pending = nightStepsNuit().some((_, k) => !G.night.done[k]);
    const goDay = () => { say('Tout le monde se réveille ! Le jour se lève sur le village.'); startDay(); };
    if (pending) confirmSheet('Lever le jour ?', 'Certains rôles n\'ont pas encore été appelés.', 'Le jour se lève', goDay); else goDay();
  },

  /* Nuit — Classique */
  sleepC() {
    G.nightStarted = true; unlockAudio();
    const steps = nightStepsClassique();
    say(`Tout le monde ferme les yeux. Le village s'endort. ${steps[0] ? steps[0].text : ''}`); render();
  },
  checkC(el) {
    const id = el.dataset.id; G.cdone[id] = !G.cdone[id]; haptic(10);
    if (G.cdone[id]) { const nx = nightStepsClassique().find(s => !G.cdone[s.id]); say(nx ? nx.text : 'Tous les rôles ont été appelés.'); }
    render();
  },
  speakC(el) { const s = NIGHT_CLASSIQUE.find(x => x.id === el.dataset.id); s && say(s.text); },
  actC(el) { actClassique(el.dataset.id); },
  thiefSlot(el) { S.sheet && S.sheet.onSlot && S.sheet.onSlot(+el.dataset.k); },
  thiefKeep() { S.sheet && S.sheet.onKeep && S.sheet.onKeep(); },
  witchSave() { S.sheet && S.sheet.onSave && S.sheet.onSave(); },
  witchPoison() { S.sheet && S.sheet.onPoison && S.sheet.onPoison(); },
  witchDone() { S.sheet && S.sheet.onDone && S.sheet.onDone(); },
  dawnC() {
    const steps = nightStepsClassique();
    const missing = steps.filter(s => s.id === 'loups' && G.na.victim == null);
    const pending = steps.some(s => !G.cdone[s.id]);
    if (missing.length) return confirmSheet('Aucune victime ?', 'Les Loups n\'ont désigné personne. Lever quand même le jour ?', 'Le jour se lève', resolveNightClassique);
    if (pending) return confirmSheet('Lever le jour ?', 'Certains rôles n\'ont pas encore été appelés.', 'Le jour se lève', resolveNightClassique);
    resolveNightClassique();
  },
  resolvePending(el) {
    const i = +el.dataset.i, pend = G.pending.shift();
    if (pend.type === 'hunter') kill(i, 'chasseur');
    else eliminate(i);
    haptic(20); render();
  },
  continueC() {
    if (G.pending.length) return;
    const w = checkWinClassique();
    if (w) { G.winner = w; G.lastPhase = G.announce.kind === 'vote' ? 'vote' : 'dawn'; keepAwake(false); say(w === 'loup' ? 'Les Loups-Garous ont gagné.' : w === 'village' ? 'Le village a gagné.' : 'Il ne reste personne.'); go('result', { replace: true }); return; }
    if (G.announce.kind === 'dawn') startDay();
    else { G.round++; startClassicNight(); }
  },

  /* Jour */
  tToggle() { unlockAudio(); G.timer.running ? pauseTimer() : startTimer(); haptic(10); },
  tAdj(el) {
    const t = G.timer, d = +el.dataset.d;
    if (t.running) t.left = Math.max(0, (t.end - Date.now()) / 1000);
    t.total = Math.max(30, t.total + d); t.left = Math.min(t.total, Math.max(0, t.left + d));
    if (t.running) t.end = Date.now() + t.left * 1000;
    updateTimerUI();
  },
  tReset() { const t = G.timer; stopTimer(); t.left = t.total; t.running = false; updateTimerUI(); },
  toVote: startVote,

  /* Vote */
  iAmVoter() { G.vote.stage = 'pick'; render(); },
  pickVote(el) {
    const V = G.vote; V.sel = +el.dataset.i; haptic(10);
    document.querySelectorAll('.vtile').forEach(t => t.classList.toggle('sel', +t.dataset.i === V.sel));
    $('#confirmVote').disabled = false;
  },
  confirmVote() {
    const V = G.vote; if (V.sel == null) return;
    V.ballots[V.voters[V.k]] = V.sel; V.sel = null; V.k++; haptic(20);
    if (V.k >= V.voters.length) return finishVote();
    V.stage = S.settings.secretVote ? 'handoff' : 'pick'; render(); $('#view').scrollTop = 0;
  },
  replay() { G = null; S.stack = ['home']; go('setup', { replace: true }); },

  /* Paramètres */
  resetDecks() {
    confirmSheet('Supprimer vos decks ?', 'Vos decks personnalisés seront effacés. Les decks par défaut restent.', 'Supprimer', () => {
      S.custom = []; S.deckSel = { classique: 'classique-base', nuit: 'nuit-base' }; saveAll(); toast('Decks supprimés'); render();
    });
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (fn) fn(el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'pName') { e.preventDefault(); A.addPlayer(); }
  if (e.key === 'Escape' && $('#sheet').classList.contains('open')) closeSheet();
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'dName' && S.draft) S.draft.name = t.value;
  if (t.dataset.set === 'timer') { S.settings.timer = +t.value; $('#timerVal').textContent = fmtTime(+t.value); saveAll(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.set && t.type === 'checkbox') { S.settings[t.dataset.set] = t.checked; saveAll(); haptic(8); }
});

/* Images : fondu à l'arrivée, placeholder si le fichier n'existe pas encore */
document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded'); }, true);
document.addEventListener('error', e => {
  if (e.target.tagName === 'IMG') { BROKEN.add(e.target.getAttribute('src')); e.target.classList.add('is-broken'); }
}, true);

/* Verrous iOS supplémentaires : pinch-zoom et double-tap */
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && G && S.screen !== 'result') keepAwake(true);
});

/* --------------------------------------------------------------------------
   14. DÉMARRAGE
   -------------------------------------------------------------------------- */
function enter() {
  const sp = $('#splash');
  if (sp.classList.contains('gone')) return;
  sp.classList.add('gone');
  document.body.classList.add('ready');
  unlockAudio();
  render();
}

function registerSW() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(reg => {
    // Pré-chargement des illustrations pour jouer hors ligne
    const urls = [CONFIG.cardBack, './assets/images/accueil.jpg', ...ROLES.map(r => r.image_url)];
    reg.active && reg.active.postMessage({ type: 'WARM_IMAGES', urls });
  }).catch(() => { /* hors HTTPS ou refusé */ });
}

(function boot() {
  buildScene();
  makeStars();
  let rsT; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(makeStars, 250); });
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};
  const sp = $('#splash');
  sp.addEventListener('click', enter);
  sp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') enter(); });
  setTimeout(enter, CONFIG.splashMin + 800);
  registerSW();
})();
