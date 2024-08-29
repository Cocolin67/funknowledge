import { useEffect, useRef, useState } from "react";
import { socket } from "../socket"; // Assurez-vous que le chemin vers le fichier socket est correct

export default function PlayerList() {
  const [players, setPlayers] = useState([]);
  const numPlayers = useRef(0);

  useEffect(() => {
    // Écoute l'événement pour recevoir la liste des joueurs
    socket.on("players", (playerList) => {
      setPlayers(playerList);
      numPlayers.current = playerList.length;
      console.log("Connected players:", playerList, "Number of players:", numPlayers.current);
    });

    // Envoie une requête pour obtenir la liste des joueurs connectés
    socket.emit("get_players");

    return () => {
      // Nettoie les écouteurs lors de la déconnexion du composant
      socket.off("get_players");
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Joueurs connectés : <span className="text-gray-400 font-normal">{numPlayers.current}</span></h2>
      <ul>
        {players.map((player, index) => (
          <li key={index} className="py-1">
            <p>{player}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}