"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCustomerOrderStore } from "@/store/useCustomerOrderStore";
import { Utensils, User, ArrowRight, RefreshCw, PartyPopper } from "lucide-react";

export default function TableSelect() {
  const { selectedTable, customerName, setTable, setCustomerName } = useCustomerOrderStore();
  const [nameInput, setNameInput] = useState("");
  const [selectedTableLocal, setSelectedTableLocal] = useState<string | null>(null);
  const [returningUser, setReturningUser] = useState(false);

  const tables = Array.from({ length: 12 }, (_, i) => `Table ${i + 1}`);

  // On mount, check if we have a persisted identity from a previous session
  useEffect(() => {
    const storeState = useCustomerOrderStore.getState();
    if (storeState.customerName) {
      setNameInput(storeState.customerName);
      setReturningUser(true);
    }
    if (storeState.selectedTable && !selectedTable) {
      setSelectedTableLocal(storeState.selectedTable);
    }
  }, [selectedTable]);

  const handleProceed = () => {
    const tableToBind = selectedTable || selectedTableLocal;
    if (nameInput.trim() && tableToBind) {
      const storeState = useCustomerOrderStore.getState();
      const isReturning =
        storeState.customerName === nameInput.trim() &&
        storeState.selectedTable === tableToBind;

      if (!isReturning) {
        // New customer or different identity — clear old orders
        useCustomerOrderStore.setState({ orders: [], cart: [] });
      }

      setCustomerName(nameInput.trim());
      if (selectedTableLocal) {
        setTable(selectedTableLocal);
      }
    }
  };

  const currentTable = selectedTable || selectedTableLocal;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-[#0f0f0e] text-white relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md text-center z-10 flex flex-col items-center"
      >
        {/* Animated Gold Logo */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-4"
        >
          <Utensils className="w-8 h-8 text-neutral-950 stroke-[2.5]" />
        </motion.div>

        <h1 className="text-3xl font-bold tracking-tight mb-1">
          <span className="shimmer-text font-serif">L'Ambre Rustic</span>
        </h1>
        <p className="text-neutral-400 text-sm mb-8 tracking-widest uppercase">
          Smart Dining Experience
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full bg-white/[0.01] border border-white/[0.04] p-6 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col gap-6"
        >
          {/* Welcome back badge */}
          {returningUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center gap-2.5"
            >
              <PartyPopper className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">
                  Welcome Back!
                </span>
                <span className="text-xs text-neutral-300 mt-0.5">
                  We found your previous session. Confirm your name below to resume.
                </span>
              </div>
            </motion.div>
          )}

          {/* Section 1: Customer Name Input */}
          <div className="w-full flex flex-col gap-2.5 text-left">
            <label className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-500" />
              Who is dining today? (Required)
            </label>
            <input
              type="text"
              required
              placeholder="Enter your name to start..."
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (returningUser) setReturningUser(false);
              }}
              className="w-full text-xs py-3.5 px-4 rounded-2xl bg-black/40 border border-white/5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner"
            />
          </div>

          {/* Section 2: Table Selection */}
          {selectedTable ? (
            // QR Code Seated Welcome
            <div className="w-full bg-amber-500/5 border border-amber-500/10 p-4.5 rounded-2xl flex flex-col gap-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-neutral-400">
                  QR Code Seated
                </span>
                <button
                  onClick={() => setTable(null)}
                  className="text-[10px] font-bold text-amber-500 hover:text-amber-400 cursor-pointer flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> Change Table
                </button>
              </div>
              <p className="text-sm font-semibold text-neutral-200 leading-normal">
                You are scanned at <span className="text-amber-400 font-extrabold">{selectedTable}</span>. We will bind all items to this table.
              </p>
            </div>
          ) : (
            // Manual Grid Selector
            <div className="w-full flex flex-col gap-4 text-left">
              <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest pl-1">
                Select Your Table
              </label>
              
              <div className="grid grid-cols-3 gap-3">
                {tables.map((table, index) => {
                  const isSelected = selectedTableLocal === table;
                  return (
                    <motion.button
                      key={table}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTableLocal(table)}
                      className={`flex flex-col items-center justify-center py-4 rounded-xl cursor-pointer border transition-all duration-300 ${
                        isSelected 
                          ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5"
                          : "bg-white/[0.02] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`text-xl font-bold transition-colors ${isSelected ? "text-amber-400" : "text-neutral-300"}`}>
                        {index + 1}
                      </span>
                      <span className={`text-[8px] tracking-wider uppercase mt-0.5 transition-colors ${isSelected ? "text-amber-500" : "text-neutral-500"}`}>
                        Table
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action trigger to proceed */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleProceed}
            disabled={!nameInput.trim() || !currentTable}
            className="w-full h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(245,158,11,0.25)] cursor-pointer select-none transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none"
          >
            <span>{returningUser ? "Resume Session" : "Proceed to Menu"}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </motion.button>
        </motion.div>

        {/* Footer micro info */}
        <p className="text-[10px] text-neutral-600 mt-8 tracking-wide">
          Entering correct details ensures smooth food serving by waitstaff.
        </p>
      </motion.div>
    </div>
  );
}
