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
      question: "What is the capital of France?",
      answer: "Paris"
    },
    {
      question: "What is the largest planet in our solar system?",
      answer: "Jupiter"
    },
    {
      question: "How many continents are there?",
      answer: "7"
    }
  ];

  const connectedPlayers = [];

  let quizStarted = false; // Déclaration à l'extérieur du gestionnaire de connexion

  function startQuiz(socket) {
    console.log("Starting quiz...");
    io.emit("server_message", "Starting quiz...");

    setTimeout(() => {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      io.emit("server_message", randomQuestion.question);
      socket.currentQuestion = randomQuestion; // Sauvegarde de la question actuelle pour vérification
    }, 2000);

    // Ecouteur pour recevoir la réponse à la question du quiz
    socket.once("message", (data) => {
      console.log("Received answer:", data);
      if (socket.currentQuestion && socket.currentQuestion.answer.toLowerCase() === data.toLowerCase()) {
        io.emit("server_message", "Good job " + socket.username + " ! The answer is correct.");
      } else {
        io.emit("server_message", "Incorrect answer " + socket.username + ". Try again next time.");
      }

      // Fermeture du quiz après la réponse
      setTimeout(() => {
        io.emit("server_message", "");
        quizStarted = false; // Réinitialise quizStarted pour permettre un nouveau quiz
      }, 2000);
    });
  }

  io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (username) => {
    socket.username = username;

    io.emit("alert_message", `${username} has joined the quiz.`);
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

    if (!quizStarted) {
      if (data === "startquiz") {
        quizStarted = true; // Définir quizStarted sur true avant de lancer le quiz
        startQuiz(socket); // Lance le quiz
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.username}`);
    io.emit("alert_message", `${socket.username} has left the quiz.`);

    // Supprimer le joueur déconnecté de la liste des joueurs connectés
    connectedPlayers = connectedPlayers.filter((player) => player.id !== socket.id);
  });

  socket.on("get_players", () => {
    // Envoyer la liste des joueurs connectés à tous les clients
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
