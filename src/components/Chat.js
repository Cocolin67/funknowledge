import { useEffect, useState, useRef } from "react";
import { socket } from "../socket";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    function onMessageReceived(message) {
      const id = Date.now();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prevMessages) => [
        ...prevMessages,
        { id, text: message, time, animated: true }
      ]);
    }

    socket.on("message", onMessageReceived);

    return () => {
      socket.off("message", onMessageReceived);
    };
  }, []);

  useEffect(() => {
    function scrollToBottom() {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-1/2 bg-gray-500 rounded-r shadow-lg">
      <div className="flex-grow overflow-y-auto">
        {messages.map((message) => (
          <div
            className={`odd:bg-gray-600 even:bg-gray-700 text-white p-3 ${message.animated ? "message-animation" : ""}`}
            key={message.id}
          >
            <span className="mr-2 text-gray-300 font-light">{message.time}</span>{message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2">
        <form className="flex-grow" onSubmit={(e) => e.preventDefault()}>
          <input
            maxLength={255}
            placeholder="Cliquez ici pour envoyer un message..."
            className="border border-gray-300 rounded-xl p-2 text-black w-full"
            type="text"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const message = e.target.value;
                if (message.trim() !== "") {
                  socket.emit("message", message);
                  e.target.value = "";
                }
              }
            }}
          />
        </form>
      </div>
    </div>
  );
};

export default Chat;