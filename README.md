# Loup-Garou — PWA

Application web du jeu Loup-Garou (iPhone, iPad, Mac). Un seul bouton **Jouer** : c'est le **deck** qui définit la partie.

- Decks fournis : Thiercelieux, Pour une Nuit, Grand village, Nuit complète, Trois nuits
- Decks personnels (8) : n'importe lesquels des 25 rôles + règles (nombre de nuits, cartes au centre, durée du débat, équilibrage automatique)
- Distribution secrète « pass & play » avec cartes retournables en 3D
- Ambiance sonore synthétisée (nuit : vent, grillons, chouette, loups · jour : oiseaux) et effets
- Appels de nuit guidés (avec narration vocale), chronomètre de débat, vote secret
- Installable sur iPhone : Safari → Partager → « Sur l'écran d'accueil »
- Fonctionne hors ligne après la première visite

## Structure
```
index.html   style.css   app.js   manifest.json   sw.js
assets/images/   25 illustrations de rôles ({id}.jpg)
assets/icons/    icônes de l'application
```

Illustrations encore attendues : `assets/images/accueil.jpg` (fond d'accueil) et `assets/images/dos-de-carte.jpg`. En leur absence, l'application affiche un décor vectoriel de remplacement.
