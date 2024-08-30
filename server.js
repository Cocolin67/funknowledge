import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url"; // Import nécessaire pour utiliser import.meta.url

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Configuration pour obtenir __dirname avec import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  let connectedPlayers = [];
  let quizStarted = false;

  // Charger les questions depuis le fichier JSON
  const questionsPath = path.join(__dirname, "src", "data", "questions.json");
  let questionsData = {};
  let randomQuestion = {};

  // Lire les questions au démarrage du serveur
  try {
    const data = fs.readFileSync(questionsPath, "utf-8");
    questionsData = JSON.parse(data);
  } catch (err) {
    console.error("Erreur lors du chargement des questions:", err);
  }

  function startQuiz(socket) {
    console.log("Starting quiz...");
    io.emit("toast_message", "Le quiz commence...");
    io.emit("quiz_started", true);

    let questionTimer; // Timer pour chaque question

    // Fonction pour envoyer une question
    function sendQuestion() {
      // Choisir une catégorie aléatoire et une question dans cette catégorie
      const categories = Object.keys(questionsData);
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];
      randomQuestion =
        questionsData[randomCategory][
          Math.floor(Math.random() * questionsData[randomCategory].length)
        ];

      // Envoyer la question au client
      io.emit("quiz_question", randomQuestion.question);
      socket.currentQuestion = randomQuestion; // Sauvegarder la question actuelle pour vérification

      // Démarrer le timer pour la question (ex: 15 secondes pour répondre)
      questionTimer = setTimeout(() => {
        io.emit(
          "toast_message",
          `Temps écoulé ! La bonne réponse était : ${socket.currentQuestion.answer}.`
        );
        endQuiz(); // Appeler la fonction pour arrêter le quiz
      }, 16000); // Le timer est réglé à 15 secondes (ajuste cette durée selon tes besoins)
    }

    // Fonction pour terminer le quiz
    function endQuiz(retry) {
      clearTimeout(questionTimer); // Annuler le timer actuel
      quizStarted = false; // Réinitialise le statut du quiz
      io.emit("quiz_question", ""); // Effacer la question affichée
      if (retry === false) return; // Retournez pour relancer une question
      io.emit("quiz_started", false);
    }

    // Démarre le quiz en envoyant la première question
    setTimeout(() => {
      sendQuestion();
    }, 5000);

    // Écouter les réponses des joueurs, mais uniquement pour les nouvelles connexions
      socket.on("message", (data) => {
        // Vérifier si la réponse est correcte
        if (
          socket.currentQuestion &&
          socket.currentQuestion.answer.toLowerCase() === data.toLowerCase()
        ) {
          clearTimeout(questionTimer); // Annuler le timer lorsque la bonne réponse est donnée
          io.emit(
            "toast_message",
            `Bravo ${socket.username} ! La réponse est correcte.`
          );
          endQuiz(false);

          // Envoie une nouvelle question après une bonne réponse
          setTimeout(() => {
            sendQuestion();
          }, 10000);
        }
      });
  }

  io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("join", (username) => {
      socket.username = username;

      console.log(`User connected: ${username}`);

      // Ajouter le joueur connecté à la liste des joueurs connectés
      const player = { id: socket.id, username };
      connectedPlayers.push(player);

      // Envoyer la liste des joueurs connectés à tous les clients
      io.emit(
        "players",
        connectedPlayers.map((player) => player.username)
      );
    });

    socket.on("message", (data) => {
      console.log("Message reçu:", data);
      io.emit("message", `${socket.username} : ${data}`);
    });

    socket.on("start_quiz", () => {
      if (!quizStarted) {
        quizStarted = true;
        startQuiz(socket);
      }
    });

    socket.on("get_players", () => {
      // Envoyer la liste des joueurs connectés à tous les clients
      io.emit(
        "players",
        connectedPlayers.map((player) => player.username)
      );
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.username}`);

      // Supprimer le joueur déconnecté de la liste des joueurs connectés
      connectedPlayers = connectedPlayers.filter(
        (player) => player.id !== socket.id
      );
      io.emit(
        "players",
        connectedPlayers.map((player) => player.username)
      );
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});