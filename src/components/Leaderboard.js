import { useEffect, useState } from "react";
import { socket } from "../socket";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    // Écoute l'événement "leaderboard" pour mettre à jour le classement
    const handleLeaderboard = (data) => {
      setLeaderboard(data);
    };

    socket.on("leaderboard", handleLeaderboard);

    // Nettoyer l'écouteur lorsque le composant est démonté
    return () => {
      socket.off("leaderboard", handleLeaderboard);
    };
  }, []);

return (
    <div>
        <h2 className="text-xl font-bold mb-4">Classement :</h2>
        <ul className="space-y-2">
            {leaderboard.length > 0 ? (
                leaderboard.map((player, index) => (
                    <li
                        key={index}
                        className="flex justify-between border-b border-gray-500 py-1"
                    >
                        <span>
                            <span className="font-bold">{index === 0 && <span>🥇</span> || index === 1 && <span>🥈</span> || index === 2 && <span>🥉</span> || index + 1}</span> {player.username}
                        </span>
                        <span className="font-semibold">{player.score} pts</span>
                    </li>
                ))
            ) : (
                // eslint-disable-next-line react/no-unescaped-entities
                <li>Aucun joueur dans le classement pour l'instant.</li>
            )}
        </ul>
    </div>
);
};

export default Leaderboard;