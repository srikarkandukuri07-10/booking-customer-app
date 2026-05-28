"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface GamePlayer {
  playerName: string;
  tableName: string;
  socketId: string;
}

interface FallArenaProps {
  customerName: string;
  tableName: string;
  realPlayers: GamePlayer[];
  socket: any;
  gameId: string;
  onScoreUpdate: (score: number) => void;
  onGameAction: (action: any) => void;
  gameOver: boolean;
  timeLeft: number;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  name: string;
  color: string;
  isBot: boolean;
  alive: boolean;
  socketId?: string;
}

interface Platform {
  y: number;
  gapX: number;
  gapWidth: number;
  speed: number;
}

const COLORS = ["#06b6d4", "#f43f5e", "#a855f7", "#22c55e", "#f97316"];
const BOT_NAMES = ["Chef Marco", "Sous Mike", "Baker Lin"];

export default function FallArena({
  customerName,
  realPlayers,
  socket,
  gameId,
  onScoreUpdate,
  onGameAction,
  gameOver,
}: FallArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    player: null as Player | null,
    bots: [] as Player[],
    remotePlayers: [] as Player[],
    platforms: [] as Platform[],
    score: 0,
    scrollSpeed: 0.8,
    frameCount: 0,
    touchX: null as number | null,
    initialized: false,
  });

  const [playerNames, setPlayerNames] = useState<string[]>([]);

  // Initialize game
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    const gs = gameStateRef.current;

    // Create player
    gs.player = {
      x: W / 2 - 12,
      y: 60,
      vx: 0,
      vy: 0,
      width: 24,
      height: 24,
      name: customerName,
      color: COLORS[0],
      isBot: false,
      alive: true,
    };

    // Create remote players from socket data
    gs.remotePlayers = realPlayers.map((rp, i) => ({
      x: W * (0.3 + i * 0.2),
      y: 60,
      vx: 0,
      vy: 0,
      width: 24,
      height: 24,
      name: rp.playerName,
      color: COLORS[(i + 1) % COLORS.length],
      isBot: false,
      alive: true,
      socketId: rp.socketId,
    }));

    // Fill remaining slots with bots (up to 4 players total)
    const totalNeeded = Math.max(0, 3 - realPlayers.length);
    gs.bots = [];
    for (let i = 0; i < totalNeeded; i++) {
      gs.bots.push({
        x: W * (0.2 + i * 0.3),
        y: 60,
        vx: 0,
        vy: 0,
        width: 24,
        height: 24,
        name: BOT_NAMES[i] || `Bot ${i + 1}`,
        color: COLORS[(realPlayers.length + 1 + i) % COLORS.length],
        isBot: true,
        alive: true,
      });
    }

    // Create initial platforms
    gs.platforms = [];
    for (let i = 0; i < 8; i++) {
      gs.platforms.push({
        y: H - 80 - i * 80,
        gapX: Math.random() * (W - 80) + 20,
        gapWidth: 60 + Math.random() * 30,
        speed: 0,
      });
    }

    gs.score = 0;
    gs.scrollSpeed = 0.8;
    gs.frameCount = 0;
    gs.initialized = true;

    setPlayerNames([
      customerName,
      ...realPlayers.map((p) => p.playerName),
      ...gs.bots.map((b) => b.name),
    ]);
  }, [customerName, realPlayers]);

  // Listen for remote player actions
  useEffect(() => {
    if (!socket) return;

    const handleAction = (data: { action: any }) => {
      const gs = gameStateRef.current;
      const action = data.action;
      if (action.type === "position" && action.gameId === gameId) {
        const rp = gs.remotePlayers.find(
          (p) => p.socketId === action.socketId
        );
        if (rp) {
          rp.x = action.x;
          rp.y = action.y;
          rp.alive = action.alive;
        }
      }
    };

    socket.on("game-action-broadcast", handleAction);
    return () => socket.off("game-action-broadcast", handleAction);
  }, [socket, gameId]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas
    const resize = () => {
      canvas.width = Math.min(window.innerWidth, 448);
      canvas.height = window.innerHeight - 56;
    };
    resize();
    window.addEventListener("resize", resize);

    initGame();

    let animId: number;

    const loop = () => {
      if (gameOver) return;
      const gs = gameStateRef.current;
      if (!gs.initialized || !gs.player) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;

      gs.frameCount++;

      // Increase difficulty over time
      if (gs.frameCount % 300 === 0) {
        gs.scrollSpeed = Math.min(gs.scrollSpeed + 0.15, 3);
      }

      // Move platforms upward
      gs.platforms.forEach((p) => {
        p.y -= gs.scrollSpeed;
      });

      // Remove off-screen platforms and add new ones
      gs.platforms = gs.platforms.filter((p) => p.y > -20);
      while (gs.platforms.length < 8) {
        const lastY =
          gs.platforms.length > 0
            ? Math.max(...gs.platforms.map((p) => p.y))
            : H;
        gs.platforms.push({
          y: lastY + 70 + Math.random() * 30,
          gapX: Math.random() * (W - 80) + 20,
          gapWidth: 55 + Math.random() * 35,
          speed: 0,
        });
      }

      // Update player physics
      const player = gs.player;
      if (player.alive) {
        // Touch/mouse control
        if (gs.touchX !== null) {
          const targetX = gs.touchX - player.width / 2;
          player.vx = (targetX - player.x) * 0.15;
        } else {
          player.vx *= 0.92;
        }

        player.vy += 0.35; // gravity
        player.x += player.vx;
        player.y += player.vy;

        // Wall boundaries
        player.x = Math.max(0, Math.min(W - player.width, player.x));

        // Platform collision
        gs.platforms.forEach((plat) => {
          const onPlatform =
            player.y + player.height >= plat.y &&
            player.y + player.height <= plat.y + 12 &&
            player.vy >= 0;
          const inGap =
            player.x + player.width > plat.gapX &&
            player.x < plat.gapX + plat.gapWidth;

          if (onPlatform && !inGap) {
            player.y = plat.y - player.height;
            player.vy = 0;
          }
        });

        // Crushed at top
        if (player.y < -10) {
          player.alive = false;
        }

        // Fell to bottom — score bonus but reset position
        if (player.y > H + 20) {
          player.y = 60;
          player.vy = 0;
          gs.score += 5;
        }

        // Score increases over time
        if (gs.frameCount % 60 === 0) {
          gs.score++;
          onScoreUpdate(gs.score);
        }

        // Broadcast position
        if (gs.frameCount % 3 === 0) {
          onGameAction({
            type: "position",
            gameId,
            socketId: socket?.id,
            x: player.x,
            y: player.y,
            alive: player.alive,
          });
        }
      }

      // Update bots with basic AI
      gs.bots.forEach((bot) => {
        if (!bot.alive) return;

        bot.vy += 0.35;

        // Find nearest platform gap and move toward it
        const nearestPlat = gs.platforms.find(
          (p) => p.y > bot.y && p.y < bot.y + 100
        );
        if (nearestPlat) {
          const gapCenter = nearestPlat.gapX + nearestPlat.gapWidth / 2;
          bot.vx += (gapCenter - bot.x - bot.width / 2) * 0.02;
        }

        bot.vx *= 0.95;
        bot.x += bot.vx;
        bot.y += bot.vy;
        bot.x = Math.max(0, Math.min(W - bot.width, bot.x));

        // Platform collision for bots
        gs.platforms.forEach((plat) => {
          const onPlatform =
            bot.y + bot.height >= plat.y &&
            bot.y + bot.height <= plat.y + 12 &&
            bot.vy >= 0;
          const inGap =
            bot.x + bot.width > plat.gapX &&
            bot.x < plat.gapX + plat.gapWidth;

          if (onPlatform && !inGap) {
            bot.y = plat.y - bot.height;
            bot.vy = 0;
          }
        });

        if (bot.y < -10) bot.alive = false;
        if (bot.y > H + 20) {
          bot.y = 60;
          bot.vy = 0;
        }
      });

      // --- RENDER ---
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      // Draw grid background
      ctx.strokeStyle = "rgba(139, 92, 246, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Draw platforms
      gs.platforms.forEach((plat) => {
        ctx.fillStyle = "rgba(139, 92, 246, 0.25)";
        // Left section
        ctx.fillRect(0, plat.y, plat.gapX, 8);
        // Right section
        ctx.fillRect(
          plat.gapX + plat.gapWidth,
          plat.y,
          W - plat.gapX - plat.gapWidth,
          8
        );
        // Glow edges
        ctx.fillStyle = "rgba(139, 92, 246, 0.6)";
        ctx.fillRect(plat.gapX - 3, plat.y, 3, 8);
        ctx.fillRect(plat.gapX + plat.gapWidth, plat.y, 3, 8);
      });

      // Draw all entities
      const allEntities = [
        player,
        ...gs.remotePlayers.filter((p) => p.alive),
        ...gs.bots.filter((b) => b.alive),
      ];

      allEntities.forEach((entity) => {
        if (!entity.alive) return;
        // Body glow
        ctx.shadowColor = entity.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = entity.color;
        ctx.beginPath();
        ctx.roundRect(entity.x, entity.y, entity.width, entity.height, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Name label
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          entity.name.slice(0, 10),
          entity.x + entity.width / 2,
          entity.y - 5
        );
      });

      // Score display
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${gs.score}`, 12, 28);

      // Player list at top-right
      ctx.textAlign = "right";
      ctx.font = "bold 9px monospace";
      allEntities.forEach((entity, i) => {
        ctx.fillStyle = entity.alive
          ? entity.color
          : "rgba(255,255,255,0.2)";
        ctx.fillText(
          `${entity.alive ? "●" : "✕"} ${entity.name.slice(0, 8)}`,
          W - 10,
          20 + i * 14
        );
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, initGame]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.touchX = e.touches[0].clientX - rect.left;
    };

    const handleTouchEnd = () => {
      gameStateRef.current.touchX = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.touchX = e.clientX - rect.left;
    };

    const handleMouseLeave = () => {
      gameStateRef.current.touchX = null;
    };

    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
      <canvas
        ref={canvasRef}
        className="w-full max-w-md touch-none"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
