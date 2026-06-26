# BattTrack

![Bannière BattTrack](assets/images/banner.png)

BattTrack est une PWA légère pour suivre les batteries rarement utilisées, estimer leur autodécharge et éviter les décharges profondes.

Elle est pensée pour les batteries que l'on oublie facilement : drone, perceuse, caméra, gonfleur, casque, lampe, accessoires saisonniers, etc.

## Aperçu

![Tableau de bord BattTrack](assets/images/screenshot-dashboard.png)

![Détail d'une batterie](assets/images/screenshot-battery-detail.png)

![Modale de mise à jour](assets/images/screenshot-update-modal.png)

## Fonctionnalités

- Suivi des batteries par pourcentage ou par indicateur LED.
- Estimation du niveau actuel à partir de l'autodécharge observée.
- Statuts visuels : OK, à surveiller, à recharger et non initialisée.
- Tableau de bord filtrable par état.
- Fiches batteries avec historique, statistiques et mini graphique.
- Mesures avec date et heure.
- Modification et suppression des mesures.
- Recharge rapide à 100 %.
- Archivage des batteries.
- Notifications locales simples pour les batteries à recharger.
- Export et import JSON des données.
- Thème clair, sombre ou système.
- Installation en PWA sur smartphone ou ordinateur.

## Captures et assets

Les visuels du dépôt sont rangés dans :

```text
assets/images/
```

| Fichier | Usage |
|---|---|
| `assets/images/banner.png` | Bannière du README |
| `assets/images/screenshot-dashboard.png` | Capture du tableau de bord |
| `assets/images/screenshot-battery-detail.png` | Capture d'une fiche batterie |
| `assets/images/screenshot-update-modal.png` | Capture de la modale de mise à jour |

Les icônes PWA sont rangées dans :

```text
assets/
```

| Fichier | Usage |
|---|---|
| `assets/icon-192.png` | Icône PWA standard 192 px |
| `assets/icon-512.png` | Icône PWA standard 512 px |
| `assets/icon-192-maskable.png` | Icône Android maskable 192 px |
| `assets/icon-512-maskable.png` | Icône Android maskable 512 px |
| `assets/apple-touch-icon.png` | Icône iOS |
| `assets/favicon.png` | Favicon |
| `assets/logo.png` | Logo utilisé dans l'application |

## Mise à jour

BattTrack peut vérifier la version disponible et afficher un message simple du type :

```text
Mises à jour disponibles : v1.4.0
```

L'objectif est de s'appuyer sur les GitHub Releases pour consulter le détail complet des nouveautés.

## Version actuelle

v1.4.0

## Changements récents

- Mesures avec date et heure.
- Historique trié par date et heure.
- Modification possible de l'heure d'une mesure.
- Graphique avec repères 100 %, 50 % et 0 %.
- Graphique coloré selon les seuils.
- Correction du mode LED.
- Correction du démarrage de l'application après refactorisation des modules.

## Structure du projet

```text
BattTrack/
├── assets/
│   ├── images/
│   ├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-192-maskable.png
│   ├── icon-512-maskable.png
│   ├── apple-touch-icon.png
│   ├── favicon.png
│   └── logo.png
├── css/
│   ├── style.css
│   └── tokens.css
├── js/
│   ├── app.js
│   ├── battery.js
│   ├── calculation.js
│   ├── constants.js
│   ├── db.js
│   ├── import-export.js
│   ├── measurement.js
│   ├── settings.js
│   └── ui.js
├── index.html
├── manifest.json
├── service-worker.js
├── version.json
└── README.md
```

## Données

Les données sont stockées localement dans le navigateur via IndexedDB.

Aucun compte utilisateur, serveur ou API externe n'est nécessaire pour utiliser l'application.

## GitHub

- Projet : https://github.com/c34gl3j3rmy/BattTrack
- Signaler un bug : https://github.com/c34gl3j3rmy/BattTrack/issues/new?labels=bug
- Proposer une amélioration : https://github.com/c34gl3j3rmy/BattTrack/issues/new?labels=enhancement

## Licence

Code source disponible sur GitHub. Tous droits réservés.
