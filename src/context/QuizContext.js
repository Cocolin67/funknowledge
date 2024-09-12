// src/context/QuizContext.js
import { createContext, useContext, useState, useRef } from "react";

const QuizContext = createContext();

export function QuizProvider({ children }) {
  const [startTime, setStartTime] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const startTimer = () => {
    setStartTime(Date.now());
    setTimerRunning(true);
  };

  const getTimeElapsed = () => {
    if (!timerRunning || startTime === null) {
      return null;
    }
    return (Date.now() - startTime) / 1000; // Retourne le temps écoulé en secondes
  };

  const stopTimer = () => {
    setTimerRunning(false);
  };

  return (
    <QuizContext.Provider value={{ startTimer, getTimeElapsed, stopTimer }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  return useContext(QuizContext);
}