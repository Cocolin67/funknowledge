"use client";

import { useEffect, useState } from "react";
import { socket } from "../socket";

import PlayerList from "../components/PlayerList";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [messages, setMessages] = useState([]);
  const [server_message, setServer_message] = useState("");
  const [username, setUsername] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    function onConnect() {
      //
    }

    function onDisconnect() {
      //
    }

    function onMessageReceived(message) {
      const id = Date.now(); // Utiliser un identifiant unique pour chaque message
      setMessages((prevMessages) => [
        ...prevMessages,
        { id, text: message, animated: true }
      ]);

      // Supprime le message après 10 secondes
      /*setTimeout(() => {
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== id)
        );
      }, 10000);*/
    }

    function onServerMessageReceived(message) {
      setServer_message(message);
    }

    socket.on("message", onMessageReceived);
    socket.on("server_message", onServerMessageReceived);

    return () => {
      socket.off("message", onMessageReceived);
      socket.off("server_message", onServerMessageReceived);
    };
  }, []);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit("join", username);  // Émet l'événement 'join' avec le pseudo ici
      console.log("User connected:", username);
      setIsModalOpen(false);  // Fermer le modal après soumission
    } else {
      console.log("Please enter a username");
    }
  };

  return (
    <div>
    <main>
      <h1 className="text-2xl text-center font-bold text-white p-4">
        FunKnowledge
      </h1>

      <PlayerList />

      {isModalOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-black">Enter your username</h2>
            <form onSubmit={handleUsernameSubmit}>
              <input
                type="text"
                className="border border-gray-300 rounded p-2 w-full mb-4 text-black"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white rounded p-2 w-full"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      )}

      {!isModalOpen && messages.map((message, index) => (
        <div
          className={`odd:bg-gray-900 even:bg-gray-800 text-white p-3 ${message.animated ? "message-animation" : ""} ${message.fadingOut ? "message-fadeout" : ""}`}
          key={message.id}
        >
          {message.text}
        </div>
      ))}
      </main>
      <footer className="absolute bottom-0 p-2 w-full">
        <div className="flex items-center w-full">
          <form className="flex-grow" onSubmit={(e) => e.preventDefault()}>
            <input
              maxLength={255}
              className="border border-gray-300 rounded p-2 text-black w-full"
              type="text"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const message = e.target.value;
                  socket.emit("message", message);
                  e.target.value = "";
                }
              }}
            />
          </form>
          <section className="ml-4">
            <div>
              <span className="font-bold">Server:</span> {server_message}
            </div>
            <div>
              <span className="font-bold">Username:</span> {username}
            </div>
          </section>
        </div>
      </footer>
    </div>
  );
}