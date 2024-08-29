import { useEffect, useState } from "react";
import { socket } from "../socket";

const QuizInterface = () => {
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(15); // Temps limite en secondes

  const handleStartQuiz = () => {
    socket.emit("start_quiz");
  };

  useEffect(() => {
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
      setQuizQuestion(question);
      setTimeLeft(timeLimit); // Réinitialiser le temps restant au début du quiz
    };

    const timer = setInterval(() => {
      if (quizStarted && timeLeft > 0) {
        setTimeLeft((prev) => prev - 1); // Décrémente le temps restant chaque seconde
      }
    }, 1000);

    // Abonne les écouteurs aux événements du serveur
    socket.on("quiz_started", handleQuizStarted);
    socket.on("quiz_question", handleQuizQuestion);

    // Nettoyage lors du démontage du composant
    return () => {
      clearInterval(timer);
      socket.off("quiz_started", handleQuizStarted);
      socket.off("quiz_question", handleQuizQuestion);
    };
  }, [quizStarted, timeLeft, timeLimit]);

  const progress = ((timeLeft / timeLimit) * 100).toFixed(0);

  return (
    <div className="flex flex-col items-center justify-center h-1/2 bg-gray-400 rounded-r shadow-lg p-3">
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