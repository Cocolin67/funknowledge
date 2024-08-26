import { useEffect, useState } from "react";
import { socket } from "../socket"; // Assurez-vous que le chemin vers le fichier socket est correct

export default function PlayerList() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Écoute l'événement pour recevoir la liste des joueurs
    socket.on("get_players", (playerList) => {
      setPlayers(playerList);
    });

    // Envoie une requête pour obtenir la liste des joueurs connectés
    socket.emit("players");

    return () => {
      // Nettoie les écouteurs lors de la déconnexion du composant
      socket.off("get_players");
    };
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Connected Players</h2>
      <ul>
        {players.map((player, index) => (
          <li key={index} className="py-1">
            {player.username}
          </li>
        ))}
      </ul>
    </div>
  );
}