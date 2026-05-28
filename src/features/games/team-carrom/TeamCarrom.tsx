"use client";

import { useRef, useEffect, useCallback } from "react";

interface GamePlayer {
  playerName: string;
  tableName: string;
  socketId: string;
}

interface TeamCarromProps {
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

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: "white" | "black" | "queen" | "striker";
  pocketed: boolean;
}

interface CarromState {
  pieces: Piece[];
  striker: Piece;
  currentPlayer: number;
  players: { name: string; score: number; color: string; isBot: boolean; socketId?: string }[];
  phase: "aim" | "power" | "moving" | "waiting";
  aimAngle: number;
  power: number;
  powerDir: number;
  boardSize: number;
  boardX: number;
  boardY: number;
  pocketRadius: number;
  score: number;
  turn: number;
  message: string;
  messageTimer: number;
  frameCount: number;
  initialized: boolean;
}

const POCKET_POSITIONS = (bx: number, by: number, bs: number) => [
  { x: bx, y: by },
  { x: bx + bs, y: by },
  { x: bx, y: by + bs },
  { x: bx + bs, y: by + bs },
];

const BOT_NAMES = ["Chef Paul", "Baker Sam", "Sous Ana"];
const PLAYER_COLORS = ["#06b6d4", "#f43f5e", "#a855f7", "#22c55e"];

