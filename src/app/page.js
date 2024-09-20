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
import { QuizProvider } from "../context/QuizContext"; // Import du contexte
import Leaderboard from "@/components/Leaderboard";

//Github API
import { Octokit } from "@octokit/core";

//Icones
import { CodeSlash } from 'react-bootstrap-icons';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthentified, setIsAuthentified] = useState(false);
  const [username, setUsername] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [roomNumber, setRoomNumber] = useState("");
  const [repoInfo, setRepoInfo] = useState(null);

  useEffect(() => {
    const fetchRepoInfo = async () => {
      try {
        const octokit = new Octokit();
        const response = await octokit.request('GET /repos/{owner}/{repo}/releases', {
          owner: 'Cocolin67',
          repo: 'funknowledge',
        });
        setRepoInfo(response.data);
        console.log(response.data);
      } catch (error) {
        console.error('Error fetching repo info:', error);
      }
    };

    fetchRepoInfo();
  }, []); 

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
      toast.error("Déconnecté du serveur..."); // Test pour afficher une notification d'erreur
    }

    function onAuthentified() {
      toast.success("Authentification réussie !");
      setIsAuthentified(true);
    }

    function onServerMessageReceived(message) {
      console.log(message);
    }

    function onToastMessageReceived(message) {
      toast(message);
    }

    function onToastWarningReceived(message) {
      toast.warn(message);
    }

    function onToastErrorReceived(message) {
      toast.error(message);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("authentified", onAuthentified);
    socket.on("server_message", onServerMessageReceived);
    socket.on("toast_message", onToastMessageReceived);
    socket.on("toast_warning", onToastWarningReceived);
    socket.on("toast_error", onToastErrorReceived);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("authentified", onAuthentified);
      socket.off("server_message", onServerMessageReceived);
      socket.off("toast_message", onToastMessageReceived);
      socket.off("toast_warning", onToastWarningReceived);
      socket.off("toast_error", onToastErrorReceived);
    };
  }, []);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit("join", username);
      console.log("User connected:", username);
      setUsername(username);
      setIsModalOpen(false);
    }
  };

  const handlePrivateRoom = () => {
    if (username.trim()) {
      toast.warn("Le salon privé a été créé !");
      socket.emit("join_private_room", username);
      console.log("User connected:", username);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white">
      <ToastContainer 
        theme="dark"
      />
      <QuizProvider>
      <main className="flex flex-col h-full justify-evenly">
        <header>
          <h1 className="text-4xl text-center font-bold pt-4">
            FunKnowledge
          </h1>
          <p className="text-xl text-center font-light">Le plus rapide l&apos;emporte !</p>
        </header>

        {isModalOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="bg-white p-6 rounded shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-black">Entrez un nom d&apos;utilisateur</h2>
              <form onSubmit={handleUsernameSubmit}>
                <input
                  type="text"
                  className="border border-gray-300 rounded p-2 w-full mb-4 text-black"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nom d'utilisateur"
                />
                <button
                  type="submit"
                  className="bg-green-500 text-white rounded p-2 w-full"
                >
                  Rejoindre le salon publique
                </button>
              </form>
              <button
                disabled={true}
                onClick={handlePrivateRoom}
                className="bg-gray-500 text-white rounded p-2 py-1 my-2 w-full cursor-not-allowed"
              >
                Créer un salon privé
              </button>
            </div>
          </div>
        )}

        <section className="p-5 px-20 flex justify-center items-center h-[80%]">
          {!isModalOpen && (
            <>
            {!isAuthentified && (
            <>
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
              <div className="bg-white p-6 rounded shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-black">Identification en cours...</h2>
              </div>
            </div>
            </>
            )}
            {isAuthentified && (
            <>
              <div className="p-4 bg-gray-800 text-white rounded-l-lg shadow-lg h-full w-1/3">
                <div className="h-1/2 overflow-auto">
                  <PlayerList />
                </div>
                <div className="h-1/2 overflow-auto">
                  <Leaderboard />
                </div>
              </div>

              <div className="flex flex-col w-2/3 h-full bg-gray-400 rounded-r shadow-lg overflow-hidden">
                <QuizInterface />
                <Chat username={username}/>
              </div>
            </>
            )}
            </>
          )}
        </section>
        <footer className="text-center text-gray-500 p-4">
          <p className="inline-flex items-center space-x-2">
            <a
              target="_blank"
              className="hover:underline hover:text-white transition-colors"
              href="https://docs.google.com/forms/d/e/1FAIpQLSfuQYAV30ZQ9bYJu0oXgVj5vsthfGX0aNUgeMi-ZzPhfnXJcg/viewform?usp=sf_link"
            >
              Proposer des questions
            </a>
            <span>/</span>
            {repoInfo ? (
              <a
                href={repoInfo[0]?.html_url} // Assurez-vous que cette propriété contient l'URL de la release
                className="flex items-center space-x-1 hover:underline hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <CodeSlash />
                <span>{repoInfo[0]?.name}</span>
              </a>
            ) : (
              <span>Chargement...</span>
            )}
          </p>
          <p>Tout droits réservés - Colin AUBERT - FunKnowledge 2024</p>
        </footer>
      </main>
      </QuizProvider>
    </div>
  );
}