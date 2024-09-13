import { useEffect, useMemo, useState } from "react";
import { socket } from "../socket";

import { useQuiz } from "../context/QuizContext"; // Utiliser le contexte

import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadAll } from "@tsparticles/all";

const QuizInterface = () => {
  const [init, setInit] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(15);
  const [leaderboard, setLeaderboard] = useState([]);
  const { startTimer } = useQuiz();

  const handleStartQuiz = () => {
    socket.emit("start_quiz");
  };

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadAll(engine);
    }).then(() => {
      setInit(true);
    });

    const handleQuizStarted = (started) => {
      if (started) {
        clearInterval(timer);
        setQuizStarted(true);
      } else {
        clearInterval(timer);
        setQuizStarted(false);
        setQuizQuestion("");
      }
    };

    const handleQuizQuestion = (question) => {
      clearInterval(timer);
      startTimer();
      setQuizQuestion(question);
      setTimeLeft(timeLimit); // Réinitialiser le temps restant au début du quiz
    };

    const timer = setInterval(() => {
      if (quizStarted && timeLeft > 0) {
        setTimeLeft((prev) => prev - 1); // Décrémente le temps restant chaque seconde
      }
    }, 1000);

    const handleLeaderboard = (data) => {
      setLeaderboard(data);
    };

    socket.on("leaderboard", handleLeaderboard);
    socket.on("quiz_started", handleQuizStarted);
    socket.on("quiz_question", handleQuizQuestion);

    // Nettoyage lors du démontage du composant
    return () => {
      clearInterval(timer);
      socket.off("quiz_started", handleQuizStarted);
      socket.off("quiz_question", handleQuizQuestion);
      socket.off("leaderboard", handleLeaderboard);
    };
  }, [quizStarted, timeLeft, timeLimit, startTimer]);

  const progress = ((timeLeft / timeLimit) * 100).toFixed(0);

  const options1 = useMemo(
    () => ({
      fpsLimit: 60,
      fullScreen: false,
      particles: {
        color: { value: "#FFFFFF" },
        move: {
          enable: true,
          speed: 2,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "out" },
          bounce: true,
        },
        number: {
          density: { enable: true, area: 100 },
          value: 100,
        },
        opacity: {
          value: { min: 0.3, max: 1 },
          animation: {
            enable: true,
            speed: 1,
            minimumValue: 0.3,
            sync: true,
          },
        },
        shape: {
          type: "char", // Spécifie le type de particule comme étant un caractère
          options: {
            char: {
              value: "?", // Caractère à afficher
              font: "Verdana", // Police utilisée
              style: "", // Style CSS additionnel
              weight: "", // Poids du caractère
              fill: true, // Remplit le caractère
            },
          },
        },
        size: {
          value: { min: 10, max: 20 },
        },
        rotate: {
        value: { min: 0, max: 360 }, // Définir la plage de rotation en degrés
        animation: {
          enable: true,
          speed: 10, // Vitesse de rotation
          sync: false, // Les rotations ne sont pas synchronisées entre les particules
        },
      },
      },
      detectRetina: true,
    }),
    []
  );

  return (
    <div className="flex flex-col items-center justify-center h-1/2 bg-gray-400 p-3 relative">
      <Particles id="tsparticles" options={options1} className="h-full w-full absolute" />
      {quizStarted ? (
        <div className="text-center">
          <h2 className="text-3xl font-bold m-auto mb-4">{quizQuestion}</h2>
          {quizQuestion !== "" && (
          <>
          <div className="w-full bg-gray-300 rounded-full h-4 mb-4">
            <div
              className="quiz_progress-bar-inner bg-blue-600 h-4 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-lg font-bold">{timeLeft} secondes restantes</p>
          </>
          )}
          {quizQuestion === "" && (
            <p>En attente de la prochaine question...</p>
          )}
        </div>
      ) : (
        <button
          onClick={handleStartQuiz}
          className="bg-blue-500 text-white rounded p-4 px-10 m-auto text-2xl font-bold drop-shadow-lg"
        >
          Commencer le quiz
        </button>
      )}
    </div>
  );
};

export default QuizInterface;