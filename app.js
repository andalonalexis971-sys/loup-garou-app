/* ==========================================================================
   LOUP-GAROU — app.js  (v3)
   Vanilla JS, aucune dépendance.

   Principe : il n'y a plus de « modes ». Chaque DECK est une variante de jeu
   complète : ses cartes (parmi les 25 rôles) + ses règles (nombre de nuits,
   cartes au centre, durée du débat, équilibrage automatique).
     • 1 nuit          → moteur « Une Nuit » : échanges de cartes, un seul vote,
                          on gagne avec la carte qu'on a à la fin de la nuit.
     • plusieurs nuits → moteur « Village » : nuits et jours s'enchaînent,
                          morts révélés, jusqu'à la victoire (ou la limite).

   Sommaire
     1.  Configuration
     2.  Base de données des rôles
     3.  Formats de jeu, appels de nuit, decks par défaut
     4.  Stockage local (+ migration v2 → v3)
     5.  Moteur d'équilibrage
     6.  Icônes & visuels
     7.  Composants de cartes
     8.  Ambiance sonore (Web Audio, 100 % synthétisée)
     9.  État & navigation
     10. Écrans
     11. Moteur « Une Nuit »
     12. Moteur « Village » (plusieurs nuits)
     13. Éléments partagés : partie, chronomètre, vote, voix
     14. Actions (délégation d'événements)
     15. Démarrage
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   1. CONFIGURATION
   -------------------------------------------------------------------------- */
const CONFIG = {
  version: '3.0.0',
  cardBack: './assets/images/dos-de-carte.jpg',
  splashMin: 2200,
  minPlayers: 4,
  maxPlayers: 20,
  maxCustomDecks: 8,
  storagePrefix: 'lg2.',
};

/* --------------------------------------------------------------------------
   2. BASE DE DONNÉES DES RÔLES
     id                 identifiant (= nom du fichier image)
     nom, camp          'Village' | 'Loup' | 'Neutre'
     description        pouvoir en partie d'UNE nuit
     description_multi  pouvoir en partie de PLUSIEURS nuits (si différent)
     image_url          ./assets/images/{id}.jpg
     multiple           plusieurs exemplaires autorisés
     icone              icône du placeholder
   -------------------------------------------------------------------------- */
const ROLES = [
  { id: 'loup-garou-alpha', nom: 'Loup-Garou Alpha', camp: 'Loup', icone: 'crown',
    description: "Réveillez-vous avec les autres Loups. Puis échangez une carte du centre avec la carte d'un joueur qui n'est pas Loup : il rejoint peut-être la meute sans le savoir.",
    image_url: './assets/images/loup-garou-alpha.jpg' },
  { id: 'loup-garou-mystique', nom: 'Loup-Garou Mystique', camp: 'Loup', icone: 'spark',
    description: "Réveillez-vous avec les autres Loups. Puis, seul, regardez la carte d'un autre joueur.",
    description_multi: "Chassez avec la meute. Puis, chaque nuit, regardez seul la carte d'un autre joueur.",
    image_url: './assets/images/loup-garou-mystique.jpg' },
  { id: 'loup-garou-reveur', nom: 'Loup-Garou Rêveur', camp: 'Loup', icone: 'moon',
    description: "Vous ne vous réveillez pas avec la meute : gardez les yeux fermés et tendez le pouce pour que les Loups sachent que vous êtes des leurs.",
    image_url: './assets/images/loup-garou-reveur.jpg' },
  { id: 'sbire', nom: 'Sbire', camp: 'Loup', icone: 'dagger',
    description: "Vous savez qui sont les Loups-Garous, eux ne vous connaissent pas. Vous gagnez avec eux, même si vous mourez. S'il n'y a aucun Loup en jeu, vous gagnez si quelqu'un d'autre que vous meurt.",
    description_multi: "La première nuit, vous découvrez qui sont les Loups-Garous (eux ne vous connaissent pas). Vous gagnez avec la meute, même mort.",
    image_url: './assets/images/sbire.jpg' },
  { id: 'sorciere', nom: 'Sorcière', camp: 'Village', icone: 'potion',
    description: "Regardez une carte du centre. Vous pouvez ensuite l'échanger avec la carte de n'importe quel joueur, y compris la vôtre.",
    description_multi: "Vous possédez deux potions à usage unique : la potion de vie sauve la victime des Loups, la potion de mort élimine le joueur de votre choix.",
    image_url: './assets/images/sorciere.jpg' },
  { id: 'apprentie-voyante', nom: 'Apprentie Voyante', camp: 'Village', icone: 'orb',
    description: "Regardez une seule carte du centre.",
    description_multi: "Chaque nuit, regardez une carte du centre (s'il y en a).",
    image_url: './assets/images/apprentie-voyante.jpg' },
  { id: 'enqueteur', nom: 'Enquêteur', camp: 'Village', icone: 'search',
    description: "Regardez la carte d'un joueur, puis éventuellement d'un second. Si vous découvrez un Loup ou le Tanneur, arrêtez-vous : vous rejoignez son camp.",
    image_url: './assets/images/enqueteur.jpg' },
  { id: 'revelateur', nom: 'Révélateur', camp: 'Village', icone: 'sun',
    description: "Retournez face visible la carte d'un autre joueur. Si c'est un Loup ou le Tanneur, retournez-la à nouveau face cachée.",
    image_url: './assets/images/revelateur.jpg' },
  { id: 'casse-pieds', nom: 'Casse-pieds', camp: 'Village', icone: 'shuffle',
    description: "Échangez les cartes de deux autres joueurs, sans les regarder.",
    image_url: './assets/images/casse-pieds.jpg' },
  { id: 'soulard', nom: 'Soûlard', camp: 'Village', icone: 'drink',
    description: "Échangez votre carte avec une carte du centre, sans regarder votre nouveau rôle.",
    image_url: './assets/images/soulard.jpg' },
  { id: 'insomniaque', nom: 'Insomniaque', camp: 'Village', icone: 'insomnia',
    description: "À la fin de la nuit, regardez à nouveau votre carte pour savoir si elle a changé.",
    image_url: './assets/images/insomniaque.jpg' },
  { id: 'idiot-du-village', nom: 'Idiot du village', camp: 'Village', icone: 'jester',
    description: "Vous pouvez décaler toutes les cartes des autres joueurs d'un cran, vers la gauche ou vers la droite.",
    description_multi: "Si le village vote contre vous, vous êtes démasqué et gracié… mais vous perdez définitivement votre droit de vote.",
    image_url: './assets/images/idiot-du-village.jpg' },
  { id: 'chasseur', nom: 'Chasseur', camp: 'Village', icone: 'target',
    description: "Si vous mourez au vote, le joueur pour lequel vous avez voté meurt avec vous.",
    description_multi: "Quand vous mourez, vous tirez une dernière balle : le joueur de votre choix meurt avec vous.",
    image_url: './assets/images/chasseur.jpg' },
  { id: 'tanneur', nom: 'Tanneur', camp: 'Neutre', icone: 'skull',
    description: "Vous détestez votre métier. Vous gagnez uniquement si vous êtes éliminé au vote — et dans ce cas, les Loups perdent.",
    description_multi: "Vous détestez votre métier. Si le village vous élimine au vote, la partie s'arrête : vous gagnez seul.",
    image_url: './assets/images/tanneur.jpg' },
  { id: 'garde-du-corps', nom: 'Garde du corps', camp: 'Village', icone: 'guard',
    description: "Le joueur pour lequel vous votez ne peut pas mourir. S'il recueille le plus de voix, c'est le suivant qui est éliminé.",
    description_multi: "Chaque nuit, protégez un joueur de l'attaque des Loups. Vous pouvez vous protéger vous-même, mais jamais deux nuits de suite la même personne.",
    image_url: './assets/images/garde-du-corps.jpg' },
  { id: 'sentinelle', nom: 'Sentinelle', camp: 'Village', icone: 'shield',
    description: "Placez un bouclier sur la carte d'un autre joueur : personne ne pourra la regarder ni la déplacer cette nuit.",
    image_url: './assets/images/sentinelle.jpg' },
  { id: 'franc-macon', nom: 'Franc-maçon', camp: 'Village', icone: 'mason', multiple: true,
    description: "Réveillez-vous et cherchez l'autre Franc-maçon. Si vous êtes seul, l'autre carte dort au centre.",
    description_multi: "La première nuit, les Francs-maçons ouvrent les yeux et se reconnaissent. Ils savent qu'ils peuvent se faire confiance.",
    image_url: './assets/images/franc-macon.jpg' },
  { id: 'curateur', nom: 'Curateur', camp: 'Village', icone: 'gem',
    description: "Placez un artefact face cachée sur la carte d'un autre joueur. L'artefact peut bouleverser son identité ou ses conditions de victoire.",
    image_url: './assets/images/curateur.jpg' },
  { id: 'doppelganger', nom: 'Doppelgänger', camp: 'Neutre', icone: 'mask',
    description: "Regardez la carte d'un autre joueur : vous devenez ce rôle, appliquez son pouvoir et rejoignez son camp.",
    description_multi: "La première nuit, regardez la carte d'un autre joueur : vous devenez ce rôle pour le reste de la partie.",
    image_url: './assets/images/doppelganger.jpg' },
  { id: 'villageois', nom: 'Villageois', camp: 'Village', icone: 'house', multiple: true,
    description: "Vous n'avez aucun pouvoir, sinon votre flair. Écoutez, observez, et démasquez les Loups.",
    image_url: './assets/images/villageois.jpg' },
  { id: 'maire', nom: 'Maire', camp: 'Village', icone: 'medal',
    description: "Votre voix compte double lors du vote final.",
    description_multi: "Votre voix compte double. En cas d'égalité, c'est vous qui tranchez.",
    image_url: './assets/images/maire.jpg' },
  { id: 'enfant-sauvage', nom: 'Enfant Sauvage', camp: 'Village', icone: 'leaf',
    description: "Désignez secrètement un modèle. S'il est éliminé au vote, vous rejoignez la meute et gagnez avec les Loups.",
    description_multi: "La première nuit, choisissez secrètement un modèle. Tant qu'il vit, vous êtes Villageois ; s'il meurt, vous devenez Loup-Garou.",
    image_url: './assets/images/enfant-sauvage.jpg' },
  { id: 'voyante', nom: 'Voyante', camp: 'Village', icone: 'eye',
    description: "Regardez la carte d'un autre joueur, OU deux cartes du centre.",
    description_multi: "Chaque nuit, découvrez la véritable identité d'un joueur de votre choix.",
    image_url: './assets/images/voyante.jpg' },
  { id: 'voleur', nom: 'Voleur', camp: 'Village', icone: 'swap',
    description: "Échangez votre carte avec celle d'un autre joueur, puis regardez votre nouvelle carte : vous changez de camp avec elle.",
    description_multi: "La première nuit, vous pouvez échanger votre carte contre l'une des cartes laissées au centre. Si elles sont toutes Loups, vous devez en prendre une.",
    image_url: './assets/images/voleur.jpg' },
  { id: 'loup-garou-classique', nom: 'Loup-Garou', camp: 'Loup', icone: 'wolf', multiple: true,
    description: "Réveillez-vous avec les autres Loups-Garous. Si vous êtes le seul Loup, vous pouvez regarder une carte du centre.",
    description_multi: "Chaque nuit, la meute se réveille et désigne en silence sa victime. Le jour, cachez-vous parmi les villageois.",
    image_url: './assets/images/loup-garou-classique.jpg' },
];

const R = Object.fromEntries(ROLES.map((r, i) => [r.id, { ...r, numero: i + 1 }]));
const ROLE_ORDER = Object.fromEntries(ROLES.map((r, i) => [r.id, i]));
const WOLVES = ['loup-garou-classique', 'loup-garou-alpha', 'loup-garou-mystique', 'loup-garou-reveur'];
const CAMP_CLASS = { Village: 'village', Loup: 'loup', Neutre: 'neutre' };
const CAMP_LABEL = { Village: 'Village', Loup: 'Loups-Garous', Neutre: 'Neutre' };
const MAX_COPIES = { 'loup-garou-classique': 6, villageois: 12, 'franc-macon': 2 };
const cc = id => CAMP_CLASS[R[id].camp];
const isWolfId = id => WOLVES.includes(id);
const capOf = id => (R[id].multiple ? (MAX_COPIES[id] ?? 8) : 1);

/* --------------------------------------------------------------------------
   3. FORMATS, APPELS DE NUIT, DECKS PAR DÉFAUT
   -------------------------------------------------------------------------- */
/* Le format découle du nombre de nuits du deck : 1 → 'nuit', sinon → 'multi' */
const formatOf = rules => (rules.nights === 1 ? 'nuit' : 'multi');
const descOf = (id, format) => (format === 'multi' && R[id].description_multi) || R[id].description;

