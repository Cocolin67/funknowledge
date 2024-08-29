"use client";

import { useEffect, useState } from "react";

// --- Fonctionnalités supplémentaires ---

// Système de notification
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Système de multijoueur
import { socket } from "../socket";

import PlayerList from "../components/PlayerList";
import Chat from "../components/Chat";
import QuizInterface from "@/components/QuizInterface";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [server_message, setServer_message] = useState("");
  const [username, setUsername] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      toast.success("Connected to the server");
    }

    function onDisconnect() {
      setIsConnected(false);
      toast.error("Disconnected from the server."); // Test pour afficher une notification d'erreur
    }

    function onServerMessageReceived(message) {
      toast(message);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("server_message", onServerMessageReceived);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("server_message", onServerMessageReceived);
    };
  }, []);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit("join", username);
      console.log("User connected:", username);
      setIsModalOpen(false);
    } else {
      console.log("Please enter a username");
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white">
      <ToastContainer 
        theme="dark"
      />
      <main className="flex flex-col h-full">
        <h1 className="text-4xl text-center font-bold p-4">
          FunKnowledge
        </h1>

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

        <section className="p-5 px-20 flex justify-center items-center h-[85%]">
          {!isModalOpen && (
            <>
              <div className="p-4 bg-gray-800 text-white rounded-l-lg shadow-lg h-full w-1/3">
                <PlayerList />
              </div>

              <div className="flex flex-col w-2/3 h-full bg-gray-400 rounded-r shadow-lg overflow-hidden">
                <QuizInterface />
                <Chat />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}