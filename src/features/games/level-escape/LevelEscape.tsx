"use client";

import { useRef, useEffect, useCallback } from "react";

interface LevelEscapeProps {
  customerName: string;
  tableName: string;
  realPlayers: any[];
  socket: any;
  gameId: string;
  onScoreUpdate: (score: number) => void;
  onGameAction: (action: any) => void;
  gameOver: boolean;
  timeLeft: number;
}

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  deaths: number;
}

interface Trap {
  type: "spike" | "laser" | "fallingBlock";
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  timer: number;
  phase: number;
}

interface Room {
  platforms: { x: number; y: number; w: number; h: number }[];
  traps: Trap[];
  exitX: number;
  exitY: number;
  exitW: number;
  exitH: number;
  color: string;
}

const ROOM_COLORS = [
  "#f59e0b", "#06b6d4", "#a855f7", "#22c55e", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#8b5cf6",
];

function generateRoom(W: number, H: number, level: number): Room {
  const platforms: Room["platforms"] = [];
  const traps: Trap[] = [];
  const color = ROOM_COLORS[level % ROOM_COLORS.length];

  // Floor
  platforms.push({ x: 0, y: H - 30, w: W, h: 30 });

  // Generate stepped platforms
  const numPlatforms = 3 + Math.floor(level * 0.5);
  for (let i = 0; i < numPlatforms; i++) {
    const px = 20 + Math.random() * (W - 120);
    const py = H - 80 - i * (60 + Math.random() * 30);
    const pw = 60 + Math.random() * 80;
    platforms.push({ x: px, y: py, w: pw, h: 10 });
  }

  // Add traps based on difficulty
  const numTraps = Math.min(level + 1, 6);
  for (let i = 0; i < numTraps; i++) {
    const trapType = ["spike", "laser", "fallingBlock"][
      Math.floor(Math.random() * 3)
    ] as Trap["type"];

    if (trapType === "spike") {
      const sp = platforms[Math.floor(Math.random() * platforms.length)];
      traps.push({
        type: "spike",
        x: sp.x + Math.random() * (sp.w - 20),
        y: sp.y - 12,
        w: 20,
        h: 12,
        active: true,
        timer: 0,
        phase: 0,
      });
    } else if (trapType === "laser") {
      traps.push({
        type: "laser",
        x: 20 + Math.random() * (W - 40),
        y: H - 100 - Math.random() * 200,
        w: 4,
        h: 60 + Math.random() * 80,
        active: true,
        timer: 0,
        phase: Math.random() * Math.PI * 2,
      });
    } else {
      traps.push({
        type: "fallingBlock",
        x: 40 + Math.random() * (W - 80),
        y: 40 + Math.random() * 100,
        w: 30,
        h: 30,
        active: false,
        timer: 60 + Math.random() * 120,
        phase: 0,
      });
    }
  }

  // Exit door at top
  const exitPlatform = platforms.reduce((highest, p) =>
    p.y < highest.y && p !== platforms[0] ? p : highest,
    platforms[1] || platforms[0]
  );

  return {
    platforms,
    traps,
    exitX: exitPlatform.x + exitPlatform.w / 2 - 15,
    exitY: exitPlatform.y - 35,
    exitW: 30,
    exitH: 35,
    color,
  };
}