/* Règles d'équilibrage propres à chaque format */
const FORMATS = {
  nuit: {
    label: 'Une seule nuit',
    /* sur le total de cartes : 7–10 → 2 Loups · 11–14 → 3 · 15–18 → 4 · 19+ → 5 */
    wolfTarget: (n, total) => Math.min(5, Math.max(1, Math.floor((total + 1) / 4))),
    wolfAdd: ['loup-garou-classique', 'loup-garou-mystique', 'loup-garou-reveur', 'loup-garou-alpha'],
    wolfRemove: ['loup-garou-alpha', 'loup-garou-reveur', 'loup-garou-mystique', 'loup-garou-classique'],
    removeOrder: ['villageois', 'enfant-sauvage', 'curateur', 'enqueteur', 'idiot-du-village', 'revelateur', 'sentinelle', 'garde-du-corps', 'doppelganger', 'maire', 'sorciere', 'apprentie-voyante', 'sbire', 'tanneur', 'chasseur', 'soulard', 'insomniaque', 'franc-macon', 'casse-pieds', 'voleur', 'voyante'],
    addOrder: ['voyante', 'voleur', 'casse-pieds', 'insomniaque', 'soulard', 'chasseur', 'franc-macon', 'apprentie-voyante', 'sorciere', 'tanneur', 'sbire', 'garde-du-corps', 'sentinelle', 'revelateur', 'maire'],
  },
  multi: {
    label: 'Plusieurs nuits',
    /* ≈ 1 Loup pour 4,5 joueurs : 4–6 → 1 · 7–11 → 2 · 12–15 → 3 · 16–20 → 4 */
    wolfTarget: n => Math.max(1, Math.round(n / 4.5)),
    wolfAdd: ['loup-garou-classique'],
    wolfRemove: ['loup-garou-alpha', 'loup-garou-reveur', 'loup-garou-mystique', 'loup-garou-classique'],
    removeOrder: ['villageois', 'curateur', 'enqueteur', 'revelateur', 'sentinelle', 'apprentie-voyante', 'soulard', 'insomniaque', 'casse-pieds', 'doppelganger', 'tanneur', 'sbire', 'idiot-du-village', 'franc-macon', 'enfant-sauvage', 'maire', 'garde-du-corps', 'voleur', 'chasseur', 'sorciere', 'voyante'],
    addOrder: ['voyante', 'sorciere', 'chasseur', 'garde-du-corps', 'maire', 'enfant-sauvage', 'idiot-du-village'],
  },
};

/* Appels de nuit — partie d'UNE nuit (ordre officiel, rôles du paquet y compris au centre) */
const NIGHT_NUIT = [
  { ids: ['doppelganger'], title: 'Doppelgänger', tool: 'Regarder', text: "Doppelgänger, ouvre les yeux. Regarde la carte d'un autre joueur : tu deviens ce rôle. S'il agit la nuit, fais-le maintenant. Rendors-toi." },
  { ids: ['enfant-sauvage'], title: 'Enfant Sauvage', text: "Enfant Sauvage, ouvre les yeux et montre en silence ton modèle au maître du jeu. Rendors-toi." },
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

/* Appels de nuit — partie de PLUSIEURS nuits.
   action : bouton d'action guidée pour le MJ · first : uniquement la 1re nuit
   Les rôles sans action guidée s'appuient sur le Plateau du MJ. */
const NIGHT_MULTI = [
  { id: 'voleur', ids: ['voleur'], first: true, action: 'voleur', title: 'Voleur', text: "Voleur, ouvre les yeux. Tu peux échanger ta carte contre l'une des cartes du centre. Rendors-toi." },
  { id: 'doppelganger', ids: ['doppelganger'], first: true, tool: 'Regarder', title: 'Doppelgänger', text: "Doppelgänger, ouvre les yeux. Regarde la carte d'un autre joueur : tu deviens ce rôle. Rendors-toi." },
  { id: 'franc-macon', ids: ['franc-macon'], first: true, title: 'Francs-maçons', text: "Francs-maçons, ouvrez les yeux et reconnaissez-vous. Rendormez-vous." },
  { id: 'enfant', ids: ['enfant-sauvage'], first: true, action: 'enfant', title: 'Enfant Sauvage', text: "Enfant Sauvage, ouvre les yeux et désigne ton modèle. Rendors-toi." },
  { id: 'sbire', ids: ['sbire'], first: true, title: 'Sbire', text: "Sbire, ouvre les yeux. Loups-Garous, tendez le pouce sans ouvrir les yeux. Loups, baissez le pouce. Sbire, rendors-toi." },
  { id: 'sentinelle', ids: ['sentinelle'], title: 'Sentinelle', text: "Sentinelle, ouvre les yeux. Tu peux placer un bouclier sur la carte d'un autre joueur. Rendors-toi." },
  { id: 'garde', ids: ['garde-du-corps'], action: 'garde', title: 'Garde du corps', text: "Garde du corps, ouvre les yeux et désigne le joueur que tu protèges cette nuit. Rendors-toi." },
  { id: 'loups', ids: WOLVES, action: 'loups', title: 'Loups-Garous', text: "Loups-Garous, ouvrez les yeux. Mettez-vous d'accord en silence et désignez votre victime. Rendormez-vous." },
  { id: 'alpha', ids: ['loup-garou-alpha'], tool: 'Échanger', title: 'Loup-Garou Alpha', text: "Loup-Garou Alpha, ouvre les yeux. Tu peux échanger une carte du centre avec la carte d'un joueur. Rendors-toi." },
  { id: 'mystique', ids: ['loup-garou-mystique'], tool: 'Regarder', title: 'Loup-Garou Mystique', text: "Loup-Garou Mystique, ouvre les yeux. Tu peux regarder la carte d'un autre joueur. Rendors-toi." },
  { id: 'voyante', ids: ['voyante'], action: 'voyante', title: 'Voyante', text: "Voyante, ouvre les yeux et désigne le joueur dont tu veux connaître l'identité. Rendors-toi." },
  { id: 'apprentie', ids: ['apprentie-voyante'], tool: 'Regarder', title: 'Apprentie Voyante', text: "Apprentie Voyante, ouvre les yeux. Tu peux regarder une carte du centre. Rendors-toi." },
  { id: 'enqueteur', ids: ['enqueteur'], tool: 'Regarder', title: 'Enquêteur', text: "Enquêteur, ouvre les yeux. Tu peux regarder la carte d'un joueur, puis d'un second. Rendors-toi." },
  { id: 'sorciere', ids: ['sorciere'], action: 'sorciere', title: 'Sorcière', text: "Sorcière, ouvre les yeux. Voici la victime de cette nuit. Veux-tu utiliser une potion ? Rendors-toi." },
  { id: 'casse-pieds', ids: ['casse-pieds'], tool: 'Échanger', title: 'Casse-pieds', text: "Casse-pieds, ouvre les yeux. Tu peux échanger les cartes de deux autres joueurs. Rendors-toi." },
  { id: 'soulard', ids: ['soulard'], tool: 'Échanger', title: 'Soûlard', text: "Soûlard, ouvre les yeux. Échange ta carte avec une carte du centre, sans la regarder. Rendors-toi." },
  { id: 'insomniaque', ids: ['insomniaque'], tool: 'Regarder', title: 'Insomniaque', text: "Insomniaque, ouvre les yeux. Regarde ta propre carte. Rendors-toi." },
  { id: 'revelateur', ids: ['revelateur'], tool: 'Regarder', title: 'Révélateur', text: "Révélateur, ouvre les yeux. Retourne la carte d'un autre joueur. Si c'est un Loup ou le Tanneur, retourne-la face cachée. Rendors-toi." },
  { id: 'curateur', ids: ['curateur'], title: 'Curateur', text: "Curateur, ouvre les yeux. Place un artefact sur la carte d'un autre joueur. Rendors-toi." },
];

/* Règles par défaut d'un deck */
const RULES_DEFAULT = { nights: 0, center: 0, debate: 300, autoBalance: true };
const ALL_ONE_NIGHT = Object.fromEntries(ROLES.filter(r => r.id !== 'enfant-sauvage').map(r => [r.id, r.id === 'villageois' ? 3 : r.id === 'franc-macon' ? 2 : r.id === 'loup-garou-classique' ? 2 : 1]));

/* Decks fournis (non supprimables, duplicables) */
const DEFAULT_DECKS = [
  { id: 'thiercelieux', name: 'Thiercelieux', tagline: 'Le grand classique : nuits et jours jusqu\'à la victoire.',
    rules: { nights: 0, center: 0, debate: 300, autoBalance: true },
    counts: { 'loup-garou-classique': 2, voyante: 1, sorciere: 1, chasseur: 1, voleur: 1, villageois: 4 } },
  { id: 'une-nuit', name: 'Pour une Nuit', tagline: 'Une nuit, un vote. Personne n\'est sûr de son rôle au réveil.',
    rules: { nights: 1, center: 3, debate: 300, autoBalance: true },
    counts: { 'loup-garou-classique': 2, sbire: 1, 'franc-macon': 2, voyante: 1, voleur: 1, 'casse-pieds': 1, soulard: 1, insomniaque: 1, chasseur: 1, tanneur: 1, villageois: 3 } },
  { id: 'grand-village', name: 'Grand village', tagline: 'Pour les grandes tablées : Maire, Garde, Enfant Sauvage…',
    rules: { nights: 0, center: 0, debate: 360, autoBalance: true },
    counts: { 'loup-garou-classique': 3, voyante: 1, sorciere: 1, chasseur: 1, voleur: 1, maire: 1, 'enfant-sauvage': 1, 'garde-du-corps': 1, 'idiot-du-village': 1, 'franc-macon': 2, villageois: 2 } },
  { id: 'nuit-complete', name: 'Nuit complète', tagline: 'Tous les rôles nocturnes, une seule nuit de chaos.',
    rules: { nights: 1, center: 3, debate: 420, autoBalance: true },
    counts: ALL_ONE_NIGHT },
  { id: 'trois-nuits', name: 'Trois nuits', tagline: 'Partie courte : les Loups gagnent s\'ils survivent à la 3e nuit.',
    rules: { nights: 3, center: 0, debate: 240, autoBalance: true },
    counts: { 'loup-garou-classique': 2, voyante: 1, sorciere: 1, 'garde-du-corps': 1, chasseur: 1, villageois: 3 } },
];

/* --------------------------------------------------------------------------
   4. STOCKAGE LOCAL (+ migration des decks v2, qui dépendaient d'un « mode »)
   -------------------------------------------------------------------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(CONFIG.storagePrefix + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(CONFIG.storagePrefix + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
};
function loadCustomDecks() {
  return store.get('decks', []).map(d => {
    if (d.rules) return d;
    // v2 : { mode: 'nuit'|'classique', counts } → règles équivalentes
    const one = d.mode === 'nuit';
    return { id: d.id, name: d.name, counts: d.counts || {}, rules: { nights: one ? 1 : 0, center: one ? 3 : 0, debate: 300, autoBalance: true } };
  });
}

/* --------------------------------------------------------------------------
   5. MOTEUR D'ÉQUILIBRAGE
   Entrée : deck (cartes + règles) et nombre de joueurs.
   Taille cible = joueurs + cartes au centre.
     0. Plusieurs nuits + Voleur → au moins 2 cartes au centre.
     1. Plafonds d'exemplaires, Francs-maçons par paire (0 ou 2).
     2. Meute ajustée à la cible du format (sans toucher aux autres camps).
     3. Paquet trop grand → retrait par priorité (Villageois d'abord).
     4. Paquet trop petit → ajout par priorité (rôles d'information), puis Villageois.
   Équilibrage désactivé : le deck est pris tel quel ; il doit compter exactement
   joueurs + centre cartes, sinon la partie ne peut pas démarrer.
   -------------------------------------------------------------------------- */
function balanceDeck(deck, n) {
  const rules = { ...RULES_DEFAULT, ...deck.rules };
  const format = formatOf(rules);
  const F = FORMATS[format];
  const log = [];
  let cards = [];
  for (const [id, c] of Object.entries(deck.counts || {})) {
    if (!R[id]) continue;
    for (let k = 0; k < Math.min(c, capOf(id)); k++) cards.push(id);
  }
  const count = id => cards.filter(x => x === id).length;
  const has = id => cards.includes(id);
  const add = (id, why) => { cards.push(id); log.push({ t: '+', id, why }); };
  const del = (id, why) => { const k = cards.lastIndexOf(id); if (k >= 0) { cards.splice(k, 1); log.push({ t: '−', id, why }); } };

  let center = Math.max(0, Math.min(3, rules.center | 0));
  if (format === 'multi' && has('voleur') && center < 2) { center = 2; log.push({ t: 'i', why: '2 cartes au centre pour le Voleur' }); }
  const target = n + center;
  const wolves = () => cards.filter(isWolfId).length;

  if (!rules.autoBalance) {
    cards.sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
    return { cards, log, target, center, format, rules, wolves: wolves(), expected: wolves() * n / Math.max(1, cards.length), valid: cards.length === target, fixed: true };
  }

  // 1. Francs-maçons par paire
  if (count('franc-macon') === 1) {
    if (cards.length < target) add('franc-macon', 'les Francs-maçons vont par paire');
    else del('franc-macon', 'un Franc-maçon seul est inutile');
  }
  // 2. Meute
  const wt = F.wolfTarget(n, target);
  let guard = 0;
  while (wolves() < wt && guard++ < 30) {
    const id = F.wolfAdd.find(x => count(x) < capOf(x)) || 'loup-garou-classique';
    add(id, `meute ajustée à ${wt} Loup${wt > 1 ? 's' : ''}`);
  }
  while (wolves() > wt && guard++ < 60) {
    const id = F.wolfRemove.find(has);
    if (!id) break;
    del(id, `meute limitée à ${wt} Loup${wt > 1 ? 's' : ''}`);
  }
  // 3. Trop de cartes
  guard = 0;
  while (cards.length > target && guard++ < 80) {
    const over = cards.length - target;
    const id = F.removeOrder.find(x => has(x) && !(x === 'franc-macon' && over < 2))
      || cards.find(x => !isWolfId(x) && x !== 'franc-macon');
    if (!id) break;
    del(id, 'paquet trop grand');
    if (id === 'franc-macon') del(id, 'paquet trop grand');
  }
  // 4. Pas assez de cartes
  guard = 0;
  while (cards.length < target && guard++ < 80) {
    const missing = target - cards.length;
    const id = F.addOrder.find(x => !has(x) && !(x === 'franc-macon' && missing < 2));
    if (id === 'franc-macon') { add(id, 'complément (paire)'); add(id, 'complément (paire)'); continue; }
    add(id || 'villageois', 'complément du paquet');
  }
  cards.sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
  return { cards, log, target, center, format, rules, wolves: wolves(), wolfTarget: wt, expected: wolves() * n / cards.length, valid: cards.length === target };
}

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
  mute: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
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
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.house}</svg>`;

/* Dos de carte commun (placeholder vectoriel 3:4) : géométrie occulte + lune dorée, sans texte */
const BACK_SVG = (() => {
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

/* Décor vectoriel de l'accueil (remplacé par accueil.jpg s'il existe) */
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
function makeStars() {
  const w = innerWidth, h = innerHeight * .62;
  const gen = (count, max) => Array.from({ length: count }, () =>
    `${Math.round(Math.random() * w)}px ${Math.round(Math.random() * h)}px 0 0 rgba(255,246,220,${(Math.random() * max + .2).toFixed(2)})`).join(',');
  document.getElementById('stars').style.boxShadow = gen(Math.min(900, Math.round(w * h / 4200)), .6);
  document.getElementById('stars-2').style.boxShadow = gen(Math.min(200, Math.round(w * h / 20000)), .7);
}

/* --------------------------------------------------------------------------
   7. COMPOSANTS DE CARTES (ratio 3:4 commun, image en object-fit:cover)
   -------------------------------------------------------------------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BROKEN = new Set();

function roman(n) {
  const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return s;
}
function imgTag(src) { return BROKEN.has(src) ? '' : `<img src="${esc(src)}" alt="" decoding="async">`; }
function roleArt(id) {
  const r = R[id];
  return `<div class="art camp-${cc(id)}"><div class="art-fallback">${icon(r.icone)}<span class="ph-num">${roman(r.numero)}</span></div>${imgTag(r.image_url)}</div>`;
}
function backArt() { return `<div class="art art-back"><div class="art-fallback">${BACK_SVG}</div>${imgTag(CONFIG.cardBack)}</div>`; }
function miniCard(id, opts = {}) {
  return `<div class="mcard camp-${cc(id)} ${opts.dead ? 'dead' : ''}">
    ${roleArt(id)}<div class="shade"></div><div class="frame"></div>
    <span class="mname">${esc(R[id].nom)}</span>${opts.count > 1 ? `<span class="mcount">×${opts.count}</span>` : ''}
  </div>`;
}
function miniBack(label) { return `<div class="mcard">${backArt()}${label ? `<span class="mname">${esc(label)}</span>` : ''}</div>`; }
function bigCard(id) {
  const r = R[id];
  return `<div class="tcard" id="tcard" data-act="flip" role="button" tabindex="0" aria-label="Retourner la carte">
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
const avatar = (name, cls = '') => `<span class="av ${cls}">${esc(name.trim().charAt(0).toUpperCase())}</span>`;
function campBar(cards) {
  const s = { Loup: 0, Village: 0, Neutre: 0 };
  cards.forEach(id => s[R[id].camp]++);
  const keys = Object.keys(s).filter(k => s[k]);
  return `<div class="bbar">${keys.map(k => `<i class="camp-${CAMP_CLASS[k]}" style="flex:${s[k]}"></i>`).join('')}</div>
    <div class="blegend">${keys.map(k => `<span class="camp-${CAMP_CLASS[k]}"><i class="dot"></i>${CAMP_LABEL[k]} · ${s[k]}</span>`).join('')}</div>`;
}
function stack(cards) {
  const m = new Map(); cards.forEach(id => m.set(id, (m.get(id) || 0) + 1));
  return [...m].map(([id, n]) => ({ id, n }));
}
/* Résumé des règles d'un deck sous forme de badges */
function rulesBadges(rules) {
  const r = { ...RULES_DEFAULT, ...rules };
  const nights = r.nights === 1 ? 'Une nuit' : r.nights === 0 ? 'Jusqu\'à la victoire' : `${r.nights} nuits max`;
  return `<span class="badge">${icon(r.nights === 1 ? 'moon' : 'sunmoon')}${nights}</span>
    <span class="badge">${r.center} au centre</span>
    <span class="badge">${icon('clock')}${fmtTime(r.debate)}</span>
    <span class="badge">${r.autoBalance ? 'Équilibrage auto' : 'Composition fixe'}</span>`;
}

