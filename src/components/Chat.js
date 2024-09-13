import { useEffect, useState, useRef } from "react";
import { socket } from "../socket";
import { useQuiz } from "../context/QuizContext"; // Utiliser le contexte

const Chat = ({ username }) => {
  const [quizQuestion, setQuizQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const { getTimeElapsed } = useQuiz(); // Pas de stopTimer, on prend juste le temps écoulé

  useEffect(() => {
    function onMessageReceived(message) {
      const id = Date.now();
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setMessages((prevMessages) => [
        ...prevMessages,
        { id, text: message, time, animated: true },
      ]);
    }

    const handleQuizQuestion = (question) => {
      setQuizQuestion(question);
    };

    socket.on("message", onMessageReceived);
    socket.on("quiz_question", handleQuizQuestion);


    return () => {
      socket.off("message", onMessageReceived);
      socket.off("quiz_question", handleQuizQuestion);
    };
  }, []);

  useEffect(() => {
    function scrollToBottom() {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    scrollToBottom();
  }, [messages]);

  const handleMessage = (message) => {
    if (message.trim() !== "") {
      return message; // Retourne le message pour l'utiliser dans handleUserResponse
    }
    return null; // Retourne null si le message est vide ou invalide
  };

  const handleUserResponse = (e) => {
    e.preventDefault();
    const response = e.target.value;
    const answer = handleMessage(response); // Appeler handleMessage avec la réponse
    if (!answer) return; // Si la réponse est vide, ne pas continuer

    const timeTaken = getTimeElapsed(); // Obtenir le temps écoulé
    if (timeTaken !== null && quizQuestion) {
      // Envoyer la réponse et le temps de réponse au serveur
      socket.emit("user_response", {
        username: username, // Inclure le nom d'utilisateur
        response: answer,
        timeTaken,
      });
      console.log(
        `Tentative de réponse envoyée : ${timeTaken} secondes par ${username}`
      );
      e.target.value = ""; // Reset the input after sending
    } else {
      socket.emit("message", answer);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-1/2 bg-gray-700">
      <div className="flex-grow overflow-y-auto">
        {messages.map((message) => (
          <div
            className={`odd:bg-gray-600 even:bg-gray-700 text-white p-3 ${
              message.animated ? "message-animation" : ""
            }`}
            key={message.id}
          >
            <span className="mr-2 text-gray-300 font-light">{message.time}</span>
            {message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2">
        <form className="flex-grow" onSubmit={handleUserResponse}>
          <input
            maxLength={255}
            placeholder="Cliquez ici pour envoyer un message..."
            className="border border-gray-300 rounded-xl p-2 text-black w-full"
            type="text"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUserResponse(e);
              }
            }}
          />
        </form>
      </div>
    </div>
  );
};

export default Chat;