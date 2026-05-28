"use client";

import { useRef, useEffect, useCallback } from "react";

interface GamePlayer {
  playerName: string;
  tableName: string;
  socketId: string;
}

interface MiniBattleProps {
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

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  name: string;
  color: string;
  hp: number;
  maxHp: number;
  isBot: boolean;
  alive: boolean;
  shootCooldown: number;
  angle: number;
  socketId?: string;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: string;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const COLORS = ["#06b6d4", "#f43f5e", "#a855f7", "#22c55e"];
const BOT_NAMES = ["Warrior Kim", "Sniper Raj", "Tank Lee"];

export default function MiniBattle({
  customerName,
  realPlayers,
  socket,
  gameId,
  onScoreUpdate,
  onGameAction,
  gameOver,
}: MiniBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    player: null as Entity | null,
    bots: [] as Entity[],
    remotePlayers: [] as Entity[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    score: 0,
    eliminations: 0,
    frameCount: 0,
    joystickPos: null as { x: number; y: number } | null,
    shootTarget: null as { x: number; y: number } | null,
    initialized: false,
    obstacles: [] as { x: number; y: number; w: number; h: number }[],
  });

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const gs = stateRef.current;

    // Create player at center
    gs.player = {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      size: 16,
      name: customerName,
      color: COLORS[0],
      hp: 100,
      maxHp: 100,
      isBot: false,
      alive: true,
      shootCooldown: 0,
      angle: 0,
    };

    // Remote players
    gs.remotePlayers = realPlayers.map((rp, i) => ({
      x: W * (0.2 + i * 0.3),
      y: H * 0.3,
      vx: 0,
      vy: 0,
      size: 16,
      name: rp.playerName,
      color: COLORS[(i + 1) % COLORS.length],
      hp: 100,
      maxHp: 100,
      isBot: false,
      alive: true,
      shootCooldown: 0,
      angle: 0,
      socketId: rp.socketId,
    }));

