"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MenuItem } from "@/types";
import { useCustomerOrderStore } from "@/store/useCustomerOrderStore";
import { Plus, Minus, MessageSquareText, ThumbsUp, Star, Smile, Heart, Check } from "lucide-react";

interface FoodCardProps {
  item: MenuItem;
}

export default function FoodCard({ item }: FoodCardProps) {
  const { cart, addToCart } = useCustomerOrderStore();
  const isAvailable = item.availability !== false;
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showFeedbackDetails, setShowFeedbackDetails] = useState(false);
  const [isAddedAnimation, setIsAddedAnimation] = useState(false);

  // Calculate total quantity of this specific item in the cart (regardless of instructions)
  const totalInCart = cart
    .filter((cartItem) => cartItem.item.id === item.id)
    .reduce((sum, cartItem) => sum + cartItem.quantity, 0);

  // Identify the highest feedback reaction to show as the main badge
  const getTopFeedback = () => {
    // If dynamic feedbackStats are available from the database, use them!
    if ((item as any).feedbackStats) {
      const stats = (item as any).feedbackStats;
      const pct = stats.percentage;
      if (stats.rating === "MUST_TRY") return { label: "Must Try", icon: <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />, pct };
      if (stats.rating === "VERY_TASTY") return { label: "Very Tasty", icon: <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />, pct };
      if (stats.rating === "GOOD") return { label: "Good", icon: <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />, pct };
      return { label: "OK", icon: <Smile className="w-3.5 h-3.5 text-neutral-400" />, pct };
    }

    const { mustTry, veryTasty, good, ok } = item.feedback || { mustTry: 10, veryTasty: 10, good: 10, ok: 1 };
    const maxVal = Math.max(mustTry, veryTasty, good, ok);
    if (maxVal === mustTry) return { label: "Must Try", icon: <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />, pct: mustTry };
    if (maxVal === veryTasty) return { label: "Very Tasty", icon: <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />, pct: veryTasty };
    if (maxVal === good) return { label: "Good", icon: <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />, pct: good };
    return { label: "OK", icon: <Smile className="w-3.5 h-3.5 text-neutral-400" />, pct: ok };
  };

  const topFeedback = getTopFeedback();

  const handleAdd = () => {
    addToCart(item, quantity, instructions.trim());
    
    // Play quick success feedback animation
    setIsAddedAnimation(true);
    setTimeout(() => setIsAddedAnimation(false), 1500);

    // Reset local inputs
    setInstructions("");
    setQuantity(1);
  };

  return (
    <motion.div 
      layout
      className={`glass-card rounded-3xl overflow-hidden flex flex-col w-full relative transition-all duration-300 border border-white/[0.05] ${
        !isAvailable ? "opacity-60 saturate-50" : ""
      }`}
    >
      {/* Visual Header / Image Container */}
      <div className="h-44 w-full relative bg-neutral-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          loading="lazy"
        />
        {/* Image overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121211] via-transparent to-transparent opacity-80" />

        {!isAvailable && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none">
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-full font-black uppercase tracking-widest text-[11px] shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              Not Available Today
            </span>
          </div>
        )}

        {/* Veg/Non-veg Dot Badge */}
        <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
          <span className={`w-2.5 h-2.5 rounded-full ${item.veg ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300">
            {item.veg ? "Veg" : "Non-Veg"}
          </span>
        </div>

        {/* Top Reaction Badge */}
        <button
          onClick={() => setShowFeedbackDetails(!showFeedbackDetails)}
          className="absolute top-3 right-3 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 hover:bg-neutral-900 cursor-pointer transition-colors"
        >
          {topFeedback.icon}
          <span className="text-[10px] font-bold text-neutral-200">
            {topFeedback.label} {topFeedback.pct}%
          </span>
        </button>

        {/* Active Quantity Badge in Cart */}
        {totalInCart > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-3 right-3 bg-amber-500 text-neutral-950 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)]"
          >
            {totalInCart}
          </motion.div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h3 className="text-base font-bold text-neutral-100 font-serif leading-tight">
            {item.name}
          </h3>
          <span className="text-base font-bold text-amber-500">
            ₹{item.price}
          </span>
        </div>

        <p className="text-neutral-400 text-xs line-clamp-2 leading-relaxed mb-4">
          {item.description}
        </p>

        {/* Real-time Reaction Details Grid (Expandable) */}
        <AnimatePresence>
          {showFeedbackDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden bg-neutral-950/40 rounded-xl p-3 border border-white/[0.04] mb-4 text-[11px]"
            >
              <h4 className="font-bold text-neutral-400 mb-2 uppercase tracking-widest text-[9px]">
                Community Reactions
              </h4>
              {/* Real-time Reaction Details Grid (Expandable) */}
              <div className="grid grid-cols-1 text-neutral-300">
                {(item as any).feedbackStats ? (
                  <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 text-center leading-relaxed">
                    This dish is rated <span className="text-orange-500 font-extrabold uppercase">{(item as any).feedbackStats.rating.replace('_', ' ')}</span> by <span className="text-orange-500 font-extrabold">{(item as any).feedbackStats.percentage}%</span> of customers (based on {(item as any).feedbackStats.totalCount} recent votes).
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-white/[0.02] p-1.5 rounded-lg">
                      <span className="flex items-center gap-1 text-neutral-400">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Must Try
                      </span>
                      <span className="font-semibold text-amber-400">{(item.feedback || {}).mustTry || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.02] p-1.5 rounded-lg">
                      <span className="flex items-center gap-1 text-neutral-400">
                        <Heart className="w-3 h-3 text-red-500 fill-red-500" /> Very Tasty
                      </span>
                      <span className="font-semibold text-red-500">{(item.feedback || {}).veryTasty || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.02] p-1.5 rounded-lg">
                      <span className="flex items-center gap-1 text-neutral-400">
                        <ThumbsUp className="w-3 h-3 text-emerald-400 fill-emerald-400" /> Good
                      </span>
                      <span className="font-semibold text-emerald-400">{(item.feedback || {}).good || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.02] p-1.5 rounded-lg">
                      <span className="flex items-center gap-1 text-neutral-400">
                        <Smile className="w-3 h-3 text-neutral-400" /> OK
                      </span>
                      <span className="font-semibold text-neutral-400">{(item.feedback || {}).ok || 0}%</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customizer Instructions Input */}
        <div className="relative mb-4">
          <span className="absolute left-2.5 top-2.5 text-neutral-500">
            <MessageSquareText className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Add special instructions (e.g. less spicy)..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={!isAvailable}
            className="w-full text-[11px] py-2.5 pl-8 pr-3 rounded-xl bg-black/40 border border-white/5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          />
        </div>

        {/* Add and Quantity Controls Container */}
        <div className="flex items-center gap-2 mt-auto">
          {/* Custom Quantity Stepper for local add state */}
          <div className={`flex items-center bg-black/40 border border-white/5 rounded-full p-1 transition-opacity duration-300 ${
            !isAvailable ? "opacity-30 pointer-events-none" : ""
          }`}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              disabled={quantity <= 1 || !isAvailable}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-xs font-semibold text-neutral-300">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors"
              disabled={!isAvailable}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleAdd}
            disabled={isAddedAnimation || !isAvailable}
            className={`flex-grow h-9 rounded-full font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer select-none ${
              !isAvailable
                ? "bg-neutral-800 text-neutral-500 border border-white/5 shadow-none cursor-not-allowed"
                : isAddedAnimation
                ? "bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                : "bg-amber-500 text-neutral-950 hover:bg-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            }`}
          >
            {isAddedAnimation ? (
              <>
                <Check className="w-4.5 h-4.5 stroke-[3]" />
                Added
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
