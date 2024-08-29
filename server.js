import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  const questions = [
    {
      question: "Quelle est la capitale de la France ?",
      answer: "Paris",
    },
    {
      question: "Quelle est la plus grande planète de notre système solaire ?",
      answer: "Jupiter",
    },
    {
      question: "Combien y a-t-il de continents ?",
      answer: "7",
    },
  ];

  let connectedPlayers = [];
  let quizStarted = false; // Déclaration à l'extérieur du gestionnaire de connexion
  let currentQuestion = null;
  let answerTimeout = null; // Pour gérer le temps limite pour les réponses

  function startQuiz(socket) {
    console.log("Starting quiz...");
    io.emit("server_message", "Démarrage du quiz...");
    io.emit("quiz_started", true);

    // Commencer le quiz après un court délai
    setTimeout(() => {
      askQuestion(socket);
    }, 5000);
  }

  function askQuestion(socket) {
    // Sélectionner une question au hasard
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    io.emit("quiz_question", currentQuestion.question);

    // Délai pour recevoir la réponse (par exemple, 15 secondes)
    answerTimeout = setTimeout(() => {
      io.emit("server_message", "Temps écoulé ! Aucune bonne réponse reçu.");
      endQuiz(); // Optionnel : Terminer le quiz ou demander la question suivante
    }, 16000); // Temps limite de 15 secondes ++ une extra seconde pour laisser le temps de répondre
  }

  function endQuiz() {
    io.emit("quiz_started", false);
    quizStarted = false; // Réinitialiser l'état du quiz pour permettre un nouveau quiz
    currentQuestion = null; // Réinitialiser la question actuelle
    if (answerTimeout) clearTimeout(answerTimeout); // Annuler tout timeout restant
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
      io.emit("players", connectedPlayers.map((player) => player.username));
    });

    socket.on("message", (data) => {
      // Handle incoming message
      console.log("Received message:", data);
      io.emit("message", socket.username + " : " + data);

      // Vérification de la réponse pendant le quiz
      if (quizStarted && currentQuestion && currentQuestion.answer.toLowerCase() === data.toLowerCase()) {
        io.emit("server_message", `Bien joué ${socket.username}, bonne réponse !`);
        clearTimeout(answerTimeout); // Annuler le timeout si la réponse correcte est donnée
        endQuiz(); // Terminer le quiz ou demander la question suivante
      }
    });

    socket.on("start_quiz", () => {
      if (!quizStarted) {
        quizStarted = true;
        startQuiz(socket);
      }
    });

    socket.on("get_players", () => {
      // Envoyer la liste des joueurs connectés à tous les clients
      io.emit("players", connectedPlayers.map((player) => player.username));
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.username}`);

      // Supprimer le joueur déconnecté de la liste des joueurs connectés
      connectedPlayers = connectedPlayers.filter((player) => player.id !== socket.id);
      io.emit("players", connectedPlayers.map((player) => player.username));
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