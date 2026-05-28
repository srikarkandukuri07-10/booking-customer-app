import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GameScore {
  playerName: string;
  game: string;
  score: number;
  timestamp: string;
}

interface XPStore {
  totalXP: number;
  level: number;
  gamesPlayed: number;
  dailyScores: GameScore[];
  addXP: (amount: number) => void;
  recordGameScore: (playerName: string, game: string, score: number) => void;
  getDailyLeaderboard: () => GameScore[];
  resetDaily: () => void;
}

const getToday = () => new Date().toISOString().slice(0, 10);

export const useXPStore = create<XPStore>()(
  persist(
    (set, get) => ({
      totalXP: 0,
      level: 1,
      gamesPlayed: 0,
      dailyScores: [],

      addXP: (amount) =>
        set((state) => {
          const newXP = state.totalXP + amount;
          return {
            totalXP: newXP,
            level: Math.floor(newXP / 200) + 1,
          };
        }),

      recordGameScore: (playerName, game, score) =>
        set((state) => ({
          gamesPlayed: state.gamesPlayed + 1,
          dailyScores: [
            ...state.dailyScores,
            {
              playerName,
              game,
              score,
              timestamp: new Date().toISOString(),
            },
          ],
        })),

      getDailyLeaderboard: () => {
        const today = getToday();
        return get()
          .dailyScores.filter((s) => s.timestamp.startsWith(today))
          .sort((a, b) => b.score - a.score);
      },

      resetDaily: () =>
        set((state) => ({
          dailyScores: state.dailyScores.filter(
            (s) => s.timestamp.startsWith(getToday())
          ),
        })),
    }),
    {
      name: "restaurant-xp-store",
    }
  )
);