export default function TeamCarrom({
  customerName,
  realPlayers,
  socket,
  gameId,
  onScoreUpdate,
  onGameAction,
  gameOver,
}: TeamCarromProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CarromState>({
    pieces: [],
    striker: null as any,
    currentPlayer: 0,
    players: [],
    phase: "aim",
    aimAngle: -Math.PI / 2,
    power: 0,
    powerDir: 1,
    boardSize: 0,
    boardX: 0,
    boardY: 0,
    pocketRadius: 14,
    score: 0,
    turn: 0,
    message: "",
    messageTimer: 0,
    frameCount: 0,
    initialized: false,
  });

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const gs = stateRef.current;

    const boardSize = Math.min(W - 40, H - 180);
    const boardX = (W - boardSize) / 2;
    const boardY = 30;
    const center = { x: boardX + boardSize / 2, y: boardY + boardSize / 2 };

    gs.boardSize = boardSize;
    gs.boardX = boardX;
    gs.boardY = boardY;

    // Create pieces in circular arrangement
    gs.pieces = [];
    const pieceRadius = 8;
    const rings = [
      { count: 1, radius: 0, type: "queen" as const },
      { count: 6, radius: 22, type: "white" as const },
      { count: 6, radius: 22, type: "black" as const },
    ];

    // Queen at center
    gs.pieces.push({
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      radius: pieceRadius + 1,
      color: "#ef4444",
      type: "queen",
      pocketed: false,
    });

    // Alternating white and black in a circle
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r = i < 6 ? 22 : 38;
      gs.pieces.push({
        x: center.x + Math.cos(angle) * r,
        y: center.y + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: pieceRadius,
        color: i % 2 === 0 ? "#f5f5f4" : "#1c1917",
        type: i % 2 === 0 ? "white" : "black",
        pocketed: false,
      });
    }

    // Striker
    gs.striker = {
      x: center.x,
      y: boardY + boardSize - 45,
      vx: 0,
      vy: 0,
      radius: 10,
      color: PLAYER_COLORS[0],
      type: "striker",
      pocketed: false,
    };

    // Players
    gs.players = [
      { name: customerName, score: 0, color: PLAYER_COLORS[0], isBot: false },
    ];

    realPlayers.forEach((rp, i) => {
      gs.players.push({
        name: rp.playerName,
        score: 0,
        color: PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length],
        isBot: false,
        socketId: rp.socketId,
      });
    });

    const botsNeeded = Math.max(0, 3 - realPlayers.length);
    for (let i = 0; i < botsNeeded; i++) {
      gs.players.push({
        name: BOT_NAMES[i],
        score: 0,
        color: PLAYER_COLORS[(realPlayers.length + 1 + i) % PLAYER_COLORS.length],
        isBot: true,
      });
    }

    gs.currentPlayer = 0;
    gs.phase = "aim";
    gs.aimAngle = -Math.PI / 2;
    gs.power = 0;
    gs.powerDir = 1;
    gs.score = 0;
    gs.turn = 0;
    gs.message = `${customerName}'s turn!`;
    gs.messageTimer = 90;
    gs.frameCount = 0;
    gs.initialized = true;
  }, [customerName, realPlayers]);

  // Remote actions
  useEffect(() => {
    if (!socket) return;
    const handleAction = (data: { action: any }) => {
      const a = data.action;
      if (a.type === "carrom-strike" && a.gameId === gameId) {
        const gs = stateRef.current;
        gs.striker.x = a.sx;
        gs.striker.y = a.sy;
        gs.striker.vx = a.svx;
        gs.striker.vy = a.svy;
        gs.phase = "moving";
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
      const gs = stateRef.current;
      if (!gs.initialized) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      gs.frameCount++;

      const friction = 0.985;
      const pockets = POCKET_POSITIONS(gs.boardX, gs.boardY, gs.boardSize);

      // Physics for all pieces
      if (gs.phase === "moving") {
        let anyMoving = false;

        // Update striker
        gs.striker.x += gs.striker.vx;
        gs.striker.y += gs.striker.vy;
        gs.striker.vx *= friction;
        gs.striker.vy *= friction;

        // Wall bounce for striker
        if (gs.striker.x - gs.striker.radius < gs.boardX) {
          gs.striker.x = gs.boardX + gs.striker.radius;
          gs.striker.vx *= -0.7;
        }
        if (gs.striker.x + gs.striker.radius > gs.boardX + gs.boardSize) {
          gs.striker.x = gs.boardX + gs.boardSize - gs.striker.radius;
          gs.striker.vx *= -0.7;
        }
        if (gs.striker.y - gs.striker.radius < gs.boardY) {
          gs.striker.y = gs.boardY + gs.striker.radius;
          gs.striker.vy *= -0.7;
        }
        if (gs.striker.y + gs.striker.radius > gs.boardY + gs.boardSize) {
          gs.striker.y = gs.boardY + gs.boardSize - gs.striker.radius;
          gs.striker.vy *= -0.7;
        }

        if (Math.abs(gs.striker.vx) > 0.1 || Math.abs(gs.striker.vy) > 0.1) anyMoving = true;

        // Check striker pocket
        pockets.forEach((p) => {
          if (Math.hypot(gs.striker.x - p.x, gs.striker.y - p.y) < gs.pocketRadius) {
            gs.striker.pocketed = true;
            gs.striker.vx = 0;
            gs.striker.vy = 0;
            // Foul
            gs.players[gs.currentPlayer].score -= 10;
            gs.score -= gs.currentPlayer === 0 ? 10 : 0;
            gs.message = "Foul! Striker pocketed.";
            gs.messageTimer = 60;
          }
        });

        // Update pieces
        gs.pieces.forEach((piece) => {
          if (piece.pocketed) return;

          piece.x += piece.vx;
          piece.y += piece.vy;
          piece.vx *= friction;
          piece.vy *= friction;

          // Wall bounce
          if (piece.x - piece.radius < gs.boardX) {
            piece.x = gs.boardX + piece.radius;
            piece.vx *= -0.7;
          }
          if (piece.x + piece.radius > gs.boardX + gs.boardSize) {
            piece.x = gs.boardX + gs.boardSize - piece.radius;
            piece.vx *= -0.7;
          }
          if (piece.y - piece.radius < gs.boardY) {
            piece.y = gs.boardY + piece.radius;
            piece.vy *= -0.7;
          }
          if (piece.y + piece.radius > gs.boardY + gs.boardSize) {
            piece.y = gs.boardY + gs.boardSize - piece.radius;
            piece.vy *= -0.7;
          }

          // Check pocket
          pockets.forEach((p) => {
            if (Math.hypot(piece.x - p.x, piece.y - p.y) < gs.pocketRadius) {
              piece.pocketed = true;
              piece.vx = 0;
              piece.vy = 0;
              const pts = piece.type === "queen" ? 50 : 10;
              gs.players[gs.currentPlayer].score += pts;
              if (gs.currentPlayer === 0) {
                gs.score += pts;
                onScoreUpdate(gs.score);
              }
              gs.message = `${piece.type === "queen" ? "QUEEN" : "Piece"} pocketed! +${pts}`;
              gs.messageTimer = 60;
            }
          });

          if (Math.abs(piece.vx) > 0.1 || Math.abs(piece.vy) > 0.1) anyMoving = true;

          // Collision with striker
          const dx = piece.x - gs.striker.x;
          const dy = piece.y - gs.striker.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = piece.radius + gs.striker.radius;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            piece.x += nx * overlap * 0.5;
            piece.y += ny * overlap * 0.5;
            gs.striker.x -= nx * overlap * 0.5;
            gs.striker.y -= ny * overlap * 0.5;

            const dvx = gs.striker.vx - piece.vx;
            const dvy = gs.striker.vy - piece.vy;
            const dvn = dvx * nx + dvy * ny;
            piece.vx += nx * dvn * 0.9;
            piece.vy += ny * dvn * 0.9;
            gs.striker.vx -= nx * dvn * 0.9;
            gs.striker.vy -= ny * dvn * 0.9;
          }
        });

        // Piece-to-piece collision
        for (let i = 0; i < gs.pieces.length; i++) {
          for (let j = i + 1; j < gs.pieces.length; j++) {
            const a = gs.pieces[i];
            const b = gs.pieces[j];
            if (a.pocketed || b.pocketed) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = a.radius + b.radius;
            if (dist < minD && dist > 0) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = minD - dist;
              a.x -= nx * overlap * 0.5;
              a.y -= ny * overlap * 0.5;
              b.x += nx * overlap * 0.5;
              b.y += ny * overlap * 0.5;
              const dvx = a.vx - b.vx;
              const dvy = a.vy - b.vy;
              const dvn = dvx * nx + dvy * ny;
              a.vx -= nx * dvn * 0.5;
              a.vy -= ny * dvn * 0.5;
              b.vx += nx * dvn * 0.5;
              b.vy += ny * dvn * 0.5;
            }
          }
        }

        // All stopped
        if (!anyMoving) {
          // Reset striker
          const center = gs.boardX + gs.boardSize / 2;
          gs.striker.pocketed = false;

          // Next player's turn
          gs.currentPlayer = (gs.currentPlayer + 1) % gs.players.length;
          gs.turn++;

          // Position striker for current player side
          const sides = [
            { x: center, y: gs.boardY + gs.boardSize - 45 },
            { x: center, y: gs.boardY + 45 },
            { x: gs.boardX + 45, y: gs.boardY + gs.boardSize / 2 },
            { x: gs.boardX + gs.boardSize - 45, y: gs.boardY + gs.boardSize / 2 },
          ];
          const side = sides[gs.currentPlayer % sides.length];
          gs.striker.x = side.x;
          gs.striker.y = side.y;
          gs.striker.color = gs.players[gs.currentPlayer].color;

          gs.aimAngle = -Math.PI / 2;
          gs.power = 0;

          gs.message = `${gs.players[gs.currentPlayer].name}'s turn!`;
          gs.messageTimer = 60;

          if (gs.players[gs.currentPlayer].isBot) {
            gs.phase = "waiting";
            // Bot will auto-shoot after delay
          } else if (gs.players[gs.currentPlayer].socketId) {
            gs.phase = "waiting"; // Remote player's turn
          } else {
            gs.phase = "aim";
          }
        }
      }

      // Bot AI auto-shoot
      if (gs.phase === "waiting" && gs.players[gs.currentPlayer].isBot) {
        if (gs.frameCount % 60 === 0) {
          // Find nearest unpocketed piece
          const target = gs.pieces
            .filter((p) => !p.pocketed)
            .reduce((closest, p) => {
              const d1 = Math.hypot(p.x - gs.striker.x, p.y - gs.striker.y);
              const d2 = Math.hypot(closest.x - gs.striker.x, closest.y - gs.striker.y);
              return d1 < d2 ? p : closest;
            });

          const angle = Math.atan2(
            target.y - gs.striker.y,
            target.x - gs.striker.x
          );
          const pwr = 5 + Math.random() * 6;
          gs.striker.vx = Math.cos(angle) * pwr;
          gs.striker.vy = Math.sin(angle) * pwr;
          gs.phase = "moving";
        }
      }

      // Power bar animation
      if (gs.phase === "power") {
        gs.power += gs.powerDir * 0.4;
        if (gs.power >= 12) gs.powerDir = -1;
        if (gs.power <= 0) gs.powerDir = 1;
      }

      // Message timer
      if (gs.messageTimer > 0) gs.messageTimer--;

      // --- RENDER ---
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      // Board background (wooden texture simulation)
      const boardGrad = ctx.createLinearGradient(gs.boardX, gs.boardY, gs.boardX + gs.boardSize, gs.boardY + gs.boardSize);
      boardGrad.addColorStop(0, "#2d1810");
      boardGrad.addColorStop(0.5, "#3d2218");
      boardGrad.addColorStop(1, "#2d1810");
      ctx.fillStyle = boardGrad;
      ctx.fillRect(gs.boardX, gs.boardY, gs.boardSize, gs.boardSize);

      // Board border
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 4;
      ctx.strokeRect(gs.boardX - 2, gs.boardY - 2, gs.boardSize + 4, gs.boardSize + 4);

      // Inner lines
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      const margin = 35;
      ctx.strokeRect(
        gs.boardX + margin,
        gs.boardY + margin,
        gs.boardSize - margin * 2,
        gs.boardSize - margin * 2
      );

      // Center circle
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(
        gs.boardX + gs.boardSize / 2,
        gs.boardY + gs.boardSize / 2,
        25,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Pockets
      pockets.forEach((p) => {
        ctx.fillStyle = "#0a0a0f";
        ctx.beginPath();
        ctx.arc(p.x, p.y, gs.pocketRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5a3a1a";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Pieces
      gs.pieces.forEach((piece) => {
        if (piece.pocketed) return;

        ctx.shadowColor = piece.type === "queen" ? "#ef4444" : piece.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = piece.color;
        ctx.beginPath();
        ctx.arc(piece.x, piece.y, piece.radius, 0, Math.PI * 2);
        ctx.fill();

        if (piece.type === "queen") {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 8px serif";
          ctx.textAlign = "center";
          ctx.fillText("Q", piece.x, piece.y + 3);
        }

        // Ring detail
        ctx.strokeStyle =
          piece.type === "queen"
            ? "#fbbf24"
            : piece.type === "white"
            ? "#d6d3d1"
            : "#44403c";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(piece.x, piece.y, piece.radius - 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Striker
      if (!gs.striker.pocketed) {
        ctx.shadowColor = gs.striker.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = gs.striker.color;
        ctx.beginPath();
        ctx.arc(gs.striker.x, gs.striker.y, gs.striker.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Aim line
        if (gs.phase === "aim" || gs.phase === "power") {
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(gs.striker.x, gs.striker.y);
          ctx.lineTo(
            gs.striker.x + Math.cos(gs.aimAngle) * 80,
            gs.striker.y + Math.sin(gs.aimAngle) * 80
          );
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Power bar
      if (gs.phase === "power") {
        const barX = W / 2 - 60;
        const barY = gs.boardY + gs.boardSize + 20;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(barX, barY, 120, 12);
        const pct = gs.power / 12;
        ctx.fillStyle =
          pct > 0.7
            ? "#ef4444"
            : pct > 0.4
            ? "#f97316"
            : "#22c55e";
        ctx.fillRect(barX, barY, 120 * pct, 12);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TAP TO SHOOT", W / 2, barY + 28);
      }

      if (gs.phase === "aim") {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "TAP TO SET POWER",
          W / 2,
          gs.boardY + gs.boardSize + 40
        );
      }

      // Player scores at bottom
      const scY = gs.boardY + gs.boardSize + 55;
      gs.players.forEach((p, i) => {
        const px = gs.boardX + (i * gs.boardSize) / gs.players.length;
        const isActive = i === gs.currentPlayer;

        ctx.fillStyle = isActive ? p.color : "rgba(255,255,255,0.3)";
        ctx.font = `bold ${isActive ? "10" : "8"}px monospace`;
        ctx.textAlign = "left";
        ctx.fillText(p.name.slice(0, 8), px, scY);
        ctx.fillText(`${p.score} pts`, px, scY + 14);
      });

      // Message
      if (gs.messageTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, gs.messageTimer / 30)})`;
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(gs.message, W / 2, gs.boardY - 10);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, initGame]);

  // Touch controls for aiming and shooting
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTap = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      const gs = stateRef.current;
      if (gs.players[gs.currentPlayer].isBot || gs.players[gs.currentPlayer].socketId) return;

      const rect = canvas.getBoundingClientRect();
      let tx: number, ty: number;
      if ("touches" in e) {
        tx = e.touches[0].clientX - rect.left;
        ty = e.touches[0].clientY - rect.top;
      } else {
        tx = e.clientX - rect.left;
        ty = e.clientY - rect.top;
      }

      if (gs.phase === "aim") {
        // Set aim direction based on touch
        gs.aimAngle = Math.atan2(ty - gs.striker.y, tx - gs.striker.x);
        gs.phase = "power";
        gs.power = 0;
        gs.powerDir = 1;
      } else if (gs.phase === "power") {
        // Shoot!
        gs.striker.vx = Math.cos(gs.aimAngle) * gs.power;
        gs.striker.vy = Math.sin(gs.aimAngle) * gs.power;
        gs.phase = "moving";

        // Broadcast strike
        onGameAction({
          type: "carrom-strike",
          gameId,
          sx: gs.striker.x,
          sy: gs.striker.y,
          svx: gs.striker.vx,
          svy: gs.striker.vy,
        });
      }
    };

    // Aim tracking on drag
    const handleDrag = (e: TouchEvent | MouseEvent) => {
      const gs = stateRef.current;
      if (gs.phase !== "aim") return;
      if (gs.players[gs.currentPlayer].isBot || gs.players[gs.currentPlayer].socketId) return;

      const rect = canvas.getBoundingClientRect();
      let tx: number, ty: number;
      if ("touches" in e) {
        e.preventDefault();
        tx = e.touches[0].clientX - rect.left;
        ty = e.touches[0].clientY - rect.top;
      } else {
        tx = e.clientX - rect.left;
        ty = e.clientY - rect.top;
      }
      gs.aimAngle = Math.atan2(ty - gs.striker.y, tx - gs.striker.x);
    };

    canvas.addEventListener("touchstart", handleTap, { passive: false });
    canvas.addEventListener("mousedown", handleTap);
    canvas.addEventListener("touchmove", handleDrag, { passive: false });
    canvas.addEventListener("mousemove", handleDrag);

    return () => {
      canvas.removeEventListener("touchstart", handleTap);
      canvas.removeEventListener("mousedown", handleTap);
      canvas.removeEventListener("touchmove", handleDrag);
      canvas.removeEventListener("mousemove", handleDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, onGameAction]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
      <canvas
        ref={canvasRef}
        className="w-full max-w-md touch-none"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
