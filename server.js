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
const port = 3010;
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

  function consoleLog(message, type = "info") {
    const date = new Date();
    const timestamp = date.toLocaleTimeString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  function startQuiz() {
    io.emit("quiz_started", true);
    io.emit("quiz_question", "");

    let seenQuestions = new Set();

    function sendQuestion() {
      const categories = Object.keys(questionsData);
      let randomCategory, randomQuestionIndex;

      do {
      randomCategory = categories[Math.floor(Math.random() * categories.length)];
      randomQuestionIndex = Math.floor(Math.random() * questionsData[randomCategory].length);
      } while (seenQuestions.has(`${randomCategory}-${randomQuestionIndex}`) && seenQuestions.size < Object.keys(questionsData).reduce((acc, category) => acc + questionsData[category].length, 0));

      if (seenQuestions.size >= Object.keys(questionsData).reduce((acc, category) => acc + questionsData[category].length, 0)) {
      seenQuestions.clear();
      }

      randomQuestion = questionsData[randomCategory][randomQuestionIndex];
      if (!randomQuestion || !randomQuestion.answer) {
        consoleLog("Erreur : la question sélectionnée est invalide.", "error");
        io.emit("toast_error", "Une erreur est survenue avec la question sélectionnée.");
        return;
      }
      randomQuestion.category = randomCategory;
      seenQuestions.add(`${randomCategory}-${randomQuestionIndex}`);
      io.emit("quiz_question", randomQuestion);

      questionTimer = setTimeout(() => {
      if (Object.keys(currentAnswers).length === 0) {
        io.emit("toast_message", `Temps écoulé ! La bonne réponse était : ${randomQuestion.answer}. Personne n'a répondu.`);
        calculateLeaderboard();
        endQuiz(false);
        startQuiz();
      } else {
        io.emit("toast_message", `Temps écoulé ! La bonne réponse était : ${randomQuestion.answer}.`);
        calculateLeaderboard();
        endQuiz(false);
        startQuiz();
      }
      }, 18000); // ajoute 3 secondes pour laisser une marge de temps pour les réponses
    }

    setTimeout(() => {
      sendQuestion();
    }, 10000); // 10 secondes avant la prochaine question
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
      consoleLog("Aucune réponse n'a été enregistrée, aucun point n'est attribué.");
    } else {
      // Trier les réponses par temps pris pour répondre
      const sortedAnswers = Object.values(currentAnswers).sort((a, b) => a.timeTaken - b.timeTaken);

      // Attribuer des points uniquement aux joueurs qui ont répondu
      sortedAnswers.forEach((answer, index) => {
        const points = 10 - index; // Le premier obtient 10 points, le deuxième 9, etc.
        playerScores[answer.socketId] = (playerScores[answer.socketId] || 0) + Math.max(points, 1); // Minimum de 1 point
      });
    }

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
        const timeTaken = currentAnswers[id] ? currentAnswers[id].timeTaken : null;
        // Vérifie si le joueur existe, sinon utilise un nom générique
        return { username: player ? player.username : "Joueur inconnu", score, timeTaken };
      })
      .sort((a, b) => b.score - a.score);

    io.emit("leaderboard", leaderboard);
    consoleLog(`Classement actuel :${JSON.stringify(playerScores)}`);
    console.log(leaderboard);
  }


  io.on("connection", (socket) => {
    socket.on("join", (username) => {
      if (!username) {
        socket.emit("toast_error", "Le pseudo est requis pour rejoindre le jeu.");
        return;
      }

      socket.username = username;
      const player = { id: socket.id, username };
      connectedPlayers.push(player);
      playerScores[socket.id] = playerScores[socket.id] || 0;

      consoleLog(`Joueur connecté : ${username}`);
      socket.emit("authentified", true);

      if (connectedPlayers.length >= 2) {
        if (!quizStarted) {
          quizStarted = true;
          startQuiz();
        }
      }

      io.emit("players", connectedPlayers.map((player) => player.username));
      socket.emit("quiz_started", quizStarted);
      socket.emit("quiz_question", randomQuestion);
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
      
      if (quizStarted) {
        let similarity = stringSimilarity(data.response, randomQuestion.answer);

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
    consoleLog(`> Ready on http://${hostname}:${port}`);
  });
});