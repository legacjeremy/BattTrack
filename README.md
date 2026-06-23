# Battery Reminder

Application web statique/PWA pour aider à éviter les décharges profondes des batteries rarement utilisées en estimant leur autodécharge et en affichant un statut visuel.

## Version

v0.7.0


## Changements v0.7.0

- Intégration des assets graphiques validés.
- Ajout du logo SVG dans l'en-tête.
- Ajout des icônes SVG de navigation, d'actions et de statuts.
- Ajout des tokens CSS issus du design system.
- Mise à jour des icônes PWA.
- Mise à jour du cache Service Worker.

## Fonctionnalités implémentées

- PWA installable
- IndexedDB
- Suivi de batteries individuelles
- Mesures en pourcentage
- Mesures par LEDs fixes
- Mesures par LEDs fixes + clignotantes
- Pourcentage manuel modifiable même avec une observation LED
- Cycles de recharge
- Bouton "Rechargé à 100 %"
- Estimation en temps réel du niveau actuel avec le symbole `≈`
- Statuts visuels : 🟢 OK, 🟠 À surveiller, 🔴 À recharger, ⚪ Non initialisée
- Tableau de bord avec compteur de batteries archivées
- Page 🔋 Batteries avec accès aux Archives
- Page 📦 Archives
- Page ⚙️ Paramètres
- Thème clair / sombre / système
- Import / export JSON dans Paramètres
- Modale À propos
- Tri mémorisé : urgence, nom, ≈ % restant, dernière mesure, dernière recharge, statut
- Historique avec perte `%/j`
- Archivage / restauration / suppression définitive
- Modification / suppression des mesures
- FAB contextuel selon la page

## Backlog validé

- Détection et confirmation des mesures aberrantes
- Graphique d'autodécharge
- Notifications PWA
- Meilleure gestion des conversions LED vers pourcentage
- Détail avancé des cycles
- Export CSV
- Synchronisation optionnelle multi-appareils

## Idées futures

- NFC / QR Code par batterie
- Intégration Home Assistant
- Import de modèles prédéfinis pour certains appareils
- Statistiques avancées
- Icône PWA personnalisée plus travaillée

## Important

L'application doit être servie via GitHub Pages ou un serveur local. Ne pas ouvrir `index.html` directement en `file://`, car les modules JavaScript ES6 et le Service Worker peuvent être bloqués.
