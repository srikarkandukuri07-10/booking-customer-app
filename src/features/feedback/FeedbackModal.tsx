"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, ThumbsUp, Smile, X, Check, MessageSquare } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: any[];
  onFeedbackSubmitted: () => void;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  menuItems,
  onFeedbackSubmitted,
}: FeedbackModalProps) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedRating, setSelectedRating] = useState<"MUST_TRY" | "VERY_TASTY" | "GOOD" | "OK" | "">("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ratings = [
    { value: "MUST_TRY", label: "Must Try", icon: Star, color: "text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10", activeColor: "bg-amber-500 text-neutral-950 border-amber-500" },
    { value: "VERY_TASTY", label: "Very Tasty", icon: Heart, color: "text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500/10", activeColor: "bg-red-500 text-white border-red-500" },
    { value: "GOOD", label: "Good", icon: ThumbsUp, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10", activeColor: "bg-emerald-500 text-neutral-950 border-emerald-500" },
    { value: "OK", label: "OK", icon: Smile, color: "text-neutral-400 border-neutral-500/20 bg-neutral-500/5 hover:bg-neutral-500/10", activeColor: "bg-neutral-400 text-neutral-950 border-neutral-400" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !selectedRating) {
      setErrorMsg("Please select a dish and a rating.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const envUrl = process.env.NEXT_PUBLIC_API_URL || "https://booki-admin-backend.vercel.app";
      const backendUrl = (envUrl.startsWith("http://localhost") || envUrl.startsWith("http://127.0.0.1")) 
        ? envUrl.replace("http://", "https://") 
        : envUrl;

      const res = await fetch(`${backendUrl}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: selectedRating,
          comment: comment.trim(),
          menuItemId: selectedItemId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setSelectedItemId("");
          setSelectedRating("");
          setComment("");
          onFeedbackSubmitted();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(data.error || "Failed to submit feedback.");
      }
    } catch (err) {
      setErrorMsg("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10 p-6 bg-[#121211] text-left"
          >
            {/* Success view */}
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-bounce">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="text-xl font-bold text-neutral-100 font-serif">Thank You!</h3>
                <p className="text-sm text-neutral-400">Your review was logged successfully.</p>
              </div>
            ) : (
              /* Submission Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                    <h2 className="text-lg font-bold text-neutral-100 font-serif">Share Your Review</h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-white/5 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                {/* Dropdown: Select Food Item */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Select the Dish
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4.5 py-3 text-sm text-neutral-200 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>-- Choose a Dish --</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating Stepper Options */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    How was it?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ratings.map((rate) => {
                      const Icon = rate.icon;
                      const isSelected = selectedRating === rate.value;
                      return (
                        <button
                          key={rate.value}
                          type="button"
                          onClick={() => setSelectedRating(rate.value as any)}
                          className={`flex items-center gap-2.5 px-3 py-3 border rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer select-none ${
                            isSelected ? rate.activeColor : rate.color
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {rate.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Remarks / Suggestions (Optional)
                  </label>
                  <textarea
                    placeholder="Write a brief comment (e.g. delicious sauce, very fresh)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl bg-black/40 border border-white/10 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 resize-none transition-colors"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all"
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
