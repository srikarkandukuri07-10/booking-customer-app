"use client";

import { useEffect, useState } from "react";
import { useCustomerOrderStore } from "@/store/useCustomerOrderStore";
import TableSelect from "@/features/table-select/TableSelect";
import CategoryNav from "@/features/menu/CategoryNav";
import FoodCard from "@/features/menu/FoodCard";
import CartDrawer from "@/features/cart/CartDrawer";
import { MENU_DATA, CATEGORIES } from "@/data/menuData";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, RotateCcw, AlertTriangle, Clock, CookingPot, CheckCircle2, MessageSquare } from "lucide-react";
import FeedbackModal from "@/features/feedback/FeedbackModal";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [customerName, setCustomerNameState] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Starters");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [currentTokenRunning, setCurrentTokenRunning] = useState<number>(1);

  const [menuItems, setMenuItems] = useState<any[]>(MENU_DATA);
  const setTable = useCustomerOrderStore((state) => state.setTable);

  // Derive visible categories that have at least one item matching the current filter
  const visibleCategories = (CATEGORIES as readonly string[]).filter((category) => {
    const items = menuItems.filter((item) => item.category === category);
    if (dietaryFilter === "ALL") return items.length > 0;
    if (dietaryFilter === "VEG") return items.some((item) => item.veg === true);
    if (dietaryFilter === "NON_VEG") return items.some((item) => item.veg === false);
    return false;
  });

  // Auto-switch to first available category if the current activeCategory gets filtered out
  useEffect(() => {
    if (mounted && visibleCategories.length > 0 && !visibleCategories.includes(activeCategory)) {
      setActiveCategory(visibleCategories[0]);
    }
  }, [dietaryFilter, menuItems, activeCategory, mounted]);

  // 1a. Hydration guard to safely load Zustand persisted state only on the client
  useEffect(() => {
    // Explicitly reset selectedTable and customerName on initial mount so refreshing/reopening always prompts for table
    useCustomerOrderStore.getState().setTable(null);
    useCustomerOrderStore.getState().setCustomerName(null);

    const timer = setTimeout(() => {
      setMounted(true);
      const storeState = useCustomerOrderStore.getState();
      setSelectedTable(storeState.selectedTable);
      setCustomerNameState(storeState.customerName);
      setOrders(storeState.orders || []);
    }, 0);

    // Subscribe to Zustand store changes to keep state perfectly synchronized
    const unsubscribe = useCustomerOrderStore.subscribe((state) => {
      setSelectedTable(state.selectedTable);
      setCustomerNameState(state.customerName);
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
        
        // Clean/remove the query parameters from the address bar so that
        // refreshing the page later will ask for the table number again!
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    return () => unsubscribe();
  }, [setTable]);

  // 1b. Fetch active menu items dynamically from backend database (with static fallback)
  const fetchDynamicMenu = async () => {
    try {
      const envUrl = process.env.NEXT_PUBLIC_API_URL || "https://booki-admin-backend.vercel.app";
      // Ensure https for localhost fallback
      const backendUrl = (envUrl.startsWith("http://localhost") || envUrl.startsWith("http://127.0.0.1")) 
        ? envUrl.replace("http://", "https://") 
        : envUrl;
        
      let res;
      try {
        res = await fetch(`${backendUrl}/api/menu?public=true`);
      } catch (fetchErr) {
        console.warn("⚠️ Primary backend fetch failed, trying live production API...", fetchErr);
        res = await fetch("https://booki-admin-backend.vercel.app/api/menu?public=true");
      }
      
      const data = await res.json();
      
      if (data.success && data.categories) {
        const dbItems: any[] = [];
        data.categories.forEach((cat: any) => {
          cat.items.forEach((item: any) => {
            dbItems.push({
              id: item.id,
              name: item.name,
              category: cat.name,
              price: item.price,
              image: item.image,
              veg: item.veg,
              availability: item.availability !== undefined ? item.availability : true,
              description: item.description,
              feedback: item.feedback || { mustTry: 10, veryTasty: 10, good: 10, ok: 1 },
              feedbackStats: item.feedbackStats || null // Map dynamic feedback statistics from database!
            });
          });
        });
        
        if (dbItems.length > 0) {
          setMenuItems(dbItems);
          console.log(`🍟 Loaded ${dbItems.length} active menu items from backend!`);
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to load menu from database, using offline static fallback.", err);
    }
  };

  const fetchCurrentToken = async () => {
    try {
      const envUrl = process.env.NEXT_PUBLIC_API_URL || "https://booki-admin-backend.vercel.app";
      const backendUrl = (envUrl.startsWith("http://localhost") || envUrl.startsWith("http://127.0.0.1")) 
        ? envUrl.replace("http://", "https://") 
        : envUrl;
        
      const res = await fetch(`${backendUrl}/api/token/running`);
      const data = await res.json();
      if (data.success && typeof data.currentToken === "number") {
        setCurrentTokenRunning(data.currentToken);
      }
    } catch (err) {
      console.warn("⚠️ Failed to load current running token:", err);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchDynamicMenu();
      fetchCurrentToken();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // 1c. Fast periodic background menu polling to catch availability updates
  useEffect(() => {
    if (!mounted) return;

    const pollMenuInterval = setInterval(() => {
      fetchDynamicMenu();
      fetchCurrentToken(); // Also sync running token!
    }, 2000); // Poll every 2 seconds for immediate menu availability sync!

    return () => clearInterval(pollMenuInterval);
  }, [mounted]);

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

    const handleMenuUpdate = () => {
      console.log("📡 Realtime menu update detected via Socket.IO, re-fetching...");
      fetchDynamicMenu();
    };

    const handleTokenUpdate = (data: { currentToken: number }) => {
      console.log("📡 Token running update received via Socket.IO:", data.currentToken);
      setCurrentTokenRunning(data.currentToken);
    };

    socket.on("status-changed", handleStatusChange);
    socket.on("menu-updated", handleMenuUpdate);
    socket.on("current-token-updated", handleTokenUpdate);
    console.log("📡 Socket.IO: status-changed, menu-updated & current-token-updated listeners bound.");

    return () => {
      socket.off("status-changed", handleStatusChange);
      socket.off("menu-updated", handleMenuUpdate);
      socket.off("current-token-updated", handleTokenUpdate);
      console.log("📡 Socket.IO: listeners removed.");
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

  // 2c. Background polling fallback to track order status dynamically on Vercel
  useEffect(() => {
    if (!mounted || orders.length === 0) return;

    const latestActiveOrder = orders.find(
      (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED" && o.status !== "SERVED"
    );
    if (!latestActiveOrder) return;

    const pollOrderInterval = setInterval(async () => {
      try {
        const envUrl = process.env.NEXT_PUBLIC_API_URL || "https://booki-admin-backend.vercel.app";
        const backendUrl = (envUrl.startsWith("http://localhost") || envUrl.startsWith("http://127.0.0.1")) 
          ? envUrl.replace("http://", "https://") 
          : envUrl;

        const res = await fetch(`${backendUrl}/api/orders/${latestActiveOrder.id}`);
        const data = await res.json();

        if (data.success && data.order) {
          const newStatus = data.order.status;
          
          if (newStatus !== latestActiveOrder.status) {
            console.log(`📡 Background poll order status change: ${latestActiveOrder.id} → ${newStatus}`);
            
            // Update Zustand store directly
            useCustomerOrderStore.setState((state) => ({
              orders: state.orders.map((o) => (o.id === latestActiveOrder.id ? { ...o, status: newStatus } : o)),
            }));
          }
        }
      } catch (err) {
        console.warn("⚠️ Live Order Tracker Poll failed:", err);
      }
    }, 5000); // Poll every 5 seconds for fast live order tracking!

    return () => clearInterval(pollOrderInterval);
  }, [mounted, orders]);


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
  if (!selectedTable || !customerName) {
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

        {/* Selected Table Pill */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
              {selectedTable}
            </span>
          </div>
        </div>
      </header>

      {/* 2. STICKY CATEGORY NAV */}
      <CategoryNav 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
        categories={visibleCategories}
      />

      {/* 3. MENU ITEMS MAIN VIEWPORT */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Massive Centered Real-time Running Token Billboard (Primary Attraction) */}
        <div className="w-full bg-[#161615]/90 border border-amber-500/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(245,158,11,0.06)] backdrop-blur-xl relative overflow-hidden my-2">
          {/* Glowing background ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber-500/[0.04] rounded-full blur-[35px] pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-1.5 z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-amber-500/90">
              Now Preparing Token
            </span>
          </div>

          <h1 className="text-7xl font-black text-white font-mono tracking-tight my-2 drop-shadow-[0_0_20px_rgba(245,158,11,0.25)] z-10 flex items-baseline justify-center">
            <span className="text-amber-500 text-3xl font-bold mr-1 font-serif">#</span>
            {currentTokenRunning}
          </h1>

          <p className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase mt-1.5 z-10">
            {currentTokenRunning === 0 
              ? "All caught up! Queue is currently empty." 
              : "Track this number to know when to collect your food"
            }
          </p>
        </div>
        
        {/* Simple Dietary Filter (All / Veg / Non-Veg) */}
        <div className="flex items-center justify-center gap-1.5 bg-white/[0.02] border border-white/[0.04] p-1 rounded-2xl w-fit mx-auto shadow-inner z-10 relative">
          <button
            onClick={() => setDietaryFilter("ALL")}
            className={`px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-extrabold cursor-pointer select-none transition-all duration-300 ${
              dietaryFilter === "ALL"
                ? "bg-white/10 text-neutral-100 shadow border border-white/5"
                : "text-neutral-500 hover:text-neutral-300 border border-transparent"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setDietaryFilter("VEG")}
            className={`px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-extrabold cursor-pointer select-none transition-all duration-300 flex items-center gap-1.5 ${
              dietaryFilter === "VEG"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow shadow-emerald-500/5"
                : "text-neutral-500 hover:text-neutral-300 border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Veg Only
          </button>
          <button
            onClick={() => setDietaryFilter("NON_VEG")}
            className={`px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-extrabold cursor-pointer select-none transition-all duration-300 flex items-center gap-1.5 ${
              dietaryFilter === "NON_VEG"
                ? "bg-red-500/10 text-red-400 border border-red-500/10 shadow shadow-red-500/5"
                : "text-neutral-500 hover:text-neutral-300 border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Non-Veg Only
          </button>
        </div>
        
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

                {latestOrder.tokenNumber && latestOrder.tokenNumber !== currentTokenRunning ? (
                  <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span>Your Queue Token: <span className="text-amber-500 font-extrabold font-mono text-xs">#{latestOrder.tokenNumber}</span></span>
                    {latestOrder.tokenNumber > currentTokenRunning ? (
                      <span>Queue Position: <span className="text-neutral-300 font-extrabold font-mono text-xs">{latestOrder.tokenNumber - currentTokenRunning} orders away</span></span>
                    ) : (
                      <span className="text-emerald-400 font-extrabold">In Service</span>
                    )}
                  </div>
                ) : latestOrder.tokenNumber && latestOrder.tokenNumber === currentTokenRunning ? (
                  <div className="flex items-center gap-1.5 border-t border-white/5 pt-2.5 mt-2.5 text-[10px] text-emerald-400 font-black uppercase tracking-wider animate-pulse">
                    <span>🍽️ Your order is being served right now! Bon Appétit!</span>
                  </div>
                ) : null}
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

        {CATEGORIES.map((category) => {
          let categoryItems = menuItems.filter((item) => item.category === category);
          
          // Apply dietary Veg / Non-Veg filter dynamically
          if (dietaryFilter === "VEG") {
            categoryItems = categoryItems.filter((item) => item.veg === true);
          } else if (dietaryFilter === "NON_VEG") {
            categoryItems = categoryItems.filter((item) => item.veg === false);
          }
          
          if (categoryItems.length === 0) return null; // Hide the category section completely if empty
          
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

      {/* Floating Action Feedback Button (glowing chat logo) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-neutral-950 flex items-center justify-center shadow-[0_4px_20px_rgba(245,158,11,0.35)] cursor-pointer border border-amber-400/20 active:scale-95 transition-all"
        title="Leave Feedback"
      >
        <MessageSquare className="w-5 h-5 fill-neutral-950/10 stroke-[2.5]" />
      </motion.button>

      {/* Dynamic Feedback Submission Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        menuItems={menuItems}
        onFeedbackSubmitted={fetchDynamicMenu}
      />
    </div>
  );
}