export default function LevelEscape({
  customerName,
  onScoreUpdate,
  gameOver,
  timeLeft,
}: LevelEscapeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    player: null as PlayerState | null,
    currentRoom: null as Room | null,
    roomLevel: 0,
    score: 0,
    frameCount: 0,
    keys: { left: false, right: false, jump: false },
    initialized: false,
    W: 0,
    H: 0,
    shakeFrames: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
  });

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const gs = stateRef.current;

    gs.W = W;
    gs.H = H;
    gs.roomLevel = 0;
    gs.score = 0;
    gs.currentRoom = generateRoom(W, H, 0);

    gs.player = {
      x: 30,
      y: H - 60,
      vx: 0,
      vy: 0,
      width: 18,
      height: 24,
      grounded: false,
      deaths: 0,
    };

    gs.frameCount = 0;
    gs.particles = [];
    gs.initialized = true;
  }, []);

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
      if (!gs.initialized || !gs.player || !gs.currentRoom) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      const player = gs.player;
      const room = gs.currentRoom;
      gs.frameCount++;

      // Player movement
      if (gs.keys.left) player.vx = -3;
      else if (gs.keys.right) player.vx = 3;
      else player.vx *= 0.8;

      if (gs.keys.jump && player.grounded) {
        player.vy = -9;
        player.grounded = false;
      }

      // Physics
      player.vy += 0.45; // gravity
      player.x += player.vx;
      player.y += player.vy;

      // Wall boundaries
      player.x = Math.max(0, Math.min(W - player.width, player.x));

      // Platform collision
      player.grounded = false;
      room.platforms.forEach((plat) => {
        if (
          player.x + player.width > plat.x &&
          player.x < plat.x + plat.w &&
          player.y + player.height >= plat.y &&
          player.y + player.height <= plat.y + plat.h + 8 &&
          player.vy >= 0
        ) {
          player.y = plat.y - player.height;
          player.vy = 0;
          player.grounded = true;
        }
      });

      // Fell off screen
      if (player.y > H + 30) {
        player.deaths++;
        player.x = 30;
        player.y = H - 60;
        player.vy = 0;
        player.vx = 0;
        gs.shakeFrames = 10;
      }

      // Update traps
      room.traps.forEach((trap) => {
        if (trap.type === "laser") {
          trap.phase += 0.03;
          trap.active = Math.sin(trap.phase) > 0;
        }
        if (trap.type === "fallingBlock") {
          trap.timer--;
          if (trap.timer <= 0) {
            trap.active = true;
            trap.y += 3;
            if (trap.y > H) {
              trap.y = 40 + Math.random() * 100;
              trap.active = false;
              trap.timer = 80 + Math.random() * 100;
            }
          }
        }

        // Collision with player
        if (trap.active) {
          const hit =
            player.x + player.width > trap.x &&
            player.x < trap.x + trap.w &&
            player.y + player.height > trap.y &&
            player.y < trap.y + trap.h;

          if (hit) {
            player.deaths++;
            player.x = 30;
            player.y = H - 60;
            player.vy = 0;
            player.vx = 0;
            gs.shakeFrames = 10;

            // Death particles
            for (let i = 0; i < 10; i++) {
              gs.particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 25,
                color: room.color,
              });
            }
          }
        }
      });

      // Check exit reached
      if (
        player.x + player.width > room.exitX &&
        player.x < room.exitX + room.exitW &&
        player.y + player.height > room.exitY &&
        player.y < room.exitY + room.exitH
      ) {
        // Next room!
        gs.roomLevel++;
        gs.score += 50 + (player.deaths === 0 ? 20 : 0);
        onScoreUpdate(gs.score);

        gs.currentRoom = generateRoom(W, H, gs.roomLevel);
        player.x = 30;
        player.y = H - 60;
        player.vy = 0;
        player.deaths = 0;

        // Victory particles
        for (let i = 0; i < 20; i++) {
          gs.particles.push({
            x: W / 2,
            y: H / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 40,
            color: ROOM_COLORS[Math.floor(Math.random() * ROOM_COLORS.length)],
          });
        }
      }

      // Update particles
      gs.particles = gs.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // Screen shake
      if (gs.shakeFrames > 0) gs.shakeFrames--;
      const shakeX = gs.shakeFrames > 0 ? (Math.random() - 0.5) * 6 : 0;
      const shakeY = gs.shakeFrames > 0 ? (Math.random() - 0.5) * 6 : 0;

      // --- RENDER ---
      ctx.save();
      ctx.translate(shakeX, shakeY);

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(-5, -5, W + 10, H + 10);

      // Room level indicator
      ctx.fillStyle = `${room.color}15`;
      ctx.fillRect(0, 0, W, H);

      // Platforms
      room.platforms.forEach((plat) => {
        ctx.fillStyle = `${room.color}40`;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = room.color;
        ctx.fillRect(plat.x, plat.y, plat.w, 2);
      });

      // Traps
      room.traps.forEach((trap) => {
        if (trap.type === "spike") {
          ctx.fillStyle = "#ef4444";
          // Draw triangle spikes
          for (let sx = 0; sx < trap.w; sx += 8) {
            ctx.beginPath();
            ctx.moveTo(trap.x + sx, trap.y + trap.h);
            ctx.lineTo(trap.x + sx + 4, trap.y);
            ctx.lineTo(trap.x + sx + 8, trap.y + trap.h);
            ctx.fill();
          }
        } else if (trap.type === "laser") {
          if (trap.active) {
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 15;
            ctx.fillStyle = "#ef444480";
            ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(trap.x + 1, trap.y, 2, trap.h);
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = "rgba(239,68,68,0.15)";
            ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
          }
        } else if (trap.type === "fallingBlock") {
          ctx.fillStyle = trap.active ? "#f97316" : "#f9731640";
          ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
          if (trap.active) {
            ctx.strokeStyle = "#f97316";
            ctx.strokeRect(trap.x, trap.y, trap.w, trap.h);
          }
        }
      });

      // Exit door
      ctx.fillStyle = "#22c55e30";
      ctx.fillRect(room.exitX, room.exitY, room.exitW, room.exitH);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.strokeRect(room.exitX, room.exitY, room.exitW, room.exitH);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("EXIT", room.exitX + room.exitW / 2, room.exitY - 5);

      // Player
      ctx.shadowColor = room.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = room.color;
      ctx.beginPath();
      ctx.roundRect(player.x, player.y, player.width, player.height, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Player name
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        customerName.slice(0, 10),
        player.x + player.width / 2,
        player.y - 5
      );

      // Particles
      gs.particles.forEach((p) => {
        ctx.globalAlpha = p.life / 40;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Room ${gs.roomLevel + 1}`, 12, 24);
      ctx.fillText(`Score: ${gs.score}`, 12, 42);
      ctx.textAlign = "right";
      ctx.fillText(`Deaths: ${player.deaths}`, W - 12, 24);

      ctx.restore();

      // Touch control buttons
      const btnY = H - 60;
      const btnSize = 48;

      // Left button
      ctx.fillStyle = gs.keys.left ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect(16, btnY, btnSize, btnSize, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("◀", 16 + btnSize / 2, btnY + btnSize / 2 + 6);

      // Right button
      ctx.fillStyle = gs.keys.right ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect(16 + btnSize + 12, btnY, btnSize, btnSize, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("▶", 16 + btnSize + 12 + btnSize / 2, btnY + btnSize / 2 + 6);

      // Jump button
      ctx.fillStyle = gs.keys.jump ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect(W - 16 - btnSize, btnY, btnSize, btnSize, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("▲", W - 16 - btnSize / 2, btnY + btnSize / 2 + 6);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, initGame]);

  // Touch and keyboard controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gs = stateRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") gs.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d") gs.keys.right = true;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") gs.keys.jump = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") gs.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") gs.keys.right = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") gs.keys.jump = false;
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const W = canvas.width;
      const H = canvas.height;
      const btnY = H - 60;
      const btnSize = 48;

      gs.keys.left = false;
      gs.keys.right = false;
      gs.keys.jump = false;

      for (let i = 0; i < e.touches.length; i++) {
        const tx = e.touches[i].clientX - rect.left;
        const ty = e.touches[i].clientY - rect.top;

        // Left button
        if (tx >= 16 && tx <= 16 + btnSize && ty >= btnY && ty <= btnY + btnSize) {
          gs.keys.left = true;
        }
        // Right button
        if (tx >= 16 + btnSize + 12 && tx <= 16 + btnSize * 2 + 12 && ty >= btnY && ty <= btnY + btnSize) {
          gs.keys.right = true;
        }
        // Jump button
        if (tx >= W - 16 - btnSize && tx <= W - 16 && ty >= btnY && ty <= btnY + btnSize) {
          gs.keys.jump = true;
        }
      }
    };

    const handleTouchEnd = () => {
      gs.keys.left = false;
      gs.keys.right = false;
      gs.keys.jump = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("touchmove", handleTouch);
      canvas.removeEventListener("touchend", handleTouchEnd);
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