/* --------------------------------------------------------------------------
   8. AMBIANCE SONORE — tout est synthétisé en Web Audio (aucun fichier audio)
   Scènes : menu (vent léger) · nuit (vent, grillons, chouette, loups lointains)
            · jour (brise, oiseaux). Effets : carte, révélation, hurlement,
            cloche de l'aube, glas d'élimination, carillon de fin de débat.
   iOS exige un geste pour démarrer l'audio : init() est appelé au 1er toucher.
   -------------------------------------------------------------------------- */
const Sound = {
  ctx: null, master: null, amb: null, sfx: null, verb: null, noise: null,
  scene: null, layer: null, timers: [],

  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = S.settings.volume; this.master.connect(c.destination);
    this.amb = c.createGain(); this.amb.gain.value = .9; this.amb.connect(this.master);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    // Réverbération (réponse impulsionnelle générée : bruit à décroissance exponentielle)
    this.verb = c.createConvolver();
    const len = c.sampleRate * 3.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb.buffer = ir;
    const wet = c.createGain(); wet.gain.value = .55; this.verb.connect(wet); wet.connect(this.master);
    // Bruit blanc réutilisable (vent, souffles)
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    if (this.pending) { const p = this.pending; this.pending = null; this.setScene(p); }
  },
  setVolume(v) { if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .1); },
  duck(on) { if (this.amb) this.amb.gain.setTargetAtTime(on ? .35 : .9, this.ctx.currentTime, .3); },
  get on() { return this.ctx && this.ctx.state === 'running'; },
  rnd: (a, b) => a + Math.random() * (b - a),

  /* ---- Scènes d'ambiance (fondu enchaîné) ---- */
  setScene(name) {
    if (!S.settings.ambience) name = null;
    if (!this.ctx) { this.pending = name; return; }
    if (name === this.scene) return;
    this.scene = name;
    this.timers.forEach(clearTimeout); this.timers = [];
    const c = this.ctx, t = c.currentTime;
    if (this.layer) {
      const old = this.layer; old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + 1.8);
      setTimeout(() => { old.nodes.forEach(nd => { try { nd.stop(); } catch (e) { /* déjà arrêté */ } }); old.disconnect(); }, 2000);
      this.layer = null;
    }
    if (!name) return;
    const L = c.createGain(); L.nodes = []; L.gain.setValueAtTime(0, t); L.gain.linearRampToValueAtTime(1, t + 2.5); L.connect(this.amb);
    this.layer = L;
    if (name === 'menu') { this.wind(L, .05, 380); }
    if (name === 'night') { this.wind(L, .085, 300); this.loop(() => this.crickets(L), 900, 2600); this.loop(() => this.owl(L), 14000, 30000, 6000); this.loop(() => this.howl(.07), 38000, 70000, 22000); }
    if (name === 'day') { this.wind(L, .035, 650); this.loop(() => this.bird(L), 1400, 4800); }
  },
  loop(fn, min, max, first) {
    const tick = () => { if (!this.layer) return; fn(); this.timers.push(setTimeout(tick, this.rnd(min, max))); };
    this.timers.push(setTimeout(tick, first ?? this.rnd(min, max) / 3));
  },
  wind(L, level, freq) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = .6;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g = c.createGain(); g.gain.value = level;
    const lfo = c.createOscillator(); lfo.frequency.value = .07; const lfoG = c.createGain(); lfoG.gain.value = freq * .45; lfo.connect(lfoG).connect(bp.frequency);
    const gust = c.createOscillator(); gust.frequency.value = .045; const gustG = c.createGain(); gustG.gain.value = level * .6; gust.connect(gustG).connect(g.gain);
    src.connect(bp).connect(lp).connect(g).connect(L);
    src.start(); lfo.start(); gust.start();
    L.nodes.push(src, lfo, gust);
  },
  crickets(L) {
    const c = this.ctx, t0 = c.currentTime, f = this.rnd(4200, 4800), pulses = 2 + Math.floor(Math.random() * 3);
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    const o = c.createOscillator(); o.frequency.value = f;
    const g = c.createGain(); g.gain.value = 0;
    for (let k = 0; k < pulses; k++) { const s = t0 + k * .065; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.012, s + .008); g.gain.linearRampToValueAtTime(0, s + .04); }
    o.connect(g); if (pan) { pan.pan.value = this.rnd(-.9, .9); g.connect(pan).connect(L); } else g.connect(L);
    o.start(t0); o.stop(t0 + pulses * .065 + .05);
  },
  owl(L) {
    const c = this.ctx, t0 = c.currentTime;
    [[0, .45], [.75, .22], [1.05, .5]].forEach(([d, dur]) => {
      const o = c.createOscillator(); o.type = 'sine';
      const s = t0 + d; o.frequency.setValueAtTime(410, s); o.frequency.linearRampToValueAtTime(370, s + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.045, s + .06); g.gain.setValueAtTime(.045, s + dur - .1); g.gain.linearRampToValueAtTime(0, s + dur);
      o.connect(g); g.connect(L); g.connect(this.verb); o.start(s); o.stop(s + dur + .05);
    });
  },
  bird(L) {
    const c = this.ctx, t0 = c.currentTime, base = this.rnd(2400, 3600), n = 2 + Math.floor(Math.random() * 4);
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    const out = c.createGain(); out.gain.value = .022;
    if (pan) { pan.pan.value = this.rnd(-.8, .8); out.connect(pan).connect(L); } else out.connect(L);
    for (let k = 0; k < n; k++) {
      const s = t0 + k * this.rnd(.09, .16), o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(base, s); o.frequency.exponentialRampToValueAtTime(base * this.rnd(1.3, 1.7), s + .06);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(1, s + .01); g.gain.exponentialRampToValueAtTime(.001, s + .08);
      o.connect(g).connect(out); o.start(s); o.stop(s + .1);
    }
  },

  /* ---- Effets ---- */
  ok(kind) { return this.on && S.settings.sfx; },
  howl(level = .16) {
    if (!this.on || (!S.settings.sfx && !S.settings.ambience)) return;
    const c = this.ctx, t0 = c.currentTime + .05, dur = 3.4;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    const bp = c.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 900; bp.gain.value = 8;
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(level, t0 + .5); g.gain.setValueAtTime(level, t0 + 2.2); g.gain.linearRampToValueAtTime(0, t0 + dur);
    lp.connect(bp).connect(g); g.connect(this.sfx); g.connect(this.verb);
    const vib = c.createOscillator(); vib.frequency.value = 5.2; const vibG = c.createGain(); vibG.gain.setValueAtTime(0, t0); vibG.gain.linearRampToValueAtTime(9, t0 + 1.2); vib.connect(vibG);
    [[0, 'sawtooth', .5], [6, 'triangle', .8]].forEach(([det, type, amp]) => {
      const o = c.createOscillator(); o.type = type; o.detune.value = det * 10;
      o.frequency.setValueAtTime(290, t0); o.frequency.exponentialRampToValueAtTime(560, t0 + .8); o.frequency.linearRampToValueAtTime(520, t0 + 2.2); o.frequency.exponentialRampToValueAtTime(330, t0 + dur);
      vibG.connect(o.frequency);
      const a = c.createGain(); a.gain.value = amp; o.connect(a).connect(lp); o.start(t0); o.stop(t0 + dur + .1);
    });
    vib.start(t0); vib.stop(t0 + dur + .1);
  },
  bell() {
    if (!this.ok()) return;
    const c = this.ctx, t0 = c.currentTime + .02, base = 196;
    [[.5, .06, 4], [1, .08, 3.4], [1.19, .05, 2.6], [1.56, .04, 2.2], [2, .05, 2], [2.51, .03, 1.6], [3.01, .025, 1.3]].forEach(([r, a, d]) => {
      const o = c.createOscillator(); o.frequency.value = base * r;
      const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
      o.connect(g); g.connect(this.sfx); g.connect(this.verb); o.start(t0); o.stop(t0 + d + .1);
    });
  },
  flip() {
    if (!this.ok()) return;
    const c = this.ctx, t0 = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(700, t0); bp.frequency.exponentialRampToValueAtTime(3800, t0 + .2);
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.22, t0 + .03); g.gain.exponentialRampToValueAtTime(.001, t0 + .26);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t0); src.stop(t0 + .3);
  },
  reveal() {
    if (!this.ok()) return;
    const c = this.ctx, t0 = c.currentTime + .45;
    [1318.5, 1568, 1975.5, 2637].forEach((f, k) => {
      const s = t0 + k * .07, o = c.createOscillator(), g = c.createGain(); o.frequency.value = f;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.035, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + .9);
      o.connect(g); g.connect(this.sfx); g.connect(this.verb); o.start(s); o.stop(s + 1);
    });
  },
  tap() {
    if (!this.ok()) return;
    const c = this.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(900, t0); o.frequency.exponentialRampToValueAtTime(500, t0 + .05);
    g.gain.setValueAtTime(.06, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .07);
    o.connect(g).connect(this.sfx); o.start(t0); o.stop(t0 + .08);
  },
  doom() {
    if (!this.ok()) return;
    const c = this.ctx, t0 = c.currentTime + .05, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + .9);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.38, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.4);
    o.connect(g); g.connect(this.sfx); g.connect(this.verb); o.start(t0); o.stop(t0 + 1.5);
  },
  chime() {
    if (!this.ok()) return;
    const c = this.ctx;
    [523.25, 659.25, 783.99].forEach((f, k) => {
      const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + k * .22;
      o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.25, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + .9);
      o.connect(g); g.connect(this.sfx); g.connect(this.verb); o.start(t0); o.stop(t0 + 1);
    });
  },
};
/* Ambiance associée à chaque écran */
const SCENE_OF = { splash: 'menu', home: 'menu', play: 'menu', decks: 'menu', deckEdit: 'menu', settings: 'menu', rules: 'menu', deal: 'menu', night: 'night', mnight: 'night', announce: 'day', day: 'day', vote: 'day', result: 'day' };

/* --------------------------------------------------------------------------
   9. ÉTAT & NAVIGATION
   -------------------------------------------------------------------------- */
const DEFAULT_SETTINGS = { voice: true, haptics: true, secretVote: true, ambience: true, sfx: true, volume: .7 };
const S = {
  screen: 'home',
  stack: [],
  players: store.get('players', []),
  deckId: store.get('deckId', 'thiercelieux'),
  custom: loadCustomDecks(),
  settings: { ...DEFAULT_SETTINGS, ...store.get('settings', {}) },
  draft: null,
  filter: 'all',
  sheet: null,
  focusName: false,
};
let G = null;

const saveAll = () => {
  store.set('players', S.players); store.set('deckId', S.deckId);
  store.set('decks', S.custom); store.set('settings', S.settings);
};
const allDecks = () => [...DEFAULT_DECKS.map(d => ({ ...d, builtin: true })), ...S.custom];
const getDeck = id => allDecks().find(d => d.id === id) || { ...DEFAULT_DECKS[0], builtin: true };
const deckSize = d => Object.values(d.counts).reduce((a, b) => a + b, 0);
const deckCards = d => Object.entries(d.counts).flatMap(([id, c]) => Array(c).fill(id)).sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);

const TITLES = {
  home: '', play: 'Jouer', decks: 'Decks', deckEdit: 'Éditeur de deck', deal: 'Distribution',
  night: 'La nuit', mnight: 'La nuit', announce: 'Le village', day: 'Le jour', vote: 'Le vote', result: 'Dénouement',
  settings: 'Réglages', rules: 'Règles',
};
const PHASE = { night: 'night', mnight: 'night', day: 'day', vote: 'day', announce: 'day', result: 'day' };
const IN_GAME = ['deal', 'night', 'mnight', 'announce', 'day', 'vote'];

function render() {
  const view = $('#view');
  const same = view.dataset.screen === S.screen;
  const keep = same ? view.scrollTop : 0;
  const out = SCREENS[S.screen]();
  const o = typeof out === 'string' ? { body: out } : out;
  view.innerHTML = `<div class="page page-${S.screen} ${same ? '' : 'enter'}">${o.body}</div>`;
  view.dataset.screen = S.screen;
  $('#dock').innerHTML = o.dock ? `<div class="dock-row">${o.dock}</div>` : '';
  view.scrollTop = keep;
  let title = TITLES[S.screen] || '';
  if (G && G.format === 'multi' && S.screen === 'mnight') title = `Nuit ${G.round}`;
  if (G && G.format === 'multi' && (S.screen === 'day' || S.screen === 'vote')) title = `Jour ${G.round}`;
  $('#title').textContent = title;
  $('#backBtn').style.visibility = S.screen === 'home' ? 'hidden' : 'visible';
  document.body.dataset.screen = S.screen;
  document.body.dataset.phase = PHASE[S.screen] || '';
  Sound.setScene(SCENE_OF[S.screen]);
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
  if (IN_GAME.includes(S.screen)) confirmSheet('Quitter la partie ?', 'La partie en cours sera perdue.', 'Quitter', endGame);
  else if (S.screen === 'result') endGame();
  else go(S.stack.pop() || 'home', { replace: true });
}
function endGame() { stopTimer(); keepAwake(false); G = null; S.stack = []; go('home', { replace: true }); }

/* --------------------------------------------------------------------------
   10. ÉCRANS
   -------------------------------------------------------------------------- */
const SCREENS = {};
const AFTER = {};

/* 10.1 Accueil : un seul bouton Jouer */
SCREENS.home = () => {
  const d = getDeck(S.deckId);
  return {
    body: `<header class="home-head">
        <p class="eyebrow">Le village s'endort…</p>
        <h1 class="logo-title">Loup-Garou</h1>
        <div class="ornament"><span></span><i></i><span></span></div>
      </header>
      <button class="panel ornate home-deck" data-act="goto" data-to="play">
        <span class="kicker">Dernier deck joué</span>
        <b>${esc(d.name)}</b>
        <span class="badges">${rulesBadges(d.rules)}</span>
      </button>
      <div class="home-links">
        <button class="btn" data-act="goto" data-to="decks">${icon('cards')}Decks</button>
        <button class="btn" data-act="goto" data-to="rules">${icon('book')}Règles</button>
        <button class="btn" data-act="goto" data-to="settings">${icon('gear')}Réglages</button>
      </div>
      <p class="version">${ROLES.length} rôles · ${allDecks().length} decks · v${CONFIG.version}</p>`,
    dock: `<button class="btn btn-gold glow btn-xl" data-act="goto" data-to="play">${icon('play')}Jouer</button>`,
  };
};

/* 10.2 Jouer : joueurs + choix du deck + aperçu équilibré */
SCREENS.play = () => {
  const n = S.players.length, deck = getDeck(S.deckId);
  let preview;
  if (n < CONFIG.minPlayers) {
    preview = `<p class="muted small center">Ajoutez au moins ${CONFIG.minPlayers} joueurs pour voir la composition finale.</p>
      <div class="cards-grid" style="margin-top:14px">${stack(deckCards(deck)).map(s => miniCard(s.id, { count: s.n })).join('')}</div>`;
  } else {
    const b = balanceDeck(deck, n);
    const lines = groupLog(b.log);
    const warn = !b.valid ? `<p class="warn">Ce deck compte <b>${b.cards.length}</b> cartes ; il en faut <b>${b.target}</b> pour ${n} joueurs + ${b.center} au centre. Activez l'équilibrage automatique ou ajustez le deck.</p>` : '';
    preview = `<div class="formula">
        <span><b>${n}</b>joueurs</span>
        ${b.center ? `<span class="op">+</span><span><b>${b.center}</b>au centre</span>` : ''}
        <span class="op">=</span><span><b>${b.target}</b>cartes</span>
      </div>
      ${warn}
      ${campBar(b.cards)}
      <p class="note">Meute : <b>${b.wolves} Loup${b.wolves > 1 ? 's' : ''}</b>${b.center && b.format === 'nuit' ? ` · ≈ ${b.expected.toFixed(1).replace('.', ',')} réellement en jeu` : ''}.</p>
      ${lines.length ? `<ul class="adj">${lines.map(l => l.t === 'i'
        ? `<li><em>i</em><span>${esc(l.why)}</span></li>`
        : `<li><em class="${l.t === '−' ? 'minus' : ''}">${l.t}</em><span>${esc(R[l.id].nom)}${l.n > 1 ? ' ×' + l.n : ''} — ${esc(l.why)}</span></li>`).join('')}</ul>`
        : (b.valid ? `<ul class="adj"><li><em>✓</em><span>Deck déjà équilibré pour ${n} joueurs.</span></li></ul>` : '')}
      <div class="cards-grid" style="margin-top:14px">${stack(b.cards).map(s => miniCard(s.id, { count: s.n })).join('')}</div>`;
  }
  const ok = n >= CONFIG.minPlayers && balanceDeck(deck, Math.max(n, 1)).valid;
  return {
    body: `<div class="setup-grid">
        <div class="setup-col">
          <section class="panel ornate">
            <div class="panel-title">${icon('users')}Joueurs · ${n}</div>
            <div class="add-row">
              <input class="field" id="pName" maxlength="16" placeholder="Prénom du joueur" autocomplete="off" autocapitalize="words" enterkeyhint="done">
              <button class="btn btn-gold icon" data-act="addPlayer" aria-label="Ajouter">${icon('plus')}</button>
            </div>
            <div class="chips" style="margin-top:14px">${S.players.map((p, i) => `<span class="chip">${avatar(p)}${esc(p)}<button data-act="rmPlayer" data-i="${i}" aria-label="Retirer ${esc(p)}">${icon('x')}</button></span>`).join('')}</div>
            ${n ? '<button class="btn btn-ghost sm" style="margin-top:8px" data-act="clearPlayers">Vider la liste</button>' : ''}
          </section>
          <section class="panel ornate">
            <div class="panel-title">${icon('cards')}Deck</div>
            <div class="deck-picks">${allDecks().map(d => `<button class="deck-pick ${d.id === deck.id ? 'on' : ''}" data-act="pickDeck" data-id="${d.id}">
                <span class="dp-name">${esc(d.name)}</span>
                <span class="dp-meta">${d.rules.nights === 1 ? 'Une nuit' : d.rules.nights === 0 ? 'Jusqu\'à la victoire' : d.rules.nights + ' nuits max'} · ${deckSize(d)} cartes</span>
              </button>`).join('')}</div>
            <button class="btn btn-ghost sm" style="margin-top:10px" data-act="goto" data-to="decks">${icon('edit')}Gérer les decks</button>
          </section>
        </div>
        <section class="panel ornate">
          <div class="panel-title">${icon('scale')}${esc(deck.name)}</div>
          <div class="badges" style="margin-bottom:14px">${rulesBadges(deck.rules)}</div>
          ${preview}
        </section>
      </div>`,
    dock: `<button class="btn btn-gold ${ok ? 'glow' : ''}" data-act="startGame" ${ok ? '' : 'disabled'}>${icon('cards')}Distribuer les cartes</button>`,
  };
};
AFTER.play = () => { if (S.focusName) { const i = $('#pName'); i && i.focus(); S.focusName = false; } };

/* 10.3 Decks */
SCREENS.decks = () => {
  const full = S.custom.length >= CONFIG.maxCustomDecks;
  const card = d => `<article class="panel deck">
      <div class="row between"><h3>${esc(d.name)}</h3><span class="badge">${d.builtin ? 'Fourni' : 'Perso'}</span></div>
      ${d.tagline ? `<p class="meta">${esc(d.tagline)}</p>` : `<p class="meta">${deckSize(d)} cartes</p>`}
      <div class="badges">${rulesBadges(d.rules)}</div>
      <div class="strip">${deckCards(d).slice(0, 16).map(id => miniCard(id)).join('')}</div>
      ${campBar(deckCards(d))}
      <div class="row wrap" style="margin-top:14px">
        ${d.builtin ? '' : `<button class="btn sm" data-act="editDeck" data-id="${d.id}">${icon('edit')}Modifier</button>`}
        <button class="btn sm" data-act="dupDeck" data-id="${d.id}" ${full ? 'disabled' : ''}>${icon('copy')}${d.builtin ? 'Personnaliser' : 'Dupliquer'}</button>
        <button class="btn sm" data-act="playDeck" data-id="${d.id}">${icon('play')}Jouer</button>
        ${d.builtin ? '' : `<button class="btn sm btn-danger" data-act="delDeck" data-id="${d.id}" aria-label="Supprimer">${icon('trash')}</button>`}
      </div>
    </article>`;
  return {
    body: `<p class="muted small center">Chaque deck est une variante complète : ses cartes et ses règles. ${S.custom.length}/${CONFIG.maxCustomDecks} decks personnels.</p>
      <div class="decks">${allDecks().map(card).join('')}</div>`,
    dock: `<button class="btn btn-gold" data-act="newDeck" ${full ? 'disabled' : ''}>${icon('plus')}${full ? 'Emplacements pleins' : 'Nouveau deck'}</button>`,
  };
};

