import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useQuiz } from "../context/QuizContext";
import { AnimatePresence, motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const QuizInterface = ({ quizStarted }) => {
  const [setInit] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit] = useState(15);
  const { startTimer } = useQuiz();
  const [bgColor, setBgColor] = useState("bg-gray-400");
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const handleQuizStarted = (started) => {
      if (started) {
        clearInterval(timer);
      } else {
        clearInterval(timer);
        setQuizQuestion("");
      }
    };

    const handleQuizQuestion = (question) => {
      clearInterval(timer);
      startTimer();
      if (question === "") {
        question = { question: "", answer: quizQuestion.answer, category: "" };
      }
      setQuizQuestion(question);
      console.log("Question : ", question);
      setTimeLeft(timeLimit);
    };

    const timer = setInterval(() => {
      if (quizStarted && timeLeft > 0) {
        setTimeLeft((prev) => prev - 1);
      }
    }, 1000);

    const handleLeaderboard = (data) => {
      setLeaderboard(data);
    };

    socket.on("leaderboard", handleLeaderboard);
    socket.on("quiz_started", handleQuizStarted);
    socket.on("quiz_question", handleQuizQuestion);

    return () => {
      clearInterval(timer);
      socket.off("leaderboard", handleLeaderboard);
      socket.off("quiz_started", handleQuizStarted);
      socket.off("quiz_question", handleQuizQuestion);
    };
  }, [quizStarted, timeLeft, timeLimit, startTimer, quizQuestion.answer]);

  useEffect(() => {
    if (!quizStarted) {
      setBgColor("bg-gray-400");
    } else if (quizQuestion.question === "") {
      setBgColor("bg-gray-700");
    } else {
      setBgColor("bg-green-700");
    }
  }, [quizStarted, quizQuestion]);

  const progress = ((timeLeft / timeLimit) * 100).toFixed(0);

  // Trouver le joueur ayant répondu le plus rapidement
  const fastestPlayer = leaderboard.find(player => player.timeTaken);

  return (
    <div
      className={`overflow-scroll flex flex-col items-center justify-center h-1/2 p-3 relative transition-colors duration-500 ${bgColor}`}
      style={{ transition: "background-color 1s ease-in-out" }}
    >
      <AnimatePresence>
        {quizStarted ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center w-full h-full flex flex-col items-center justify-center"
          >
            <AnimatePresence>
              {quizQuestion.question === "" ? (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center w-full"
                >
                  <p>La bonne réponse était <strong>{quizQuestion.answer}</strong></p>
                  <h2 className="text-xl font-bold mb-4">Résultats :</h2>
                  <ul className="space-y-2 w-full">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((player, index) => (
                        <li
                          key={index}
                          className={`flex justify-between items-center border-b border-gray-300 py-1 ${
                            player === fastestPlayer ? "bg-purple-800" : ""
                          }`} // Highlight the fastest player
                        >
                          <p class="flex justify-between items-center">
                            <span className="font-bold">
                              {index === 0 && <span>🥇</span>}
                              {index === 1 && <span>🥈</span>}
                              {index === 2 && <span>🥉</span>}
                              {index > 2 && index + 1}
                            </span>{" "}
                            {player.username}
                            <span>
                            {player.timeTaken ? (
                              <span className="mx-auto text-sm text-gray-200">
                                {player === fastestPlayer ? <span>⚡</span> : <span>✅</span>}{player.timeTaken}s{" "}
                              </span>
                            ) : (
                              <span className="text-sm">❌</span>
                            )}
                            </span>
                          </p>
                          <p className="font-semibold">{player.score} pts</p>
                        </li>
                      ))
                    ) : (
                      <li>Aucun joueur dans le classement pour l&apos;instant.</li>
                    )}
                  </ul>
                </motion.div>
              ) : (
                <>
                  <motion.h3
                    key="category"
                    className="text-xl font-bold mb-4 [text-shadow:_0_1px_0_rgb(0_0_0_/_40%)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {quizQuestion.category}
                  </motion.h3>
                  <motion.h2
                    key="question"
                    className="text-3xl font-bold mb-4 [text-shadow:_0_1px_0_rgb(0_0_0_/_40%)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {quizQuestion.question}
                  </motion.h2>
                  <motion.div
                    key="timer"
                    className="w-24 h-24 mb-4 mx-auto"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <CircularProgressbar
                      className="m-auto -z-10"
                      value={progress}
                      text={`${timeLeft}`}
                      styles={buildStyles({
                        textSize: "32px",
                        pathColor: timeLeft <= 5 ? "red" : "rgba(255, 255, 255, 1)",
                        textColor: "#FFF",
                        fontWeight: "bold",
                        trailColor: "#000",
                        backgroundColor: timeLeft <= 5 ? "red" : "rgba(21, 128, 61, 1)",
                      })}
                      strokeWidth={10}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.button
            key="waiting"
            disabled={true}
            className="bg-gray-500 text-white rounded p-4 px-10 m-auto text-2xl font-bold drop-shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            En attente de joueurs...
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizInterface;