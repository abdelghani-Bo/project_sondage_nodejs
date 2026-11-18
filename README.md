# ClassPulse 🚀 - Plateforme Collaborative de Sondages, Votes et Examens Sécurisés

**ClassPulse** est une application web moderne complète conçue pour l'enseignement interactif en temps réel et l'organisation d'examens en ligne hautement sécurisés assistés par Intelligence Artificielle.

---

## 🌟 Périmètre Fonctionnel Implémenté

### 1. Gestion des Utilisateurs, Profils & Sécurité
* **Authentification Complète** : Inscription et Connexion par email / mot de passe chiffré (bcrypt + JWT / Refresh Tokens) et intégration **OAuth2 Google & Microsoft**.
* **Configuration Avancée du Compte & Photo de Profil** :
  * Upload de photo de profil depuis son ordinateur (format image, convertie et stockée sans perte).
  * Sélection parmi une galerie d'avatars stylisés ou génération d'avatars vectoriels aléatoires.
  * Modification du nom, prénom et changement sécurisé du mot de passe avec validation de l'ancien mot de passe.
* **Interface Professionnelle Prête pour Déploiement** : Suppression de toutes les barres de démo au profit d'un parcours utilisateur authentique et épuré.
* **Rôles Dynamiques par Classe** : Un utilisateur est **Administrateur** dans les classes qu'il crée, et **Membre** dans celles qu'il rejoint.

### 2. Gestion des Espaces de Classe
* **Création de Classe** : Définition du nom, matière/catégorie, description et choix de bannières thématiques.
* **Système d'Invitation Unique** :
  * Génération automatique de codes alphanumériques sécurisés (ex. : `CLS-89A4`).
  * Liens d'invitation directe avec jeton cryptographique (`http://localhost:4200/join/<token>`).
* **Outils d'Administration** :
  * Verrouillage / Déverrouillage des nouvelles inscriptions.
  * Réinitialisation instantanée du code d'accès et du lien d'invitation.
  * Exclusion d'un membre ou mise en sourdine.

### 3. Sondages & Votes en Direct
* **Types de Consultation** : Choix unique (Vote) ou choix multiples (Sondage).
* **Option d'Anonymat** : Masquage de l'identité des votants.
* **Affichage des Résultats Temps Réel** : Barres dynamiques et pourcentages mis à jour instantanément pour tous les participants via **WebSockets (Socket.io)**.
* **Modes de Visibilité** : Affichage en direct ou uniquement après clôture du vote par l'enseignant.

### 4. Boîte à Questions (Q&A Modérée)
* **Publication & Upvotes** : Les étudiants posent leurs questions et votent pour les questions de leurs pairs.
* **Tri Dynamique** : Les questions les plus plébiscitées remontent automatiquement pour attirer l'attention du professeur.
* **Modération Enseignant** : Marquage « Répondue » et suppression des questions hors-sujet.

### 5. Messagerie Instantanée & Modération
* **Chat de Groupe en Temps Réel** : Échanges textuels, liens et barre de réactions rapides (`👍`, `❤️`, `🔥`, `👏`, `💡`).
* **Mode Silencieux Administrateur** : Bouton permettant de verrouiller instantanément l'envoi de messages pour tous les étudiants (idéal pendant les explications ou les examens).
* **Modération Unitaire** : Suppression de messages et mise en sourdine temporaire d'un étudiant.

### 6. Module d'Examens Sécurisés & IA
* **Génération de QCM par IA** :
  * Saisie d'un thème ou upload d'un **support de cours (PDF / Texte)**.
  * Génération de questions à choix multiples avec distracteurs et explications pédagogiques (moteur Gemini et générateur heuristique intégré sans dépendance obligatoire).
  * Interface de relecture et d'édition pour modifier questions et réponses avant publication.
* **Questions Éphémères Chronométrées** :
  * Compte à rebours strict (ex. : 30 secondes) avec barre circulaire animée.
  * Soumission automatique et passage forcé à la question suivante à expiration du délai, sans possibilité de retour en arrière.
  * Mélange aléatoire (randomization) des questions et des propositions (A, B, C, D).
* **Surveillance par Webcam (Proctoring Actif)** :
  * Activation obligatoire de la caméra avant démarrage de l'examen.
  * Détection de visage en temps réel (BlazeFace TensorFlow.js + API Chromium FaceDetector + Analyse chromatique et de contraste YCbCr).
  * **Alerte immédiate en cas de visage masqué ou absent** : signal sonore (bip synthétisé), bordure rouge clignotante du widget PIP, bandeau d'alerte supérieur et modal d'avertissement obligeant le candidat à se replacer.
  * Widget Picture-in-Picture (PIP) en continu avec badge de statut en direct : *« Visage détecté ✅ »* vs *« Visage masqué / absent ⚠️ »*.
  * Envoi automatique de snapshots de violation horodatés au tableau de bord enseignant.
* **Anti-Triche Avancé (Anti-Tab Switch)** :
  * Détection de changement d'onglet ou perte de focus de la fenêtre.
  * Avertissements avec modal d'alerte (1/3, 2/3).
  * **Disqualification automatique au 3ème avertissement**.
* **Feedback Personnalisé & Gamification** :
  * Calcul de points valorisant la vitesse et la justesse des réponses.
  * Podium dynamique et classement consultable par l'enseignant.
  * Analyse post-examen générée par l'IA expliquant les forces et les notions à revoir.
  * **Export des résultats en CSV (compatible Microsoft Excel)**.

---

## 🛠️ Stack Technique

* **Frontend** : Angular 17+ (Architecture Standalone, Signals, Tailwind CSS, Google Fonts Inter, FontAwesome 6, Canvas Confetti).
* **Backend** : Node.js, Express, Socket.io (gestion des Salons / Rooms par classe), Helmet, Rate Limiter, Multer, PDF-Parse, JWT, Bcrypt.
* **Base de Données** : **MySQL** (MariaDB) avec ORM **Sequelize** (Schémas relationnels, clés étrangères et synchronisation automatique).

---

## 🚀 Démarrage Rapide

### 1. Base de données MySQL
Assurez-vous que MySQL est actif sur le port standard `3306` (ex. via XAMPP). La base `classpulse_db` est déjà créée et synchronisée.

### 2. Lancer le Backend
```bash
cd backend
npm install
node src/server.js
```
*Le serveur tourne sur `http://localhost:5000`.*

### 3. Lancer le Frontend
```bash
cd frontend
npm install
npm start
```
*L'application est accessible sur `http://localhost:4200`.*

---

## 🔑 Identifiants Préconfigurés

| Profil | Email | Mot de passe | Rôle |
|---|---|---|---|
| **Professeur (Admin)** | `professeur@classpulse.fr` | `password123` | Créateur de classe, modérateur, gestionnaire d'examens |
| **Étudiante (Membre)** | `etudiant@classpulse.fr` | `password123` | Votante, participante chat & examens surveillés |
| **Étudiant (Membre 2)** | `thomas@classpulse.fr` | `password123` | Participant aux sondages et Q&A |




cmd.exe /c "cd /d c:\Users\Dell\Downloads\project_sondage_nodejs\frontend && npm.cmd start"
cmd.exe /c "cd /d c:\Users\Dell\Downloads\project_sondage_nodejs\backend && node src/server.js"