/* 10.4 Éditeur de deck : règles + toutes les cartes */
SCREENS.deckEdit = () => {
  const d = S.draft, r = d.rules, f = S.filter;
  const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
  const multi = r.nights !== 1;
  const nightsLabel = r.nights === 0 ? 'Jusqu\'à la victoire' : `${r.nights} nuits maximum`;
  const tile = role => {
    const c = d.counts[role.id] || 0, max = capOf(role.id);
    return `<div class="pick ${c ? 'on' : ''}">
      <button class="pick-card" data-act="toggleRole" data-id="${role.id}" aria-label="${esc(role.nom)}">${miniCard(role.id, { count: c })}</button>
      <button class="info" data-act="roleInfo" data-id="${role.id}" aria-label="Pouvoir">${icon('info')}</button>
      ${role.multiple ? `<div class="stepper"><button data-act="dec" data-id="${role.id}" aria-label="Retirer">−</button><span>${c}/${max}</span><button data-act="inc" data-id="${role.id}" aria-label="Ajouter">+</button></div>` : ''}
    </div>`;
  };
  const list = ROLES.filter(role => f === 'all' || cc(role.id) === f);
  const seg = (k, t) => `<button class="${f === k ? 'on' : ''}" data-act="filterRoles" data-f="${k}">${t}</button>`;
  return {
    body: `<input class="field" id="dName" maxlength="28" placeholder="Nom du deck (ex. Soirée chez Léa)" value="${esc(d.name)}">
      <div class="editor-grid">
        <section class="panel ornate">
          <div class="panel-title">${icon('gear')}Règles du deck</div>
          <div class="rule-row"><span><b>Déroulement</b><small>${multi ? 'Nuits et jours s\'enchaînent, les morts sont révélés.' : 'Une nuit d\'échanges, puis un seul vote.'}</small></span></div>
          <div class="seg"><button class="${!multi ? 'on' : ''}" data-act="setFormat" data-v="nuit">${icon('moon')}Une nuit</button><button class="${multi ? 'on' : ''}" data-act="setFormat" data-v="multi">${icon('sunmoon')}Plusieurs nuits</button></div>
          ${multi ? `<div class="rule-row"><span><b>Nombre de nuits</b><small>${r.nights === 0 ? 'La partie dure jusqu\'à la victoire d\'un camp.' : 'Si les Loups survivent à la dernière nuit, ils gagnent.'}</small></span>
            <div class="stepper big"><button data-act="nights" data-d="-1" aria-label="Moins">−</button><span>${r.nights === 0 ? '∞' : r.nights}</span><button data-act="nights" data-d="1" aria-label="Plus">+</button></div></div>
            <p class="tiny faint">${nightsLabel}</p>` : ''}
          <div class="rule-row"><span><b>Cartes au centre</b><small>${multi ? 'Utilisées par le Voleur (2 minimum s\'il est présent).' : 'Règle officielle : 3 cartes.'}</small></span></div>
          <div class="seg">${[0, 1, 2, 3].map(v => `<button class="${r.center === v ? 'on' : ''}" data-act="setCenter" data-v="${v}">${v}</button>`).join('')}</div>
          <div class="rule-row"><span><b>Durée du débat</b><small>Valeur de départ du chronomètre.</small></span><b class="gold-num" id="debateVal">${fmtTime(r.debate)}</b></div>
          <input type="range" class="range" min="60" max="900" step="30" value="${r.debate}" data-set="debate" aria-label="Durée du débat">
          <label class="rule-row" style="margin-top:12px"><span><b>Équilibrage automatique</b><small>${r.autoBalance ? 'Le paquet s\'adapte au nombre de joueurs.' : 'Le deck est joué tel quel (nombre exact requis).'}</small></span><input type="checkbox" class="switch" data-set="autoBalance" ${r.autoBalance ? 'checked' : ''}></label>
        </section>
        <section class="panel ornate">
          <div class="panel-title">${icon('cards')}Cartes · ${total}</div>
          <div class="seg" style="margin-bottom:14px">${seg('all', 'Toutes')}${seg('loup', 'Loups')}${seg('village', 'Village')}${seg('neutre', 'Neutres')}</div>
          <div class="cards-grid">${list.map(tile).join('')}</div>
        </section>
      </div>`,
    dock: `<button class="btn btn-gold" data-act="saveDeck">${icon('check')}Enregistrer le deck</button>`,
  };
};

