"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Zap, Users, UtensilsCrossed } from "lucide-react";
import { useXPStore } from "./XPStore";
import FallArena from "./fall-arena/FallArena";
import MiniBattle from "./mini-battle/MiniBattle";
import LevelEscape from "./level-escape/LevelEscape";
import TeamCarrom from "./team-carrom/TeamCarrom";

interface GameWrapperProps {
  gameId: string;
  gameName: string;
  duration: number;
  xpReward: number;
  customerName: string;
  tableName: string;
  onExit: () => void;
  latestOrder: any;
  currentTokenRunning: number;
}

interface GamePlayer {
  playerName: string;
  tableName: string;
  socketId: string;
}

export default function GameWrapper({
  gameId,
  gameName,
  duration,
  xpReward,
  customerName,
  tableName,
  onExit,
  latestOrder,
  currentTokenRunning,
}: GameWrapperProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showFoodReady, setShowFoodReady] = useState(false);
  const [realPlayers, setRealPlayers] = useState<GamePlayer[]>([]);
  const socketRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameKeyRef = useRef(Date.now()); // Unique key to force game remount on re-entry

  const { addXP, recordGameScore } = useXPStore();

  // Connect to game socket room
  useEffect(() => {
    let socket: any = null;

    const setupSocket = async () => {
      try {
        const socketModule = await import("@/lib/socket");
        socket = socketModule.socket;
        socketModule.connectSocket();
        socketRef.current = socket;

        // Join the game room
        socket.emit("join-game", {
          gameId,
          playerName: customerName,
          tableName,
        });

        // Listen for player updates
        const handlePlayersUpdated = (data: {
          gameId: string;
          players: GamePlayer[];
        }) => {
          if (data.gameId === gameId) {
            // Filter out self
            setRealPlayers(
              data.players.filter(
                (p: GamePlayer) => p.socketId !== socket.id
              )
            );
          }
        };

        socket.on("game-players-updated", handlePlayersUpdated);

        return () => {
          socket.off("game-players-updated", handlePlayersUpdated);
        };
      } catch (err) {
        console.warn("Socket connection for game failed:", err);
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.emit("leave-game", { gameId });
        socket.off("game-players-updated");
        socket.off("game-action-broadcast");
        socket.off("game-score-broadcast");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, customerName, tableName]);

  // Game timer
  useEffect(() => {
    if (gameOver) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameOver(true);
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameOver]);

  // Monitor food ready status
  useEffect(() => {
    if (latestOrder?.status === "READY") {
      setShowFoodReady(true);
      const timeout = setTimeout(() => setShowFoodReady(false), 8000);
      return () => clearTimeout(timeout);
    }
  }, [latestOrder?.status]);

  // Handle game over — award XP
  useEffect(() => {
    if (gameOver && score > 0) {
      const bonusXP = score > 100 ? 25 : 0;
      addXP(xpReward + bonusXP);
      recordGameScore(customerName, gameId, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const handleScoreUpdate = useCallback(
    (newScore: number) => {
      setScore(newScore);
      // Broadcast score to other players
      if (socketRef.current) {
        socketRef.current.emit("game-score-update", {
          gameId,
          playerName: customerName,
          score: newScore,
        });
      }
    },
    [gameId, customerName]
  );

  const handleGameAction = useCallback(
    (action: any) => {
      if (socketRef.current) {
        socketRef.current.emit("game-action", { gameId, action });
      }
    },
    [gameId]
  );

  const handleExit = useCallback(() => {
    if (!gameOver && score > 0) {
      // Award partial XP for early exit
      addXP(Math.floor(xpReward * 0.3));
      recordGameScore(customerName, gameId, score);
    }
    onExit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, score, onExit, xpReward, customerName, gameId]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Render the specific game component
  const renderGame = () => {
    const commonProps = {
      key: gameKeyRef.current, // Forces full remount/reset on re-entry
      customerName,
      tableName,
      realPlayers,
      socket: socketRef.current,
      gameId,
      onScoreUpdate: handleScoreUpdate,
      onGameAction: handleGameAction,
      gameOver,
      timeLeft,
    };

    switch (gameId) {
      case "fall-arena":
        return <FallArena {...commonProps} />;
      case "mini-battle":
        return <MiniBattle {...commonProps} />;
      case "level-escape":
        return <LevelEscape {...commonProps} />;
      case "team-carrom":
        return <TeamCarrom {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col relative overflow-hidden">
      {/* Game HUD Header */}
      <header className="sticky top-0 z-30 w-full bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-violet-500/10 h-14 flex items-center justify-between px-4">
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Exit
          </span>
        </button>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
              timeLeft <= 30
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "bg-white/5 text-neutral-300"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono font-bold">
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 bg-violet-500/15 px-2.5 py-1 rounded-full">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="text-xs font-mono font-extrabold text-violet-300">
              {score}
            </span>
          </div>

          {/* Real players count */}
          <div className="flex items-center gap-1 bg-emerald-500/15 px-2 py-1 rounded-full">
            <Users className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">
              {realPlayers.length + 1}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">
          {gameName}
        </span>
      </header>

      {/* Game Canvas Area */}
      <main className="flex-1 relative">{renderGame()}</main>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-[#12121a] border border-violet-500/20 rounded-3xl p-8 max-w-sm w-full mx-4 text-center flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-extrabold text-white">
                Game Over!
              </h2>

              <div className="bg-white/5 rounded-2xl p-4 w-full">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-400">Final Score</span>
                  <span className="text-violet-400 font-extrabold font-mono">
                    {score}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">XP Earned</span>
                  <span className="text-emerald-400 font-extrabold font-mono">
                    +{xpReward + (score > 100 ? 25 : 0)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleExit}
                className="w-full h-12 bg-gradient-to-r from-violet-500 to-purple-700 rounded-2xl font-extrabold text-sm uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
              >
                Back to Games
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Food Ready Notification (non-intrusive popup) */}
      <AnimatePresence>
        {showFoodReady && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="absolute top-16 left-4 right-4 z-50 bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3"
          >
            <UtensilsCrossed className="w-6 h-6 text-emerald-400 animate-bounce" />
            <div>
              <p className="text-sm font-bold text-emerald-300">
                🍽️ Your food is ready!
              </p>
              <p className="text-[10px] text-emerald-400/70">
                Collect it when you&apos;re done playing.
              </p>
            </div>
            <button
              onClick={() => setShowFoodReady(false)}
              className="text-emerald-400/50 hover:text-emerald-400 ml-auto text-xs cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
