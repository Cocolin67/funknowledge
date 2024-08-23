"use client";

import { useEffect, useState } from "react";
import { socket } from "../socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }

    function onMessageReceived(message) {
      const id = Date.now(); // Utiliser un identifiant unique pour chaque message
      setMessages((prevMessages) => [
        ...prevMessages,
        { id, text: message, animated: true }
      ]);

      // Supprime le message après 10 secondes
      setTimeout(() => {
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== id)
        );
      }, 10000);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message", onMessageReceived);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message", onMessageReceived);
    };
  }, []);

  return (
    <body>
      <div className="w-full h-screen">
        {messages.map((message, index) => (
          <div
            className={`odd:bg-gray-900 even:bg-gray-800 text-white p-3 ${message.animated ? "message-animation" : ""} ${message.fadingOut ? "message-fadeout" : ""}`}
            key={message.id}
          >
            {message.text}
          </div>
        ))}
      </div>
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
              <span className="font-bold">Connected:</span>{" "}
              {isConnected ? "Yes" : "No"}
            </div>
            <div>
              <span className="font-bold">Transport:</span> {transport}
            </div>
          </section>
        </div>
      </footer>
    </body>
  );
}