/* 10.5 Distribution « Pass & Play » */
SCREENS.deal = () => {
  const d = G.deal, P = G.players, p = P[d.i];
  const dots = `<div class="progress">${P.map((_, k) => `<i class="${k < d.i ? 'done' : k === d.i ? 'cur' : ''}"></i>`).join('')}</div>`;
  if (d.stage === 'handoff') {
    return {
      body: `<div class="handoff panel ornate">
          ${avatar(p.name, 'lg')}
          <p class="kicker">Passez l'appareil à</p>
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
          <h3 class="ri-name">${esc(R[p.role].nom)}</h3>
          <p>${esc(descOf(p.role, G.format))}</p>
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
  $('#dealHint').textContent = d.flipped ? 'Mémorise ton rôle, puis cache ta carte.' : (d.seen ? 'Carte cachée. Tu peux passer l\'appareil.' : 'Touche la carte pour la retourner');
  $('#dealDock').innerHTML = d.flipped
    ? `<button class="btn" data-act="hideCard">${icon('hide')}Cacher</button>`
    : d.seen
      ? `<button class="btn btn-gold" data-act="nextDeal">${last ? 'Tout le monde a vu son rôle' : 'Joueur suivant'}</button>`
      : `<button class="btn" data-act="flip">${icon('flip')}Retourner</button>`;
}

/* 10.6 Nuit — deck d'une nuit */
SCREENS.night = () => {
  const steps = nightStepsNuit(), done = steps.filter((_, k) => G.night.done[k]).length;
  if (!G.night.started) {
    return {
      body: `<div class="night-intro panel ornate">
          <div class="moon-ico">${icon('moon')}</div>
          <h2 class="h2">La nuit tombe…</h2>
          <p class="muted">Le maître du jeu garde l'appareil. ${steps.length} rôle${steps.length > 1 ? 's seront appelés' : ' sera appelé'}, y compris ceux qui dorment au centre, pour ne rien trahir.</p>
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

/* 10.7 Nuit — deck de plusieurs nuits */
SCREENS.mnight = () => {
  const steps = nightStepsMulti();
  if (!G.nightStarted) {
    const limit = G.rules.nights > 1 ? ` sur ${G.rules.nights}` : '';
    return {
      body: `<div class="night-intro panel ornate">
          <div class="moon-ico">${icon('moon')}</div>
          <p class="kicker">Nuit ${roman(G.round)}${limit}</p>
          <h2 class="h2">${G.round === 1 ? 'La première nuit tombe…' : 'La nuit retombe sur le village…'}</h2>
          <p class="muted">${G.players.filter(p => p.alive).length} survivants. Le maître du jeu garde l'appareil et appelle ${steps.length} rôle${steps.length > 1 ? 's' : ''}.</p>
        </div>`,
      dock: `<button class="btn btn-gold glow" data-act="sleepM">${icon('moon')}Le village s'endort</button>`,
    };
  }
  const done = steps.filter(s => G.mdone[s.id]).length;
  const cur = steps.findIndex(s => !G.mdone[s.id]);
  return {
    body: `<div class="panel nprog"><b>${done}/${steps.length}</b><div class="bar"><i style="width:${steps.length ? done / steps.length * 100 : 100}%"></i></div><span class="faint tiny">appels</span></div>
      <ol class="steps">${steps.map((s, k) => {
        const who = G.players.filter(p => p.alive && stepRoles(s).includes(p.role)).map(p => p.name);
        const status = stepStatus(s);
        return `<li class="panel step ${G.mdone[s.id] ? 'done' : ''} ${k === cur ? 'current' : ''}">
          <button class="chk" data-act="checkM" data-id="${s.id}" aria-label="Valider">${icon('check')}</button>
          <div class="step-body">
            <div class="step-title"><span class="n">${roman(k + 1)}</span>${esc(s.title)}</div>
            <p>${esc(s.text)}</p>
            <div class="tags">${who.map(w => `<span class="badge">${esc(w)}</span>`).join('')}${s.tool ? `<span class="badge">Plateau : ${s.tool}</span>` : ''}</div>
            ${status ? `<p class="status">${status}</p>` : ''}
          </div>
          <div class="acts">
            <button class="btn icon" data-act="speakM" data-id="${s.id}" aria-label="Lire à voix haute">${icon('speaker')}</button>
            ${s.action ? `<button class="btn icon btn-gold" data-act="actM" data-id="${s.id}" aria-label="Agir">${icon(s.action === 'voyante' ? 'eye' : s.action === 'sorciere' ? 'potion' : 'target')}</button>` : ''}
          </div>
        </li>`;
      }).join('')}</ol>`,
    dock: `<button class="btn" data-act="openBoard">${icon('board')}Plateau</button><button class="btn btn-gold ${cur === -1 ? 'glow' : ''}" data-act="dawnM">${icon('sun')}Le jour se lève</button>`,
  };
};

/* 10.8 Annonce (plusieurs nuits) : morts, verdict, Chasseur, Maire */
SCREENS.announce = () => {
  const A = G.announce, P = G.players, pend = G.pending[0];
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
    ? `<div class="deaths">${A.deaths.map(i => `<div class="death">${miniCard(P[i].role, { dead: true })}<b>${esc(P[i].name)}</b><small>${CAUSE[P[i].cause] || ''}</small></div>`).join('')}</div>` : '';
  const quiet = !A.deaths.length && !A.lines.length && !pend
    ? `<p class="center muted">${A.kind === 'dawn' ? 'Miracle : personne n\'est mort cette nuit.' : 'Personne n\'est éliminé.'}</p>` : '';
  return {
    body: `<section class="panel ornate banner">
        <p class="kicker">${esc(A.kicker)}</p>
        <h2 style="margin-top:8px">${esc(A.title)}</h2>
        ${A.lines.map(l => `<p>${l}</p>`).join('')}
      </section>
      ${deaths}${quiet}${choice}`,
    dock: `<button class="btn btn-gold" data-act="continueM" ${pend ? 'disabled' : ''}>${A.kind === 'dawn' ? `${icon('sun')}Ouvrir le débat` : `${icon('moon')}Continuer`}</button>`,
  };
};

/* 10.9 Jour : chronomètre */
SCREENS.day = () => {
  const t = G.timer, C = 2 * Math.PI * 90;
  const alive = G.format === 'multi' ? `<section class="panel"><div class="panel-title">${icon('users')}Survivants · ${G.players.filter(p => p.alive).length}</div>
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
          <section class="panel ornate"><p class="muted small">${G.format === 'nuit'
            ? 'Le village se réveille. Chacun peut <b>dire la vérité… ou mentir</b>. Confrontez vos informations : personne n\'est sûr d\'avoir gardé sa carte.'
            : 'Le village se réveille et débat. Accusez, défendez-vous, et préparez le vote : un seul joueur sera éliminé.'}</p></section>
          ${alive}
        </div>
      </div>`,
    dock: `<button class="btn btn-gold" data-act="toVote">${icon('vote')}Passer au vote</button>`,
  };
};
AFTER.day = () => { updateTimerUI(); if (G.timer.running) runTimer(); };

/* 10.10 Vote */
SCREENS.vote = () => {
  const V = G.vote, P = G.players, vi = V.voters[V.k], voter = P[vi];
  const dots = `<div class="progress">${V.voters.map((_, k) => `<i class="${k < V.k ? 'done' : k === V.k ? 'cur' : ''}"></i>`).join('')}</div>`;
  if (V.stage === 'handoff') {
    return {
      body: `<div class="handoff panel ornate">${avatar(voter.name, 'lg')}<p class="kicker">Vote secret — passez l'appareil à</p><h2>${esc(voter.name)}</h2>${dots}</div>`,
      dock: `<button class="btn btn-gold" data-act="iAmVoter">C'est moi, ${esc(voter.name)}</button>`,
    };
  }
  const targets = P.map((p, i) => i).filter(i => i !== vi && (G.format === 'nuit' || P[i].alive));
  return {
    body: `<div class="center"><p class="kicker">${esc(voter.name)}${voter.role === 'maire' ? ' · voix double' : ''}</p><h2 class="h2" style="margin-top:6px">Qui éliminez-vous ?</h2></div>
      <div class="vote-grid">${targets.map(i => `<button class="vtile ${V.sel === i ? 'sel' : ''}" data-act="pickVote" data-i="${i}">${avatar(P[i].name)}<b>${esc(P[i].name)}</b></button>`).join('')}</div>
      ${dots}`,
    dock: `<button class="btn btn-danger" id="confirmVote" data-act="confirmVote" ${V.sel == null ? 'disabled' : ''}>${icon('check')}Confirmer mon vote</button>`,
  };
};

/* 10.11 Dénouement */
SCREENS.result = () => (G.format === 'nuit' ? resultNuit() : resultMulti());

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
        ${G.center.length ? `<section class="panel"><div class="panel-title">${icon('cards')}Cartes du centre</div>
          <div class="center-cards">${G.center.map(id => miniCard(id)).join('')}</div></section>` : ''}
      </div>
      <section class="roster">${P.map((p, i) => `<div class="panel rv">${miniCard(p.role)}<div class="info"><b>${esc(p.name)}</b>
          <small>${p.role === p.start ? esc(R[p.role].nom) : `${esc(R[p.start].nom)} → <b style="display:inline;font-size:12.5px">${esc(R[p.role].nom)}</b>`}</small>
          <small class="faint">Vote : ${G.vote.ballots[i] != null ? esc(P[G.vote.ballots[i]].name) : '—'}</small></div>
          <div class="flags">${Rz.dead.includes(i) ? '<span class="flag dead">Éliminé</span>' : ''}${flag(i)}</div></div>`).join('')}</section>`,
    dock: `<button class="btn" data-act="goHome">Accueil</button><button class="btn btn-gold" data-act="replay">${icon('reset')}Rejouer</button>`,
  };
}

function resultMulti() {
  const P = G.players, w = G.winner;
  const TXT = { village: 'Le village est sauvé', loup: 'Les Loups dévorent le village', tanneur: 'Le Tanneur a gagné', aucun: 'Le village est désert' };
  const cls = w === 'loup' ? 'loup' : w === 'tanneur' ? 'neutre' : 'village';
  const sub = w === 'tanneur' ? 'Le village a éliminé le Tanneur : il gagne seul.'
    : G.limitReached ? `Les Loups ont survécu aux ${G.rules.nights} nuits.`
      : `Fin de partie au ${G.lastPhase === 'vote' ? 'jour' : 'matin du jour'} ${G.round} · ${P.filter(p => p.alive).length} survivant${P.filter(p => p.alive).length > 1 ? 's' : ''}.`;
  const flag = p => { const v = playerWinsMulti(p); return v === null ? '<span class="flag unk">À vérifier</span>' : v ? '<span class="flag win">Gagnant</span>' : '<span class="flag lose">Perdant</span>'; };
  return {
    body: `<section class="panel ornate banner camp-${cls}">
        <div class="ico">${icon(w === 'loup' ? 'wolf' : w === 'tanneur' ? 'skull' : 'trophy')}</div>
        <h2>${TXT[w]}</h2><p>${sub}</p>
      </section>
      <section class="roster">${P.map(p => `<div class="panel rv">${miniCard(p.role, { dead: !p.alive })}<div class="info"><b>${esc(p.name)}</b>
          <small>${p.role === p.start ? esc(R[p.role].nom) : `${esc(R[p.start].nom)} → ${esc(R[p.role].nom)}`}${p.role === 'enfant-sauvage' && G.wildTurned ? ' (devenu Loup)' : ''}</small></div>
          <div class="flags">${p.alive ? '' : '<span class="flag dead">Mort</span>'}${flag(p)}</div></div>`).join('')}</section>
      <section class="panel"><div class="panel-title">${icon('book')}Chronique</div>
        <ul class="chronicle">${G.chronicle.map(c => `<li>${c}</li>`).join('')}</ul></section>`,
    dock: `<button class="btn" data-act="goHome">Accueil</button><button class="btn btn-gold" data-act="replay">${icon('reset')}Rejouer</button>`,
  };
}

/* 10.12 Réglages */
SCREENS.settings = () => {
  const st = S.settings;
  const sw = (k, t, s) => `<label class="setting"><span><b>${t}</b><small>${s}</small></span><input type="checkbox" class="switch" data-set="${k}" ${st[k] ? 'checked' : ''}></label>`;
  return `<div class="settings-grid">
    <section class="panel ornate">
      <div class="panel-title">${icon('music')}Son</div>
      ${sw('ambience', 'Ambiance', 'Vent, grillons et chouette la nuit, oiseaux le jour')}
      ${sw('sfx', 'Effets sonores', 'Cartes, hurlement des loups, cloche de l\'aube')}
      ${sw('voice', 'Narration vocale', 'L\'appareil lit les appels de nuit (voix française)')}
      <div class="setting" style="display:block"><div class="row between"><span><b>Volume</b></span><b class="gold-num" id="volVal">${Math.round(st.volume * 100)} %</b></div>
        <input type="range" class="range" min="0" max="1" step="0.05" value="${st.volume}" data-set="volume" aria-label="Volume"></div>
      <button class="btn sm" style="margin-top:6px" data-act="testSound">${icon('speaker')}Tester le son</button>
    </section>
    <section class="panel ornate">
      <div class="panel-title">${icon('gear')}Partie</div>
      ${sw('secretVote', 'Vote secret', 'Chaque joueur vote seul en se passant l\'appareil')}
      ${sw('haptics', 'Vibrations', 'Retours haptiques sur les appareils compatibles')}
      <p class="tiny faint" style="margin-top:10px">Le nombre de nuits, les cartes au centre et la durée du débat se règlent dans chaque deck.</p>
    </section>
    <section class="panel">
      <div class="panel-title">${icon('trash')}Données</div>
      <div class="row wrap"><button class="btn sm btn-danger" data-act="resetDecks">Supprimer mes decks</button><button class="btn sm" data-act="clearPlayers">Oublier les joueurs</button></div>
    </section></div>`;
};

/* 10.13 Règles */
SCREENS.rules = () => `<div class="rules">
    <section class="panel ornate"><div class="panel-title">${icon('cards')}Les decks</div>
      <p>Il n'y a qu'un bouton <b>Jouer</b> : c'est le <b>deck</b> choisi qui définit la partie. Un deck contient librement n'importe lesquels des ${ROLES.length} rôles, et ses règles : nombre de nuits, cartes au centre, durée du débat, équilibrage automatique.</p></section>
    <section class="panel ornate"><div class="panel-title">${icon('moon')}Deck d'une seule nuit</div>
      <ul><li>Le paquet contient <b>joueurs + cartes au centre</b> (3 selon la règle officielle).</li>
        <li>Une seule nuit, où les cartes peuvent être échangées via le <b>Plateau du MJ</b>, puis un seul vote.</li>
        <li>On gagne avec la carte qu'on a <b>à la fin de la nuit</b>. Le plus désigné meurt (au moins deux voix ; égalité = tous les ex æquo).</li>
        <li><b>Village</b> : au moins un Loup meurt. <b>Loups</b> : aucun Loup ni le Tanneur ne meurt. <b>Tanneur</b> : il est éliminé.</li></ul></section>
    <section class="panel ornate"><div class="panel-title">${icon('sunmoon')}Deck de plusieurs nuits</div>
      <ul><li><b>La nuit</b>, le MJ appelle les rôles : les Loups désignent une victime, la Voyante sonde un joueur, la Sorcière sauve ou empoisonne, le Garde protège.</li>
        <li><b>À l'aube</b>, les morts sont révélés ; le Chasseur tire une dernière balle.</li>
        <li><b>Le jour</b>, débat chronométré puis vote ; le Maire compte double et tranche les égalités.</li>
        <li>Le <b>village</b> gagne quand tous les Loups sont morts ; les <b>Loups</b> dès qu'ils sont aussi nombreux que les autres. Avec une limite de nuits, les Loups survivants gagnent à la fin de la dernière.</li></ul></section>
    <section class="panel ornate"><div class="panel-title">${icon('scale')}Équilibrage automatique</div>
      <p>L'application complète ou réduit le deck pour obtenir exactement le bon nombre de cartes, ajuste la meute (une nuit : 2 Loups jusqu'à 7 joueurs, puis 3, 4, 5 ; plusieurs nuits : environ 1 Loup pour 4 à 5 joueurs) et garde toujours les Francs-maçons par paire.</p></section>
  </div>`;

/* --------------------------------------------------------------------------
   11. MOTEUR « UNE NUIT »
   -------------------------------------------------------------------------- */
function nightStepsNuit() { return NIGHT_NUIT.filter(s => s.ids.some(id => G.cards.includes(id))); }

/* Plateau du MJ (les deux formats) : positions 0..n-1 = joueurs, puis le centre */
const getCard = pos => (pos < G.players.length ? G.players[pos].role : G.center[pos - G.players.length]);
const setCard = (pos, id) => { if (pos < G.players.length) G.players[pos].role = id; else G.center[pos - G.players.length] = id; };
const posLabel = pos => (pos < G.players.length ? G.players[pos].name : `Centre ${pos - G.players.length + 1}`);
let peekTimer;
function renderBoard() {
  const B = G.board, n = G.players.length;
  const slots = [...G.players.map((p, i) => (p.alive ? i : -1)).filter(i => i >= 0), ...G.center.map((_, k) => n + k)];
  openSheet(`<div class="sheet-head"><h3>Plateau du MJ</h3><button class="btn icon btn-ghost" data-act="closeSheet" aria-label="Fermer">${icon('x')}</button></div>
    <p class="sheet-sub">Seul le joueur appelé regarde l'écran. Les échanges modifient les vraies cartes des joueurs.</p>
    <div class="seg">
      <button class="${B.mode === 'peek' ? 'on' : ''}" data-act="boardMode" data-m="peek">${icon('eye')}Regarder</button>
      <button class="${B.mode === 'swap' ? 'on' : ''}" data-act="boardMode" data-m="swap">${icon('swap')}Échanger</button>
    </div>
    <div class="slots">${slots.map(pos => `<button class="slot ${B.sel === pos ? 'sel' : ''}" data-act="slot" data-pos="${pos}">
        ${B.peek === pos ? miniCard(getCard(pos)) : miniBack()}<span class="slot-label">${esc(posLabel(pos))}</span></button>`).join('')}</div>
    <div class="row"><button class="btn sm grow" data-act="shift" data-d="-1">${icon('left')}Décaler</button><button class="btn sm grow" data-act="shift" data-d="1">Décaler${icon('right')}</button></div>
    <p class="tiny faint" style="margin-top:8px">« Décaler » applique le pouvoir de l'Idiot du village à toutes les cartes des joueurs vivants.</p>
    <div class="blog">${B.log.slice(-4).reverse().map(l => `<div>• ${esc(l)}</div>`).join('')}</div>`);
}

function evaluateNuit() {
  const P = G.players, n = P.length, ballots = G.vote.ballots;
  const counts = Array(n).fill(0);
  P.forEach((p, i) => { const t = ballots[i]; if (t != null) counts[t] += p.role === 'maire' ? 2 : 1; });
  const prot = new Set(P.map((p, i) => (p.role === 'garde-du-corps' ? ballots[i] : null)).filter(x => x != null));
  let maxC = 0; counts.forEach((c, i) => { if (!prot.has(i)) maxC = Math.max(maxC, c); });
  let dead = maxC >= 2 ? counts.map((c, i) => (c === maxC && !prot.has(i) ? i : -1)).filter(i => i >= 0) : [];
  const top = Math.max(...counts);
  const saved = [...prot].filter(i => counts[i] === top && top >= 2);
  const hunterShots = [];
  dead.forEach(d => { if (P[d].role === 'chasseur') { const t = ballots[d]; if (t != null && !dead.includes(t) && !prot.has(t) && !hunterShots.includes(t)) hunterShots.push(t); } });
  dead = [...dead, ...hunterShots];
  const isW = i => isWolfId(P[i].role);
  const wolvesInPlay = P.some((_, i) => isW(i));
  const sbire = P.findIndex(p => p.role === 'sbire');
  const tannerDead = dead.some(i => P[i].role === 'tanneur');
  let villageWins, wolvesWin;
  if (wolvesInPlay) { villageWins = dead.some(isW); wolvesWin = !villageWins && !tannerDead; }
  else if (sbire >= 0) { villageWins = dead.includes(sbire) || dead.length === 0; wolvesWin = !dead.includes(sbire) && !tannerDead && dead.length > 0; }
  else { villageWins = dead.length === 0; wolvesWin = false; }
  const winCamps = [];
  if (tannerDead) winCamps.push('neutre');
  if (villageWins) winCamps.push('village');
  if (wolvesWin) winCamps.push('loup');
  return { counts, dead, saved, hunterShots, villageWins, wolvesWin, tannerDead, winCamps };
}
function playerWinsNuit(i) {
  const p = G.players[i], Rz = G.result;
  if (['doppelganger', 'enqueteur', 'enfant-sauvage'].includes(p.role)) return null; // dépend de ce qu'ils ont vu ou choisi
  if (p.role === 'tanneur') return Rz.dead.includes(i);
  return R[p.role].camp === 'Loup' ? Rz.wolvesWin : Rz.villageWins;
}

/* --------------------------------------------------------------------------
   12. MOTEUR « VILLAGE » (plusieurs nuits)
   -------------------------------------------------------------------------- */
const isWolfTeam = p => isWolfId(p.role) || (p.role === 'enfant-sauvage' && G.wildTurned);
const stepRoles = s => (s.id === 'loups' && G.wildTurned ? [...s.ids, 'enfant-sauvage'] : s.ids);

function nightStepsMulti() {
  return NIGHT_MULTI.filter(s => {
    if (s.first && G.round !== 1) return false;
    if (s.id === 'voleur') return G.center.length > 0 && G.players.some(p => p.alive && p.start === 'voleur');
    return G.players.some(p => p.alive && stepRoles(s).includes(p.role));
  });
}
function stepStatus(s) {
  const P = G.players, N = G.na, nm = i => `<b>${esc(P[i].name)}</b>`;
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
function pickPlayer({ title, sub, allow, onPick, selected }) {
  const P = G.players;
  S.sheet = { onPick };
  openSheet(`<div class="sheet-head"><h3>${esc(title)}</h3><button class="btn icon btn-ghost" data-act="closeSheet" aria-label="Fermer">${icon('x')}</button></div>
    ${sub ? `<p class="sheet-sub">${sub}</p>` : ''}
    <div class="choice-grid">${P.map((p, i) => p.alive ? `<button class="choice ${selected === i ? 'on' : ''}" data-act="pickDone" data-i="${i}" ${allow(i) ? '' : 'disabled'}>${avatar(p.name)}<b>${esc(p.name)}</b></button>` : '').join('')}</div>`);
}
function actMulti(id) {
  const P = G.players, N = G.na;
  const selfIdx = role => P.findIndex(p => p.alive && p.role === role);
  const mark = () => { G.mdone[id] = true; closeSheet(); render(); };
  switch (id) {
    case 'voleur': {
      const thief = P.findIndex(p => p.alive && p.start === 'voleur');
      const allWolves = G.center.every(isWolfId);
      S.sheet = {
        onSlot: k => { const taken = G.center[k]; G.center[k] = P[thief].role; P[thief].role = taken; N.thief = taken; Sound.flip(); mark(); },
        onKeep: () => { N.thief = 'keep'; mark(); },
      };
      openSheet(`<div class="sheet-head"><h3>Les cartes du centre</h3><button class="btn icon btn-ghost" data-act="closeSheet">${icon('x')}</button></div>
        <p class="sheet-sub">Montrez cet écran au Voleur (${esc(P[thief].name)}). Il touche la carte qu'il prend.${allWolves ? ' <b>Que des Loups : il doit en prendre un.</b>' : ''}</p>
        <div class="center-cards" style="grid-template-columns:repeat(${G.center.length},minmax(0,120px))">${G.center.map((cid, k) => `<button data-act="thiefSlot" data-k="${k}">${miniCard(cid)}</button>`).join('')}</div>
        <button class="btn block" style="margin-top:16px" data-act="thiefKeep" ${allWolves ? 'disabled' : ''}>Garder ma carte</button>`);
      break;
    }
    case 'enfant': {
      const me = selfIdx('enfant-sauvage');
      pickPlayer({ title: 'Modèle de l\'Enfant Sauvage', sub: 'S\'il meurt, l\'Enfant Sauvage rejoindra la meute.', allow: i => i !== me, selected: G.wildModel, onPick: i => { G.wildModel = i; mark(); } });
      break;
    }
    case 'garde':
      pickPlayer({ title: 'Protection de la nuit', sub: 'Le joueur protégé ne peut pas être dévoré cette nuit.', allow: i => i !== G.lastGuard, selected: N.guard, onPick: i => { N.guard = i; mark(); } });
      break;
    case 'loups':
      pickPlayer({ title: 'Victime des Loups', sub: 'Les Loups désignent en silence le joueur à dévorer.', allow: i => !isWolfTeam(P[i]), selected: N.victim, onPick: i => { N.victim = i; mark(); } });
      break;
    case 'voyante': {
      const me = selfIdx('voyante');
      pickPlayer({ title: 'Vision de la Voyante', sub: 'Touchez un joueur : son rôle s\'affichera pour la Voyante.', allow: i => i !== me, selected: N.seen,
        onPick: i => {
          N.seen = i; G.mdone[id] = true; S.sheet = null; Sound.reveal();
          openSheet(`<div class="role-sheet">${miniCard(P[i].role)}<p class="kicker">${esc(P[i].name)} est</p><h3>${esc(R[P[i].role].nom)}</h3>
            <button class="btn btn-gold block" data-act="closeSheetRender">J'ai vu</button></div>`);
        } });
      break;
    }
    case 'sorciere': {
      const v = N.victim, me = selfIdx('sorciere');
      S.sheet = {
        onSave: () => { N.save = true; G.potions.life = false; toast('Potion de vie utilisée'); actMulti('sorciere'); render(); },
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
function startMultiNight() {
  G.nightStarted = false;
  G.na = { guard: null, victim: null, save: false, poison: null, seen: null, thief: null };
  G.mdone = {};
  go('mnight', { replace: true });
}
function kill(i, cause) {
  const p = G.players[i];
  if (!p.alive) return;
  p.alive = false; p.cause = cause;
  G.announce.deaths.push(i);
  const when = G.announce.kind === 'dawn' ? `Nuit ${G.round}` : `Jour ${G.round}`;
  const how = { nuit: 'mort·e dans la nuit', vote: 'éliminé·e au vote', chasseur: 'abattu·e par le Chasseur' }[cause];
  G.chronicle.push(`${when} — <b>${esc(p.name)}</b> (${esc(R[p.role].nom)}) ${how}.`);
  if (p.role === 'chasseur') G.pending.push({ type: 'hunter', who: i });
  if (p.role === 'tanneur' && cause === 'vote') G.tannerWon = true;
  if (G.wildModel === i && G.players.some(q => q.alive && q.role === 'enfant-sauvage') && !G.wildTurned) {
    G.wildTurned = true;
    G.chronicle.push(`${when} — l'Enfant Sauvage perd son modèle et rejoint secrètement la meute.`);
  }
}
function resolveNightMulti() {
  const N = G.na;
  G.announce = { kind: 'dawn', kicker: `Aube du jour ${roman(G.round)}`, title: 'Le village se réveille…', deaths: [], lines: [] };
  G.pending = [];
  if (N.victim != null && N.victim !== N.guard && !N.save) kill(N.victim, 'nuit');
  if (N.poison != null) kill(N.poison, 'nuit');
  G.lastGuard = N.guard;
  if (!G.announce.deaths.length) G.chronicle.push(`Nuit ${G.round} — personne ne meurt.`);
  Sound.bell(); if (G.announce.deaths.length) setTimeout(() => Sound.doom(), 1600);
  say(G.announce.deaths.length ? `Le village se réveille. Cette nuit, ${G.announce.deaths.map(i => G.players[i].name).join(' et ')} ${G.announce.deaths.length > 1 ? 'sont morts' : 'est mort'}.` : 'Le village se réveille. Personne n\'est mort cette nuit.');
  go('announce', { replace: true });
}
function multiVoteDone() {
  const P = G.players, b = G.vote.ballots, counts = Array(P.length).fill(0);
  Object.entries(b).forEach(([v, t]) => { counts[t] += P[v].role === 'maire' ? 2 : 1; });
  const max = Math.max(0, ...counts);
  const top = max > 0 ? counts.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0) : [];
  G.announce = { kind: 'vote', kicker: `Jour ${roman(G.round)}`, title: 'Le verdict du village', deaths: [], lines: [] };
  G.pending = []; G.lastPhase = 'vote';
  const tally = counts.map((c, i) => [c, i]).filter(x => x[0] > 0).sort((a, c) => c[0] - a[0]).map(([c, i]) => `${esc(P[i].name)} ${c}`).join(' · ');
  if (tally) G.announce.lines.push(`<span class="faint">${tally}</span>`);
  if (top.length === 1) eliminate(top[0]);
  else if (top.length > 1) {
    const mayor = P.findIndex(p => p.alive && p.role === 'maire');
    if (mayor >= 0) G.pending.push({ type: 'tiebreak', who: mayor, options: top });
    else { G.announce.lines.push('Égalité : le village n\'arrive pas à se décider. Personne n\'est éliminé.'); G.chronicle.push(`Jour ${G.round} — égalité, personne n'est éliminé.`); }
  }
  if (G.announce.deaths.length) Sound.doom();
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
function checkWinMulti() {
  if (G.tannerWon) return 'tanneur';
  const alive = G.players.filter(p => p.alive);
  const w = alive.filter(isWolfTeam).length, o = alive.length - w;
  if (!alive.length) return 'aucun';
  if (w === 0) return 'village';
  if (w >= o) return 'loup';
  return null;
}
function playerWinsMulti(p) {
  const w = G.winner;
  if (w === 'aucun') return false;
  if (w === 'tanneur') return p.role === 'tanneur';
  if (['doppelganger', 'enqueteur'].includes(p.role)) return null;
  if (p.role === 'tanneur') return false;
  const wolfSide = isWolfTeam(p) || R[p.role].camp === 'Loup';
  return wolfSide ? w === 'loup' : w === 'village';
}

/* --------------------------------------------------------------------------
   13. ÉLÉMENTS PARTAGÉS
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
  const deck = getDeck(S.deckId);
  const b = balanceDeck(deck, n);
  if (!b.valid) return toast('Le deck ne contient pas le bon nombre de cartes');
  const dealt = shuffle(b.cards);
  G = {
    deckName: deck.name,
    format: b.format,
    rules: b.rules,
    cards: b.cards,
    players: S.players.map((name, i) => ({ name, role: dealt[i], start: dealt[i], alive: true, canVote: true })),
    center: dealt.slice(n),
    deal: { i: 0, stage: 'handoff', flipped: false, seen: false },
    timer: { total: b.rules.debate, left: b.rules.debate, running: false, end: 0 },
    vote: null,
    night: { started: false, done: {} },
    board: { mode: 'peek', sel: null, peek: null, log: [] },
    round: 1, potions: { life: true, death: true }, lastGuard: null, wildModel: null, wildTurned: false,
    chronicle: [], pending: [], announce: null,
  };
  keepAwake(true);
  S.stack = [];
  go('deal', { replace: true });
}
function startDay() {
  G.timer = { total: G.rules.debate, left: G.rules.debate, running: false, end: 0 };
  go('day', { replace: true });
}
function startVote() {
  stopTimer();
  const voters = G.format === 'nuit'
    ? G.players.map((_, i) => i)
    : G.players.map((p, i) => (p.alive && p.canVote ? i : -1)).filter(i => i >= 0);
  G.vote = { voters, k: 0, stage: S.settings.secretVote ? 'handoff' : 'pick', ballots: {}, sel: null };
  if (!voters.length) return finishVote();
  say('Le débat est clos. Votez maintenant.');
  go('vote', { replace: true });
}
function finishVote() {
  if (G.format === 'nuit') {
    G.result = evaluateNuit(); keepAwake(false);
    if (G.result.dead.length) Sound.doom();
    go('result', { replace: true });
  } else multiVoteDone();
}

/* Chronomètre (horloge réelle : fiable même si l'écran se met en veille) */
let timerInt = null;
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function runTimer() { clearInterval(timerInt); timerInt = setInterval(tick, 200); }
function startTimer() { const t = G.timer; if (t.left <= 0) t.left = t.total; t.running = true; t.end = Date.now() + t.left * 1000; runTimer(); updateTimerUI(); }
function pauseTimer() { const t = G.timer; t.left = Math.max(0, (t.end - Date.now()) / 1000); t.running = false; clearInterval(timerInt); updateTimerUI(); }
function stopTimer() { if (G && G.timer && G.timer.running) pauseTimer(); clearInterval(timerInt); }
function tick() {
  const t = G && G.timer; if (!t) { clearInterval(timerInt); return; }
  t.left = Math.max(0, (t.end - Date.now()) / 1000);
  if (t.left <= 0) { t.running = false; clearInterval(timerInt); Sound.chime(); haptic([250, 120, 250]); say('Le temps est écoulé. Passez au vote.'); }
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

/* Voix française (l'ambiance baisse pendant la lecture) */
function say(text) {
  if (!S.settings.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = .92; u.pitch = .85;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    u.onstart = () => Sound.duck(true);
    u.onend = u.onerror = () => Sound.duck(false);
    speechSynthesis.speak(u);
  } catch (e) { /* voix indisponible */ }
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
function roleSheet(id, format) {
  openSheet(`<div class="sheet-head"><span></span><button class="btn icon btn-ghost" data-act="closeSheet" aria-label="Fermer">${icon('x')}</button></div>
    <div class="role-sheet camp-${cc(id)}">${miniCard(id)}<span class="badge"><i class="dot"></i>${CAMP_LABEL[R[id].camp]}</span>
    <h3>${esc(R[id].nom)}</h3><p>${esc(descOf(id, format))}</p>
    ${R[id].description_multi && format === 'nuit' ? `<p class="tiny faint">En partie de plusieurs nuits : ${esc(R[id].description_multi)}</p>` : ''}
    ${R[id].description_multi && format === 'multi' ? `<p class="tiny faint">En partie d'une nuit : ${esc(R[id].description)}</p>` : ''}</div>`);
}
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2300);
}

/* --------------------------------------------------------------------------
   14. ACTIONS
   -------------------------------------------------------------------------- */
const A = {
  back,
  goto: el => go(el.dataset.to),
  goHome: endGame,

  sheetBg(el, e) { if (e.target === el) closeSheet(); },
  closeSheet,
  closeSheetRender() { closeSheet(); render(); },
  sheetOk() { const cb = S.sheet && S.sheet.onOk; closeSheet(); cb && cb(); },
  roleInfo(el) { roleSheet(el.dataset.id, S.draft ? formatOf(S.draft.rules) : 'multi'); },
  pickDone(el) { const cb = S.sheet && S.sheet.onPick; cb && cb(+el.dataset.i); },

  /* Jouer */
  addPlayer() {
    const inp = $('#pName'); const v = (inp.value || '').trim().replace(/\s+/g, ' ');
    if (!v) return inp.focus();
    if (S.players.length >= CONFIG.maxPlayers) return toast(`${CONFIG.maxPlayers} joueurs maximum`);
    if (S.players.some(p => p.toLowerCase() === v.toLowerCase())) return toast('Ce prénom est déjà pris');
    S.players.push(v); saveAll(); S.focusName = true; haptic(10); Sound.tap(); render();
  },
  rmPlayer(el) { S.players.splice(+el.dataset.i, 1); saveAll(); render(); },
  clearPlayers() { S.players = []; saveAll(); render(); toast('Liste des joueurs vidée'); },
  pickDeck(el) { S.deckId = el.dataset.id; saveAll(); Sound.tap(); render(); },
  playDeck(el) { S.deckId = el.dataset.id; saveAll(); go('play'); },
  startGame,

  /* Decks */
  newDeck() {
    S.draft = { id: 'u' + Date.now(), name: '', counts: {}, rules: { ...RULES_DEFAULT } };
    S.filter = 'all'; go('deckEdit');
  },
  editDeck(el) {
    const d = S.custom.find(x => x.id === el.dataset.id); if (!d) return;
    S.draft = { ...d, counts: { ...d.counts }, rules: { ...RULES_DEFAULT, ...d.rules } }; S.filter = 'all'; go('deckEdit');
  },
  dupDeck(el) {
    const d = getDeck(el.dataset.id);
    S.draft = { id: 'u' + Date.now(), name: `${d.name} (perso)`.slice(0, 28), counts: { ...d.counts }, rules: { ...RULES_DEFAULT, ...d.rules } };
    S.filter = 'all'; go('deckEdit');
  },
  delDeck(el) {
    const d = S.custom.find(x => x.id === el.dataset.id); if (!d) return;
    confirmSheet('Supprimer ce deck ?', `« ${d.name} » sera définitivement supprimé.`, 'Supprimer', () => {
      S.custom = S.custom.filter(x => x.id !== d.id);
      if (S.deckId === d.id) S.deckId = DEFAULT_DECKS[0].id;
      saveAll(); render(); toast('Deck supprimé');
    });
  },
  filterRoles(el) { S.filter = el.dataset.f; render(); },
  toggleRole(el) {
    const id = el.dataset.id, c = S.draft.counts;
    if (R[id].multiple) { A.inc(el); return; }
    if (c[id]) delete c[id]; else c[id] = 1;
    haptic(8); Sound.tap(); render();
  },
  inc(el) { const id = el.dataset.id, c = S.draft.counts; c[id] = Math.min(capOf(id), (c[id] || 0) + 1); haptic(8); Sound.tap(); render(); },
  dec(el) { const id = el.dataset.id, c = S.draft.counts; if (c[id] > 1) c[id]--; else delete c[id]; haptic(8); render(); },
  setFormat(el) {
    const r = S.draft.rules;
    if (el.dataset.v === 'nuit') { r.nights = 1; r.center = 3; }
    else { r.nights = r.nights === 1 ? 0 : r.nights; if (r.center === 3) r.center = 0; }
    render();
  },
  nights(el) {
    // séquence : ∞ (0) → 2 → 3 … 10 → ∞
    const r = S.draft.rules, d = +el.dataset.d;
    const seq = [2, 3, 4, 5, 6, 7, 8, 9, 10, 0];
    const k = seq.indexOf(r.nights);
    r.nights = seq[Math.max(0, Math.min(seq.length - 1, (k < 0 ? seq.length - 1 : k) + d))];
    render();
  },
  setCenter(el) { S.draft.rules.center = +el.dataset.v; render(); },
  saveDeck() {
    const d = S.draft, name = ($('#dName').value || '').trim();
    const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
    if (!name) { $('#dName').focus(); return toast('Donnez un nom au deck'); }
    if (total < 3) return toast('Choisissez au moins 3 cartes');
    const deck = { id: d.id, name, counts: { ...d.counts }, rules: { ...d.rules } };
    const k = S.custom.findIndex(x => x.id === d.id);
    if (k >= 0) S.custom[k] = deck;
    else {
      if (S.custom.length >= CONFIG.maxCustomDecks) return toast(`${CONFIG.maxCustomDecks} decks personnels maximum`);
      S.custom.push(deck);
    }
    S.deckId = deck.id; saveAll(); S.draft = null; toast('Deck enregistré'); back();
  },

  /* Distribution */
  iAm() { G.deal.stage = 'card'; render(); },
  flip() {
    const d = G.deal;
    if (d.flipped) return;
    d.flipped = true; d.seen = true; haptic(15); Sound.flip(); Sound.reveal(); updateDealUI();
    setTimeout(() => { const ri = $('#revealInfo'); ri && ri.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 650);
  },
  hideCard() { G.deal.flipped = false; haptic(10); Sound.flip(); updateDealUI(); },
  nextDeal() {
    const d = G.deal;
    if (d.i >= G.players.length - 1) {
      if (G.format === 'nuit') go('night', { replace: true }); else startMultiNight();
      return;
    }
    G.deal = { i: d.i + 1, stage: 'handoff', flipped: false, seen: false }; render();
  },

  /* Nuit — une nuit */
  sleep() {
    const steps = nightStepsNuit(); G.night.started = true;
    Sound.howl();
    setTimeout(() => say(`Tout le monde ferme les yeux. Le village s'endort. ${steps[0] ? steps[0].text : ''}`), 1800);
    render();
  },
  checkStep(el) {
    const k = +el.dataset.k, steps = nightStepsNuit();
    G.night.done[k] = !G.night.done[k]; haptic(10); Sound.tap();
    if (G.night.done[k]) { const nx = steps.findIndex((_, j) => !G.night.done[j]); say(nx === -1 ? 'Tous les rôles ont été appelés.' : steps[nx].text); }
    render();
  },
  speak(el) { const s = nightStepsNuit()[+el.dataset.k]; s && say(s.text); },
  openBoard() { G.board.sel = null; G.board.peek = null; renderBoard(); },
  boardMode(el) { G.board.mode = el.dataset.m; G.board.sel = null; G.board.peek = null; renderBoard(); },
  slot(el) {
    const B = G.board, pos = +el.dataset.pos;
    if (B.mode === 'peek') {
      B.peek = pos; haptic(10); Sound.flip(); renderBoard(); clearTimeout(peekTimer);
      peekTimer = setTimeout(() => { B.peek = null; if ($('#sheet').classList.contains('open') && $('.slots')) renderBoard(); }, 2600);
      return;
    }
    if (B.sel == null) B.sel = pos;
    else if (B.sel === pos) B.sel = null;
    else {
      const a = getCard(B.sel), c = getCard(pos); setCard(B.sel, c); setCard(pos, a);
      B.log.push(`Échange : ${posLabel(B.sel)} ↔ ${posLabel(pos)}`); B.sel = null; haptic([15, 40, 15]); Sound.flip(); toast('Cartes échangées');
    }
    renderBoard();
  },
  shift(el) {
    const idx = G.players.map((p, i) => (p.alive ? i : -1)).filter(i => i >= 0);
    const n = idx.length, d = +el.dataset.d, old = idx.map(i => G.players[i].role);
    idx.forEach((i, k) => { G.players[i].role = old[(k - d + n) % n]; });
    G.board.log.push(`Décalage vers la ${d > 0 ? 'droite' : 'gauche'}`); haptic(20); Sound.flip(); toast('Cartes décalées'); renderBoard();
  },
  dawnNuit() {
    const pending = nightStepsNuit().some((_, k) => !G.night.done[k]);
    const goDay = () => { Sound.bell(); say('Tout le monde se réveille ! Le jour se lève sur le village.'); startDay(); };
    if (pending) confirmSheet('Lever le jour ?', 'Certains rôles n\'ont pas encore été appelés.', 'Le jour se lève', goDay); else goDay();
  },

  /* Nuit — plusieurs nuits */
  sleepM() {
    G.nightStarted = true;
    const steps = nightStepsMulti();
    Sound.howl();
    setTimeout(() => say(`Tout le monde ferme les yeux. Le village s'endort. ${steps[0] ? steps[0].text : ''}`), 1800);
    render();
  },
  checkM(el) {
    const id = el.dataset.id; G.mdone[id] = !G.mdone[id]; haptic(10); Sound.tap();
    if (G.mdone[id]) { const nx = nightStepsMulti().find(s => !G.mdone[s.id]); say(nx ? nx.text : 'Tous les rôles ont été appelés.'); }
    render();
  },
  speakM(el) { const s = NIGHT_MULTI.find(x => x.id === el.dataset.id); s && say(s.text); },
  actM(el) { actMulti(el.dataset.id); },
  thiefSlot(el) { S.sheet && S.sheet.onSlot && S.sheet.onSlot(+el.dataset.k); },
  thiefKeep() { S.sheet && S.sheet.onKeep && S.sheet.onKeep(); },
  witchSave() { S.sheet && S.sheet.onSave && S.sheet.onSave(); },
  witchPoison() { S.sheet && S.sheet.onPoison && S.sheet.onPoison(); },
  witchDone() { S.sheet && S.sheet.onDone && S.sheet.onDone(); },
  dawnM() {
    const steps = nightStepsMulti();
    const noVictim = steps.some(s => s.id === 'loups') && G.na.victim == null;
    const pending = steps.some(s => !G.mdone[s.id]);
    if (noVictim) return confirmSheet('Aucune victime ?', 'Les Loups n\'ont désigné personne. Lever quand même le jour ?', 'Le jour se lève', resolveNightMulti);
    if (pending) return confirmSheet('Lever le jour ?', 'Certains rôles n\'ont pas encore été appelés.', 'Le jour se lève', resolveNightMulti);
    resolveNightMulti();
  },
  resolvePending(el) {
    const i = +el.dataset.i, pend = G.pending.shift();
    if (pend.type === 'hunter') kill(i, 'chasseur'); else eliminate(i);
    haptic(20); Sound.doom(); render();
  },
  continueM() {
    if (G.pending.length) return;
    let w = checkWinMulti();
    // Limite de nuits atteinte après le vote du dernier jour : les Loups survivants gagnent
    if (!w && G.announce.kind === 'vote' && G.rules.nights > 1 && G.round >= G.rules.nights) { w = 'loup'; G.limitReached = true; }
    if (w) {
      G.winner = w; G.lastPhase = G.announce.kind === 'vote' ? 'vote' : 'dawn'; keepAwake(false);
      if (w === 'loup') Sound.howl(.2); else Sound.bell();
      say({ loup: 'Les Loups-Garous ont gagné.', village: 'Le village a gagné.', tanneur: 'Le Tanneur a gagné.', aucun: 'Il ne reste personne.' }[w]);
      go('result', { replace: true }); return;
    }
    if (G.announce.kind === 'dawn') startDay();
    else { G.round++; startMultiNight(); }
  },

  /* Jour */
  tToggle() { G.timer.running ? pauseTimer() : startTimer(); haptic(10); Sound.tap(); },
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
    const V = G.vote; V.sel = +el.dataset.i; haptic(10); Sound.tap();
    document.querySelectorAll('.vtile').forEach(t => t.classList.toggle('sel', +t.dataset.i === V.sel));
    $('#confirmVote').disabled = false;
  },
  confirmVote() {
    const V = G.vote; if (V.sel == null) return;
    V.ballots[V.voters[V.k]] = V.sel; V.sel = null; V.k++; haptic(20);
    if (V.k >= V.voters.length) return finishVote();
    V.stage = S.settings.secretVote ? 'handoff' : 'pick'; render(); $('#view').scrollTop = 0;
  },
  replay() { G = null; S.stack = ['home']; go('play', { replace: true }); },

  /* Réglages */
  testSound() { Sound.init(); Sound.howl(); setTimeout(() => Sound.bell(), 2600); },
  resetDecks() {
    confirmSheet('Supprimer vos decks ?', 'Vos decks personnels seront effacés. Les decks fournis restent.', 'Supprimer', () => {
      S.custom = []; S.deckId = DEFAULT_DECKS[0].id; saveAll(); toast('Decks supprimés'); render();
    });
  },
};

document.addEventListener('click', e => {
  Sound.init(); // débloque / relance l'audio au moindre geste (iOS)
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (fn) fn(el, e);
});
/* Clavier (Mac / iPad avec clavier) */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'pName') { e.preventDefault(); A.addPlayer(); return; }
  if (e.key === 'Escape') { if ($('#sheet').classList.contains('open')) closeSheet(); else if (S.screen !== 'home' && !IN_GAME.includes(S.screen)) back(); return; }
  if (e.target.matches('input, textarea')) return;
  if (S.screen === 'deal' && G && G.deal.stage === 'card' && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault(); G.deal.flipped ? A.hideCard() : A.flip();
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'dName' && S.draft) S.draft.name = t.value;
  if (t.dataset.set === 'debate' && S.draft) { S.draft.rules.debate = +t.value; $('#debateVal').textContent = fmtTime(+t.value); }
  if (t.dataset.set === 'volume') { S.settings.volume = +t.value; $('#volVal').textContent = `${Math.round(+t.value * 100)} %`; Sound.setVolume(+t.value); saveAll(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.set === 'autoBalance' && S.draft) { S.draft.rules.autoBalance = t.checked; render(); return; }
  if (t.dataset.set && t.type === 'checkbox') {
    S.settings[t.dataset.set] = t.checked; saveAll(); haptic(8);
    if (t.dataset.set === 'ambience') { Sound.scene = undefined; Sound.setScene(SCENE_OF[S.screen]); }
  }
});
document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded'); }, true);
document.addEventListener('error', e => {
  if (e.target.tagName === 'IMG') { BROKEN.add(e.target.getAttribute('src')); e.target.classList.add('is-broken'); }
}, true);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (G && S.screen !== 'result') keepAwake(true);
    if (Sound.ctx) Sound.ctx.resume();
  } else if (Sound.ctx) Sound.ctx.suspend();
});

/* --------------------------------------------------------------------------
   15. DÉMARRAGE
   -------------------------------------------------------------------------- */
function enter() {
  const sp = $('#splash');
  if (sp.classList.contains('gone')) return;
  sp.classList.add('gone');
  document.body.classList.add('ready');
  Sound.init();
  render();
}
function registerSW() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(reg => {
    const urls = [CONFIG.cardBack, './assets/images/accueil.jpg', ...ROLES.map(r => r.image_url)];
    reg.active && reg.active.postMessage({ type: 'WARM_IMAGES', urls });
  }).catch(() => { /* hors HTTPS ou refusé */ });
}
(function boot() {
  if (!getDeck(S.deckId)) S.deckId = DEFAULT_DECKS[0].id;
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
