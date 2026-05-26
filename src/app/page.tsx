"use client";

import { useEffect, useState } from "react";
import { useCustomerOrderStore } from "@/store/useCustomerOrderStore";
import TableSelect from "@/features/table-select/TableSelect";
import CategoryNav from "@/features/menu/CategoryNav";
import FoodCard from "@/features/menu/FoodCard";
import CartDrawer from "@/features/cart/CartDrawer";
import { MENU_DATA, CATEGORIES } from "@/data/menuData";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, RotateCcw, AlertTriangle, Clock, CookingPot, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Starters");

  const setTable = useCustomerOrderStore((state) => state.setTable);

  // 1. Hydration guard to safely load Zustand persisted state only on the client
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const storeState = useCustomerOrderStore.getState();
      setSelectedTable(storeState.selectedTable);
      setOrders(storeState.orders || []);
    }, 0);

    // Subscribe to Zustand store changes to keep state perfectly synchronized
    const unsubscribe = useCustomerOrderStore.subscribe((state) => {
      setSelectedTable(state.selectedTable);
      setOrders(state.orders || []);
    });

    // Auto-detect table number from URL query parameter (e.g., ?table=4 or ?table=Table+4)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get("table");
      if (tableParam) {
        const cleanedTable = decodeURIComponent(tableParam).trim();
        const formattedTable = /^\d+$/.test(cleanedTable) 
          ? `Table ${cleanedTable}` 
          : cleanedTable;
        setTable(formattedTable);
      }
    }

    return () => unsubscribe();
  }, [setTable]);

  // 2a. Connect socket + bind status listener ONCE on mount only
  // Having `orders` in deps caused a new listener to be added every time an update arrived!
  useEffect(() => {
    if (!mounted) return;

    const socketModule = require("@/lib/socket");
    const socket = socketModule.socket;
    socketModule.connectSocket();

    const handleStatusChange = ({ id, status }: { id: string; status: any }) => {
      console.log(`📡 Realtime order update: Order ${id} → ${status}`);
      // Update Zustand store directly — the store subscription above will sync local state
      useCustomerOrderStore.setState((state) => ({
        orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
      }));
    };

    socket.on("status-changed", handleStatusChange);
    console.log("📡 Socket.IO: status-changed listener bound.");

    return () => {
      socket.off("status-changed", handleStatusChange);
      console.log("📡 Socket.IO: status-changed listener removed.");
    };
  }, [mounted]); // ← only runs once when component mounts

  // 2b. Join order rooms whenever we get new active order IDs
  // Separate from the listener so joining new rooms doesn't tear down the listener
  useEffect(() => {
    if (!mounted || orders.length === 0) return;

    const socketModule = require("@/lib/socket");
    const socket = socketModule.socket;

    const activeOrders = orders.filter(
      (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED" && o.status !== "SERVED"
    );

    activeOrders.forEach((o) => {
      socket.emit("join-order-room", o.id);
      console.log(`📡 Customer joined room for order: ${o.id}`);
    });
    // No cleanup needed — rooms persist for the session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, orders.map((o) => o.id).join(",")]); // Only re-run when order IDs change


  // Scroll spy: automatically update the active category pill as the user scrolls
  useEffect(() => {
    if (!mounted || !selectedTable) return;

    const observers: IntersectionObserver[] = [];
    
    // Configure observer to track which section is currently centered/top in viewport
    const options = {
      root: null, // Viewport
      rootMargin: "-140px 0px -60% 0px", // Trigger when header leaves and section is mostly visible
      threshold: 0
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const categoryId = entry.target.id;
          // Find matching category in our dataset
          const matchingCategory = CATEGORIES.find(
            (cat) => `category-${cat.toLowerCase().replace(/\s+/g, "-")}` === categoryId
          );
          if (matchingCategory) {
            setActiveCategory(matchingCategory);
          }
        }
      });
    };

    const observer = new IntersectionObserver(callback, options);
    observers.push(observer);

    CATEGORIES.forEach((category) => {
      const id = `category-${category.toLowerCase().replace(/\s+/g, "-")}`;
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [mounted, selectedTable]);

  // A. Hydration loading state (elegant dark spinner)
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0e] text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <Utensils className="absolute w-5 h-5 text-amber-500" />
        </div>
      </div>
    );
  }

  // B. Route Flow 1: Table Selection Screen
  if (!selectedTable) {
    return <TableSelect />;
  }

  // Find the latest active order submitted by the customer during this session to track in real time!
  const latestOrder = orders.find(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED" && o.status !== "SERVED"
  );

  // C. Route Flow 2: Main Menu & Dashboard
  return (
    <div className="min-h-screen bg-[#0f0f0e] text-neutral-100 flex flex-col pb-24 relative selection:bg-amber-500 selection:text-neutral-950">
      
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.03)_0%,transparent_50%)] pointer-events-none" />

      {/* 1. STICKY BRAND HEADER */}
      <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/[0.04] h-16 flex items-center justify-between px-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
            <Utensils className="w-4.5 h-4.5 text-neutral-950 stroke-[2.5]" />
          </div>
          <span className="shimmer-text font-serif font-bold text-lg tracking-tight">
            L'Ambre Rustic
          </span>
        </div>

        {/* Selected Table Pill & Swap Button */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
              {selectedTable}
            </span>
          </div>

          <button
            onClick={() => setTable(null)}
            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-neutral-400 hover:text-neutral-200 cursor-pointer"
            title="Change Table"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. STICKY CATEGORY NAV */}
      <CategoryNav 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
      />

      {/* 3. MENU ITEMS MAIN VIEWPORT */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-8">
        
        {/* Real-time Live Order Status Tracker */}
        <AnimatePresence>
          {latestOrder && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`p-4 rounded-3xl border flex items-start gap-3.5 shadow-lg transition-all duration-500 text-left ${
                latestOrder.status === "READY"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 shadow-emerald-500/5"
                  : latestOrder.status === "PREPARING"
                  ? "bg-orange-500/10 border-orange-500/25 text-orange-400 shadow-orange-500/5"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-400 shadow-amber-500/5"
              }`}
            >
              {/* Animated Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {latestOrder.status === "READY" ? (
                  <CheckCircle2 className="w-5.5 h-5.5 text-emerald-400 animate-bounce" />
                ) : latestOrder.status === "PREPARING" ? (
                  <CookingPot className="w-5.5 h-5.5 text-orange-400 animate-pulse" />
                ) : (
                  <Clock className="w-5.5 h-5.5 text-amber-400 animate-spin [animation-duration:3s]" />
                )}
              </div>
              
              <div className="flex-grow flex flex-col gap-0.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase tracking-wider text-[10px]">
                    Live Order Tracker
                  </span>
                  <span className="font-mono text-[9px] text-neutral-400">
                    ID: #{latestOrder.id.slice(0, 8)}
                  </span>
                </div>
                
                <p className="font-semibold text-neutral-200 mt-1">
                  {latestOrder.status === "READY" ? (
                    "Your order is ready! It will be served to you shortly."
                  ) : latestOrder.status === "PREPARING" ? (
                    "Your order is received and accepted. Cooking in progress!"
                  ) : (
                    "Your order is placed. Waiting for kitchen confirmation..."
                  )}
                </p>
                
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2.5">
                  <motion.div
                    className={`h-full rounded-full ${
                      latestOrder.status === "READY"
                        ? "bg-emerald-500"
                        : latestOrder.status === "PREPARING"
                        ? "bg-orange-500"
                        : "bg-amber-500"
                    }`}
                    initial={{ width: "15%" }}
                    animate={{
                      width:
                        latestOrder.status === "READY"
                          ? "100%"
                          : latestOrder.status === "PREPARING"
                          ? "65%"
                          : "25%",
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Important notice badge */}
        <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-neutral-400 leading-normal">
            Orders are placed directly to the kitchen. Please double-check item quantities and customization notes before submitting.
          </p>
        </div>

        {/* Section Groups */}
        {CATEGORIES.map((category) => {
          const categoryItems = MENU_DATA.filter((item) => item.category === category);
          const categoryId = `category-${category.toLowerCase().replace(/\s+/g, "-")}`;
          
          return (
            <section 
              key={category} 
              id={categoryId}
              className="scroll-mt-32 flex flex-col gap-4"
            >
              {/* Category Header Label */}
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black tracking-widest text-neutral-300 uppercase font-serif">
                  {category}
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                <span className="text-[10px] text-neutral-500 uppercase font-bold font-mono">
                  {categoryItems.length} items
                </span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 gap-5">
                {categoryItems.map((item) => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* 4. PERSISTENT SLIDING CART & FLOATING ACTION TRIGGER */}
      <CartDrawer />
    </div>
  );
}
