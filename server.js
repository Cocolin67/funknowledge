import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stringSimilarity } from "string-similarity-js";
import { start } from "node:repl";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  let connectedPlayers = [];
  let playerScores = {}; // Stockage des scores des joueurs
  let quizStarted = false;
  let quizAnsweredCorrectly = false;
  let questionTimer;
  let randomQuestion = {};
  let currentAnswers = {}; // Stockage des réponses actuelles des joueurs

  const questionsPath = path.join(__dirname, "src", "data", "questions.json");
  let questionsData = {};

  try {
    const data = fs.readFileSync(questionsPath, "utf-8");
    questionsData = JSON.parse(data);
  } catch (err) {
    console.error("Erreur lors du chargement des questions:", err);
  }

  function startQuiz() {
    console.log("Starting quiz...");
    io.emit("quiz_started", true);
    io.emit("quiz_question", "");

    function sendQuestion() {
      const categories = Object.keys(questionsData);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      randomQuestion = questionsData[randomCategory][Math.floor(Math.random() * questionsData[randomCategory].length)];
      io.emit("quiz_question", randomQuestion.question);

      questionTimer = setTimeout(() => {
        if (Object.keys(currentAnswers).length === 0) {
          // Personne n'a répondu
          io.emit("toast_message", `Temps écoulé ! La bonne réponse était : ${randomQuestion.answer}. Personne n'a répondu.`);
          endQuiz(false);
          startQuiz();
        } else {
          // Calculer le classement seulement si des réponses existent
          io.emit("toast_message", `Temps écoulé ! La bonne réponse était : ${randomQuestion.answer}.`);
          calculateLeaderboard();
          endQuiz(false);
          startQuiz(); // Redémarrer le quiz
        }
      }, 16000);
    }

    setTimeout(() => {
      sendQuestion();
    }, 5000);
  }

  function endQuiz(retry) {
    clearTimeout(questionTimer);
    io.emit("quiz_question", "");
    quizAnsweredCorrectly = false;
    currentAnswers = {};
    if (retry === false) return;
    quizStarted = false;
    io.emit("quiz_started", false);
    currentAnswers = {};
  }

  function calculateLeaderboard() {
    if (Object.keys(currentAnswers).length === 0) {
      console.log("Aucune réponse n'a été enregistrée, aucun point n'est attribué.");
      return; // Ne pas calculer le classement si aucune réponse
    }

    // Trier les réponses par temps pris pour répondre
    const sortedAnswers = Object.values(currentAnswers).sort((a, b) => a.timeTaken - b.timeTaken);

    // Attribuer des points uniquement aux joueurs qui ont répondu
    sortedAnswers.forEach((answer, index) => {
      const points = 10 - index; // Le premier obtient 10 points, le deuxième 9, etc.
      playerScores[answer.socketId] = (playerScores[answer.socketId] || 0) + Math.max(points, 1); // Minimum de 1 point
    });

    console.log("Scores des joueurs :", playerScores);

    // Nettoyer les scores pour les joueurs déconnectés
    const activePlayerIds = connectedPlayers.map((player) => player.id);
    Object.keys(playerScores).forEach((id) => {
      if (!activePlayerIds.includes(id)) {
        delete playerScores[id]; // Supprimer les scores des joueurs déconnectés
      }
    });

    // Envoyer le classement aux joueurs
    const leaderboard = Object.entries(playerScores)
      .map(([id, score]) => {
        const player = connectedPlayers.find((p) => p.id === id);
        // Vérifie si le joueur existe, sinon utilise un nom générique
        return { username: player ? player.username : "Joueur inconnu", score };
      })
      .sort((a, b) => b.score - a.score);

    io.emit("leaderboard", leaderboard);
    console.log("Classement actuel :", leaderboard);
  }


  io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("join", (username) => {
      if (!username) {
        socket.emit("toast_error", "Le pseudo est requis pour rejoindre le jeu.");
        return;
      }

      socket.username = username;
      const player = { id: socket.id, username };
      connectedPlayers.push(player);
      playerScores[socket.id] = playerScores[socket.id] || 0;

      if (connectedPlayers.length >= 2) {
        if (!quizStarted) {
          quizStarted = true;
          startQuiz();
        }
      }

      io.emit("players", connectedPlayers.map((player) => player.username));
      socket.emit("quiz_started", quizStarted);
      socket.emit("quiz_question", randomQuestion.question);
    });

    socket.on("message", (data) => {    
      if (!socket.username) {
        socket.emit("toast_error", "Erreur : pseudo manquant. Veuillez rejoindre à nouveau.");
        return;
      }
      
      io.emit("message", socket.username + " : " + data);
    });

    socket.on("user_response", (data) => {
      if (!socket.username) {
        socket.emit("toast_error", "Erreur : pseudo manquant. Veuillez rejoindre à nouveau.");
        return;
      }

      let similarity = stringSimilarity(data.response, randomQuestion.answer);

      if (quizStarted) {
        if (similarity >= 0.9) {
          socket.emit("toast_message", `Bravo ${socket.username} ! La réponse est correcte. (Temps de réponse : ${data.timeTaken} secondes)`);
          quizAnsweredCorrectly = true;

          // Enregistrer la réponse avec le temps pris pour répondre
          currentAnswers[socket.id] = { socketId: socket.id, timeTaken: data.timeTaken };
        } else if (similarity >= 0.75) {
          socket.emit("toast_warning", `Presque ! Réessaie. (Précision : ${similarity})`);
          io.emit("message", socket.username + " : " + data.response);
        } else {
          io.emit("message", socket.username + " : " + data.response);
        }
      } else {
        io.emit("message", socket.username + " : " + data.response);
      }
    });

    socket.on("start_quiz", () => {
      if (!quizStarted) {
        quizStarted = true;
        startQuiz();
      }
    });

    socket.on("disconnect", () => {
      connectedPlayers = connectedPlayers.filter((player) => player.id !== socket.id);
      io.emit("players", connectedPlayers.map((player) => player.username));

      if (connectedPlayers.length <= 1) {
        if (quizStarted) {
          quizStarted = false;
          endQuiz();
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});