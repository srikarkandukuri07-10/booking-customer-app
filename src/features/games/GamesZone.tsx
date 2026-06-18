"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Gamepad2,
  Trophy,
  Zap,
  Lock,
  Swords,
  CircleDot,
  Footprints,
  Crown,
  Star,
} from "lucide-react";
import { useXPStore } from "./XPStore";
import GameWrapper from "./GameWrapper";
import Leaderboard from "./Leaderboard";

interface GamesZoneProps {
  onClose: () => void;
  customerName: string;
  tableName: string;
  totalSpent: number;
  latestOrder: any;
}

const GAMES = [
  {
    id: "fall-arena",
    name: "Fall Arena",
    description: "Survive the rising platforms! Last player standing wins.",
    icon: Footprints,
    color: "from-cyan-500 to-blue-600",
    borderColor: "border-cyan-500/30",
    bgGlow: "bg-cyan-500/10",
    textColor: "text-cyan-400",
    xpReward: 30,
    duration: 180,
    premium: false,
    players: "2-4 Players",
  },
  {
    id: "mini-battle",
    name: "Mini Battle",
    description: "Top-down arena shooter. Eliminate all opponents!",
    icon: Swords,
    color: "from-red-500 to-orange-600",
    borderColor: "border-red-500/30",
    bgGlow: "bg-red-500/10",
    textColor: "text-red-400",
    xpReward: 40,
    duration: 180,
    premium: false,
    players: "2-4 Players",
  },
  {
    id: "level-escape",
    name: "Level Escape",
    description: "Navigate trap-filled rooms. How far can you get?",
    icon: CircleDot,
    color: "from-amber-500 to-yellow-600",
    borderColor: "border-amber-500/30",
    bgGlow: "bg-amber-500/10",
    textColor: "text-amber-400",
    xpReward: 35,
    duration: 240,
    premium: false,
    players: "Single Player",
  },
  {
    id: "team-carrom",
    name: "Team Carrom",
    description: "Classic carrom with a digital twist. Pocket all pieces!",
    icon: Crown,
    color: "from-violet-500 to-purple-700",
    borderColor: "border-violet-500/30",
    bgGlow: "bg-violet-500/10",
    textColor: "text-violet-400",
    xpReward: 50,
    duration: 360,
    premium: true,
    premiumThreshold: 3000,
    players: "2-4 Players",
  },
];

export default function GamesZone({
  onClose,
  customerName,
  tableName,
  totalSpent,
  latestOrder,
}: GamesZoneProps) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { totalXP, level, gamesPlayed } = useXPStore();

  const xpProgress = totalXP % 200;

  const handleGameSelect = useCallback((gameId: string) => {
    setActiveGame(gameId);
  }, []);

  const handleGameExit = useCallback(() => {
    // Full reset — switching games clears previous game state
    setActiveGame(null);
  }, []);

  // If a game is active, render the game wrapper
  if (activeGame) {
    const gameConfig = GAMES.find((g) => g.id === activeGame)!;
    return (
      <GameWrapper
        gameId={activeGame}
        gameName={gameConfig.name}
        duration={gameConfig.duration}
        xpReward={gameConfig.xpReward}
        customerName={customerName}
        tableName={tableName}
        onExit={handleGameExit}
        latestOrder={latestOrder}

      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08)_0%,transparent_60%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-violet-500/10 h-16 flex items-center justify-between px-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Menu
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/20">
            <Gamepad2 className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-violet-300">
            Games Zone
          </span>
        </div>

        <button
          onClick={() => setShowLeaderboard(true)}
          className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full cursor-pointer hover:bg-yellow-500/20 transition-colors"
        >
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
            Ranks
          </span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
        {/* XP Progress Card */}
        <div className="bg-[#12121a]/90 border border-violet-500/15 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-violet-500/[0.06] rounded-full blur-[30px] pointer-events-none" />

          <div className="flex items-center justify-between relative z-10 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <span className="text-lg font-black text-white">{level}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-neutral-400">
                  Level {level}
                </span>
                <span className="text-xs text-neutral-300">
                  {customerName} • {gamesPlayed} games played
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-violet-500/10 px-2.5 py-1 rounded-full">
              <Zap className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] font-extrabold text-violet-400 font-mono">
                {totalXP} XP
              </span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(xpProgress / 200) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-neutral-500 font-mono">
            <span>{xpProgress} / 200 XP</span>
            <span>Next: Level {level + 1}</span>
          </div>
        </div>

        {/* Food order status mini-banner */}
        {latestOrder && (
          <div
            className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs ${
              latestOrder.status === "READY"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
            </span>
            <span className="font-bold">
              {latestOrder.status === "READY"
                ? "🍽️ Your food is ready! Collect it."
                : latestOrder.status === "PREPARING"
                ? "🍳 Food is being prepared..."
                : "⏳ Waiting for kitchen..."}
            </span>
          </div>
        )}

        {/* Games Grid */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-neutral-300 flex items-center gap-2">
            <Star className="w-4 h-4 text-violet-400" />
            Choose Your Game
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {GAMES.map((game) => {
              const isLocked = game.premium && totalSpent < (game.premiumThreshold || 0);
              const Icon = game.icon;

              return (
                <motion.button
                  key={game.id}
                  whileHover={!isLocked ? { scale: 1.01 } : {}}
                  whileTap={!isLocked ? { scale: 0.99 } : {}}
                  onClick={() => !isLocked && handleGameSelect(game.id)}
                  disabled={isLocked}
                  className={`relative w-full bg-[#12121a]/90 border rounded-3xl p-5 text-left flex items-start gap-4 transition-all duration-300 cursor-pointer group ${
                    isLocked
                      ? "border-white/5 opacity-60 cursor-not-allowed"
                      : `${game.borderColor} hover:border-opacity-60 hover:shadow-lg`
                  }`}
                >
                  {/* Game icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg flex-shrink-0 ${
                      isLocked ? "grayscale" : ""
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-6 h-6 text-white/80" />
                    ) : (
                      <Icon className="w-7 h-7 text-white stroke-[2]" />
                    )}
                  </div>

                  {/* Game info */}
                  <div className="flex-grow flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-neutral-100 group-hover:text-white transition-colors">
                        {game.name}
                      </h3>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isLocked
                            ? "bg-neutral-800 text-neutral-500"
                            : `${game.bgGlow} ${game.textColor}`
                        }`}
                      >
                        +{game.xpReward} XP
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {game.description}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                        {game.players}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-600">
                        {Math.floor(game.duration / 60)}min
                      </span>
                      {isLocked && (
                        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Order ₹{(game.premiumThreshold || 0).toLocaleString()}+ to unlock
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Leaderboard overlay */}
      <AnimatePresence>
        {showLeaderboard && (
          <Leaderboard onClose={() => setShowLeaderboard(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