    // Bots
    const botsNeeded = Math.max(0, 3 - realPlayers.length);
    gs.bots = [];
    for (let i = 0; i < botsNeeded; i++) {
      gs.bots.push({
        x: 50 + Math.random() * (W - 100),
        y: 50 + Math.random() * (H - 100),
        vx: 0,
        vy: 0,
        size: 16,
        name: BOT_NAMES[i],
        color: COLORS[(realPlayers.length + 1 + i) % COLORS.length],
        hp: 80,
        maxHp: 80,
        isBot: true,
        alive: true,
        shootCooldown: 0,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // Random obstacles
    gs.obstacles = [];
    for (let i = 0; i < 6; i++) {
      gs.obstacles.push({
        x: 40 + Math.random() * (W - 120),
        y: 40 + Math.random() * (H - 120),
        w: 30 + Math.random() * 40,
        h: 30 + Math.random() * 40,
      });
    }

    gs.bullets = [];
    gs.particles = [];
    gs.score = 0;
    gs.eliminations = 0;
    gs.frameCount = 0;
    gs.initialized = true;
  }, [customerName, realPlayers]);

  // Remote actions
  useEffect(() => {
    if (!socket) return;
    const handleAction = (data: { action: any }) => {
      const gs = stateRef.current;
      const a = data.action;
      if (a.type === "battle-pos" && a.gameId === gameId) {
        const rp = gs.remotePlayers.find((p) => p.socketId === a.socketId);
        if (rp) {
          rp.x = a.x;
          rp.y = a.y;
          rp.angle = a.angle;
          rp.hp = a.hp;
          rp.alive = a.alive;
        }
      } else if (a.type === "battle-bullet" && a.gameId === gameId) {
        gs.bullets.push({
          x: a.bx,
          y: a.by,
          vx: a.bvx,
          vy: a.bvy,
          owner: a.owner,
          color: a.color,
        });
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
      if (!gs.initialized || !gs.player) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      gs.frameCount++;

      const player = gs.player;

      // Player movement via virtual joystick
      if (player.alive && gs.joystickPos) {
        const dx = gs.joystickPos.x - W / 4;
        const dy = gs.joystickPos.y - (H - 80);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          player.vx = (dx / dist) * 2.5;
          player.vy = (dy / dist) * 2.5;
        }
      } else {
        player.vx *= 0.85;
        player.vy *= 0.85;
      }

      if (player.alive) {
        player.x += player.vx;
        player.y += player.vy;
        player.x = Math.max(player.size, Math.min(W - player.size, player.x));
        player.y = Math.max(player.size, Math.min(H - player.size, player.y));
        player.shootCooldown = Math.max(0, player.shootCooldown - 1);

        // Auto-shoot toward nearest enemy
        if (gs.shootTarget && player.shootCooldown === 0) {
          const dx = gs.shootTarget.x - player.x;
          const dy = gs.shootTarget.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          player.angle = Math.atan2(dy, dx);
          const speed = 5;
          const bullet: Bullet = {
            x: player.x,
            y: player.y,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            owner: customerName,
            color: player.color,
          };
          gs.bullets.push(bullet);
          player.shootCooldown = 12;

          onGameAction({
            type: "battle-bullet",
            gameId,
            bx: bullet.x,
            by: bullet.y,
            bvx: bullet.vx,
            bvy: bullet.vy,
            owner: customerName,
            color: player.color,
          });
        }

        // Broadcast position
        if (gs.frameCount % 3 === 0) {
          onGameAction({
            type: "battle-pos",
            gameId,
            socketId: socket?.id,
            x: player.x,
            y: player.y,
            angle: player.angle,
            hp: player.hp,
            alive: player.alive,
          });
        }
      }

      // Bot AI
      gs.bots.forEach((bot) => {
        if (!bot.alive) return;

        // Find nearest alive target
        let target = player.alive ? player : null;
        const allTargets = [
          player,
          ...gs.remotePlayers,
          ...gs.bots.filter((b) => b !== bot),
        ].filter((t) => t.alive);

        if (allTargets.length > 0) {
          target = allTargets.reduce((closest, t) => {
            const d1 = Math.hypot(t.x - bot.x, t.y - bot.y);
            const d2 = Math.hypot(closest.x - bot.x, closest.y - bot.y);
            return d1 < d2 ? t : closest;
          });
        }

        if (target) {
          const dx = target.x - bot.x;
          const dy = target.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          bot.angle = Math.atan2(dy, dx);

          // Move toward target but keep distance
          if (dist > 100) {
            bot.vx += (dx / dist) * 0.15;
            bot.vy += (dy / dist) * 0.15;
          } else if (dist < 60) {
            bot.vx -= (dx / dist) * 0.1;
            bot.vy -= (dy / dist) * 0.1;
          }

          // Shoot
          bot.shootCooldown = Math.max(0, bot.shootCooldown - 1);
          if (bot.shootCooldown === 0 && dist < 200) {
            gs.bullets.push({
              x: bot.x,
              y: bot.y,
              vx: (dx / dist) * 4,
              vy: (dy / dist) * 4,
              owner: bot.name,
              color: bot.color,
            });
            bot.shootCooldown = 25 + Math.random() * 15;
          }
        }

        bot.vx *= 0.92;
        bot.vy *= 0.92;
        bot.x += bot.vx;
        bot.y += bot.vy;
        bot.x = Math.max(bot.size, Math.min(W - bot.size, bot.x));
        bot.y = Math.max(bot.size, Math.min(H - bot.size, bot.y));
      });

      // Update bullets
      gs.bullets = gs.bullets.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) return false;

        // Check obstacle collision
        for (const obs of gs.obstacles) {
          if (
            b.x > obs.x &&
            b.x < obs.x + obs.w &&
            b.y > obs.y &&
            b.y < obs.y + obs.h
          ) {
            return false;
          }
        }

        // Check entity hits
        const allEntities = [player, ...gs.remotePlayers, ...gs.bots];
        for (const entity of allEntities) {
          if (!entity.alive || entity.name === b.owner) continue;
          const dist = Math.hypot(b.x - entity.x, b.y - entity.y);
          if (dist < entity.size) {
            entity.hp -= 15;
            // Hit particles
            for (let i = 0; i < 5; i++) {
              gs.particles.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20,
                color: b.color,
              });
            }
            if (entity.hp <= 0) {
              entity.alive = false;
              if (b.owner === customerName) {
                gs.eliminations++;
                gs.score += 20;
                onScoreUpdate(gs.score);
              }
              // Death particles
              for (let i = 0; i < 15; i++) {
                gs.particles.push({
                  x: entity.x,
                  y: entity.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  life: 30,
                  color: entity.color,
                });
              }
            }
            return false;
          }
        }
        return true;
      });

      // Update particles
      gs.particles = gs.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // Respawn dead bots after delay
      gs.bots.forEach((bot) => {
        if (!bot.alive && gs.frameCount % 180 === 0) {
          bot.alive = true;
          bot.hp = bot.maxHp;
          bot.x = 50 + Math.random() * (W - 100);
          bot.y = 50 + Math.random() * (H - 100);
        }
      });

      // --- RENDER ---
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(239, 68, 68, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // Obstacles
      gs.obstacles.forEach((obs) => {
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      });

      // Bullets
      gs.bullets.forEach((b) => {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Particles
      gs.particles.forEach((p) => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Entities
      const allEntities = [
        player,
        ...gs.remotePlayers.filter((p) => p.alive),
        ...gs.bots.filter((b) => b.alive),
      ];

      allEntities.forEach((entity) => {
        if (!entity.alive) return;

        // Body
        ctx.shadowColor = entity.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = entity.color;
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Direction indicator
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(entity.x, entity.y);
        ctx.lineTo(
          entity.x + Math.cos(entity.angle) * (entity.size + 8),
          entity.y + Math.sin(entity.angle) * (entity.size + 8)
        );
        ctx.stroke();

        // HP bar
        const barW = 30;
        const barH = 3;
        const barX = entity.x - barW / 2;
        const barY = entity.y - entity.size - 12;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(barX, barY, barW, barH);
        const hpPercent = entity.hp / entity.maxHp;
        ctx.fillStyle =
          hpPercent > 0.5
            ? "#22c55e"
            : hpPercent > 0.25
            ? "#f97316"
            : "#ef4444";
        ctx.fillRect(barX, barY, barW * hpPercent, barH);

        // Name
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(entity.name.slice(0, 10), entity.x, barY - 3);
      });

      // HUD
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Kills: ${gs.eliminations}`, 12, 24);
      ctx.fillText(`Score: ${gs.score}`, 12, 42);

      // Virtual joystick zone indicator
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 4, H - 80, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Shoot zone indicator
      ctx.beginPath();
      ctx.arc((W * 3) / 4, H - 80, 50, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MOVE", W / 4, H - 30);
      ctx.fillText("AIM & SHOOT", (W * 3) / 4, H - 30);

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

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const W = canvas.width;

      for (let i = 0; i < e.touches.length; i++) {
        const tx = e.touches[i].clientX - rect.left;
        const ty = e.touches[i].clientY - rect.top;

        if (tx < W / 2) {
          // Left side — movement joystick
          stateRef.current.joystickPos = { x: tx, y: ty };
        } else {
          // Right side — aim and shoot
          stateRef.current.shootTarget = { x: tx, y: ty };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        stateRef.current.joystickPos = null;
        stateRef.current.shootTarget = null;
      }
    };

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const tx = e.clientX - rect.left;
      const ty = e.clientY - rect.top;
      const W = canvas.width;

      if (e.buttons === 1) {
        if (tx < W / 2) {
          stateRef.current.joystickPos = { x: tx, y: ty };
        } else {
          stateRef.current.shootTarget = { x: tx, y: ty };
        }
      }
    };

    const handleMouseUp = () => {
      stateRef.current.joystickPos = null;
      stateRef.current.shootTarget = null;
    };

    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mousedown", handleMouse);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("touchmove", handleTouch);
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mousedown", handleMouse);
      canvas.removeEventListener("mouseup", handleMouseUp);
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
