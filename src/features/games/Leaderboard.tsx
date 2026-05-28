"use client";

import { motion } from "framer-motion";
import { X, Trophy, Medal } from "lucide-react";
import { useXPStore } from "./XPStore";

interface LeaderboardProps {
  onClose: () => void;
}

const RANK_STYLES = [
  { bg: "bg-yellow-500/15", border: "border-yellow-500/30", text: "text-yellow-400", badge: "🥇" },
  { bg: "bg-neutral-400/10", border: "border-neutral-400/20", text: "text-neutral-300", badge: "🥈" },
  { bg: "bg-amber-700/10", border: "border-amber-700/20", text: "text-amber-600", badge: "🥉" },
];

const GAME_LABELS: Record<string, string> = {
  "fall-arena": "Fall Arena",
  "mini-battle": "Mini Battle",
  "level-escape": "Level Escape",
  "team-carrom": "Team Carrom",
};

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const { getDailyLeaderboard } = useXPStore();
  const scores = getDailyLeaderboard();

  // Group scores by game
  const gameGroups: Record<string, typeof scores> = {};
  scores.forEach((s) => {
    if (!gameGroups[s.game]) gameGroups[s.game] = [];
    gameGroups[s.game].push(s);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="w-full max-w-md bg-[#0f0f18] rounded-t-[32px] border-t border-violet-500/20 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Handle */}
        <div className="w-12 h-1 bg-neutral-700/50 rounded-full mx-auto my-3" />

        {/* Header */}
        <div className="px-5 pb-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Daily Leaderboard</h3>
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                Today&apos;s Top Scores
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scores List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6 no-scrollbar">
          {Object.keys(gameGroups).length === 0 ? (
            <div className="flex flex-col items-center text-center py-12 text-neutral-500">
              <Medal className="w-12 h-12 mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold">No scores yet today!</p>
              <p className="text-xs text-neutral-600 mt-1">Play some games to get on the board.</p>
            </div>
          ) : (
            Object.entries(gameGroups).map(([gameId, gameScores]) => (
              <div key={gameId} className="flex flex-col gap-2.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400">
                  {GAME_LABELS[gameId] || gameId}
                </h4>

                {gameScores.slice(0, 10).map((entry, idx) => {
                  const rankStyle = idx < 3 ? RANK_STYLES[idx] : null;

                  return (
                    <div
                      key={`${entry.playerName}-${entry.timestamp}`}
                      className={`flex items-center justify-between p-3 rounded-2xl border ${
                        rankStyle
                          ? `${rankStyle.bg} ${rankStyle.border}`
                          : "bg-white/[0.02] border-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-8 text-center">
                          {rankStyle ? rankStyle.badge : `#${idx + 1}`}
                        </span>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${rankStyle ? rankStyle.text : "text-neutral-300"}`}>
                            {entry.playerName}
                          </span>
                          <span className="text-[9px] text-neutral-500 font-mono">
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <span className={`text-sm font-extrabold font-mono ${rankStyle ? rankStyle.text : "text-neutral-400"}`}>
                        {entry.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
