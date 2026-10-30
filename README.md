# Loup-Garou — PWA

Application web mobile du jeu Loup-Garou, en deux modes : **Classique** (plusieurs nuits, maître du jeu) et **Pour une Nuit** (une nuit, un vote, joueurs + 3 cartes).

- Distribution secrète « pass & play » avec cartes retournables en 3D
- Decks personnalisés (3 par mode) et équilibrage automatique
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
