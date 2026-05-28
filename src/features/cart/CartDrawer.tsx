"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomerOrderStore } from "@/store/useCustomerOrderStore";
import { ShoppingCart, X, Plus, Minus, FileText, ChevronRight, CheckCircle2, CookingPot, Trash2, AlertTriangle, Sparkles } from "lucide-react";
import { MENU_DATA } from "@/data/menuData";

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { 
    cart, 
    selectedTable, 
    updateQuantity, 
    removeFromCart, 
    submitOrder, 
    isSubmitting,
    submitError,
    orders,
    addToCart
  } = useCustomerOrderStore();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    const cartSnapshot = [...cart];
    setLoadingSuggestions(true);
    setSuggestions([]);

    const response = await submitOrder();
    
    if (response.success) {
      setLastPlacedOrderId(response.orderId || null);
      setOrderComplete(true);

      // Fetch dynamic AI food suggestions
      try {
        const suggRes = await fetch("/api/suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ orderedItems: cartSnapshot })
        });
        const suggData = await suggRes.json();
        if (suggData.success && suggData.suggestions) {
          setSuggestions(suggData.suggestions);
        }
      } catch (err) {
        console.warn("⚠️ Failed to load AI recommendations:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    } else {
      setLoadingSuggestions(false);
    }
  };

  const handleCloseComplete = () => {
    setOrderComplete(false);
    setIsOpen(false);
    setLastPlacedOrderId(null);
    setSuggestions([]);
  };

  return (
    <>
      {/* 1. FLOATING STICKY CART BAR TRIGGER */}
      <AnimatePresence>
        {totalItems > 0 && !isOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 left-0 right-0 z-40 px-4 w-full max-w-md mx-auto"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-2xl flex items-center justify-between px-5 font-bold shadow-[0_8px_30px_rgba(245,158,11,0.4)] cursor-pointer transition-all duration-300 transform active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="relative bg-neutral-950/15 p-2 rounded-xl">
                  <ShoppingCart className="w-5 h-5 text-neutral-950" />
                  <span className="absolute -top-1.5 -right-1.5 bg-neutral-950 text-amber-500 text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-amber-500">
                    {totalItems}
                  </span>
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] text-neutral-950/60 uppercase tracking-widest leading-none font-extrabold">
                    Viewing Cart
                  </span>
                  <span className="text-sm font-extrabold mt-0.5">
                    {selectedTable}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold font-mono">
                  ₹{totalAmount}
                </span>
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DRAWER SHEET & BACKDROP */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Dark Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && !orderComplete && setIsOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />

            {/* Slide up Glass Drawer container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 glass-panel rounded-t-[32px] overflow-hidden flex flex-col max-h-[85vh] border-t border-white/10"
            >
              {/* Decorative top handle bar */}
              <div className="w-12 h-1 bg-neutral-700/50 rounded-full mx-auto my-3 flex-shrink-0" />

              {/* A. ORDER COMPLETED SCREEN */}
              {orderComplete ? (
                <div className="p-8 flex flex-col items-center text-center justify-center min-h-[400px]">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 text-emerald-400"
                  >
                    <CheckCircle2 className="w-12 h-12 stroke-[2]" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold font-serif text-white mb-2">
                    Order Sent to Kitchen!
                  </h3>
                  <p className="text-neutral-400 text-sm max-w-xs mb-1">
                    Your delicious meal is now being prepared for
                  </p>
                  <span className="text-amber-500 font-extrabold text-lg uppercase tracking-wide mb-6">
                    {selectedTable}
                  </span>

                  {/* MASSIVE CHECKOUT SUCCESS TOKEN DISPLAY */}
                  {orders[0]?.tokenNumber && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="w-full bg-amber-500/10 border-2 border-amber-500/20 p-5 rounded-3xl flex flex-col items-center justify-center mb-5 shadow-[0_10px_30px_rgba(245,158,11,0.15)] relative overflow-hidden"
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-amber-500/10 rounded-full blur-[25px]" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1 z-10">
                        YOUR QUEUE TOKEN
                      </span>
                      <h2 className="text-6xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10 flex items-baseline">
                        <span className="text-amber-500 text-2xl font-bold mr-1 font-serif">#</span>
                        {orders[0]?.tokenNumber}
                      </h2>
                      <span className="text-[9px] text-neutral-400 mt-2 font-black uppercase tracking-wider z-10">
                        Please remember this number for collection!
                      </span>
                    </motion.div>
                  )}

                  <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-left text-xs mb-4 text-neutral-400 font-mono flex flex-col gap-2.5 flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <span>Order Reference:</span>
                      <span className="text-neutral-200 font-semibold">{lastPlacedOrderId || "ORD-N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Queue Token Number:</span>
                      <span className="text-amber-500 font-black text-sm">
                        #{orders[0]?.tokenNumber || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Status:</span>
                      <span className="text-amber-500 font-bold flex items-center gap-1.5 animate-pulse">
                        <CookingPot className="w-3.5 h-3.5" /> Preparing
                      </span>
                    </div>
                  </div>

                  {/* AI Recommendations section */}
                  {loadingSuggestions ? (
                    <div className="w-full flex flex-col gap-3 mb-6 mt-2 flex-shrink-0">
                      <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" />
                      <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="w-full flex flex-col gap-3 mb-6 text-left border-t border-white/5 pt-4 overflow-y-auto pr-1 no-scrollbar flex-1">
                      <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                        Chef's AI Recommendations
                      </h4>
                      
                      <div className="flex flex-col gap-2.5">
                        {suggestions.map((sug) => {
                          const item = MENU_DATA.find(m => m.id === sug.itemId);
                          if (!item) return null;
                          
                          return (
                            <div key={sug.itemId} className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl flex gap-3 items-start hover:border-amber-500/20 transition-all duration-300">
                              {/* Suggestion Item Image */}
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              
                              <div className="flex-grow flex flex-col gap-0.5 min-w-0">
                                <div className="flex justify-between items-baseline gap-1">
                                  <h5 className="text-xs font-bold text-neutral-200 truncate">{item.name}</h5>
                                  <span className="text-xs font-bold text-amber-500 font-mono">₹{item.price}</span>
                                </div>
                                <p className="text-[10px] text-neutral-400 leading-normal italic mt-0.5">
                                  "{sug.reason}"
                                </p>
                                
                                <button
                                  onClick={() => {
                                    addToCart(item, 1, "AI Recommended Pairing");
                                    handleCloseComplete();
                                  }}
                                  className="mt-2 text-[9px] font-extrabold uppercase bg-amber-500 text-neutral-950 px-2.5 py-1.5 rounded-lg w-fit flex items-center gap-1 cursor-pointer hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/10 active:scale-95 duration-200"
                                >
                                  <Plus className="w-2.5 h-2.5 stroke-[3]" /> Add to Next Order
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <button
                    onClick={handleCloseComplete}
                    className="w-full h-12 bg-white text-neutral-900 rounded-xl font-bold text-xs tracking-wider uppercase cursor-pointer hover:bg-neutral-100 transition-colors flex-shrink-0 mt-auto"
                  >
                    Done & Back to Menu
                  </button>
                </div>
              ) : (
                /* B. STANDARD CART CONTENTS */
                <>
                  {/* Header info */}
                  <div className="px-5 pb-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-neutral-100 font-serif">
                        Your Order Checklist
                      </h3>
                      <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider">
                        {selectedTable}
                      </span>
                    </div>

                    {!isSubmitting && (
                      <button
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>

                  {/* Scrollable list of cart items */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar flex flex-col gap-4">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center text-center py-16 text-neutral-500">
                        <ShoppingCart className="w-12 h-12 mb-3 stroke-[1.5]" />
                        <p className="text-sm font-semibold">Your cart is empty</p>
                        <p className="text-xs text-neutral-600 mt-1 max-w-[200px]">
                          Browse our categories to add tasty food items.
                        </p>
                      </div>
                    ) : (
                      cart.map((cartItem, idx) => (
                        <motion.div
                          key={`${cartItem.item.id}-${idx}-${cartItem.customInstructions}`}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-3 bg-neutral-900/40 p-3 rounded-2xl border border-white/[0.03]"
                        >
                          {/* Mini item image */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={cartItem.item.image} 
                              alt={cartItem.item.name}
                              className="w-full h-full object-cover" 
                            />
                          </div>

                          {/* Item information */}
                          <div className="flex-grow flex flex-col justify-between py-0.5">
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <h4 className="text-sm font-bold text-neutral-200 leading-tight">
                                  {cartItem.item.name}
                                </h4>
                                <span className="text-sm font-bold text-amber-500 font-mono">
                                  ₹{cartItem.item.price * cartItem.quantity}
                                </span>
                              </div>

                              {/* Customization notes */}
                              {cartItem.customInstructions && (
                                <div className="flex items-start gap-1 text-[10px] text-neutral-400 mt-1 italic">
                                  <FileText className="w-3 h-3 text-neutral-500 mt-0.5 flex-shrink-0" />
                                  <span>"{cartItem.customInstructions}"</span>
                                </div>
                              )}
                            </div>

                            {/* Cart Item quantity controls */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 rounded-lg p-0.5">
                                <button
                                  onClick={() => updateQuantity(cartItem.item.id, cartItem.customInstructions, cartItem.quantity - 1)}
                                  disabled={isSubmitting}
                                  className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-5 text-center text-xs font-bold text-neutral-300 font-mono">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(cartItem.item.id, cartItem.customInstructions, cartItem.quantity + 1)}
                                  disabled={isSubmitting}
                                  className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Delete button */}
                              <button
                                onClick={() => removeFromCart(cartItem.item.id, cartItem.customInstructions)}
                                disabled={isSubmitting}
                                className="text-neutral-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Summary & Place Order footer container */}
                  {cart.length > 0 && (
                    <div className="p-5 bg-neutral-950/60 border-t border-white/5 flex-shrink-0 flex flex-col gap-4">
                      {/* Price summary row */}
                      <div className="flex justify-between items-center text-neutral-400 text-xs">
                        <span>Items Subtotal</span>
                        <span className="font-mono text-neutral-300">₹{totalAmount}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-neutral-400 text-xs">
                        <span>GST & Service Charge</span>
                        <span className="font-mono text-emerald-400">Included</span>
                      </div>

                      <div className="flex justify-between items-center border-t border-white/5 pt-3">
                        <span className="text-sm font-bold text-neutral-200">Grand Total</span>
                        <span className="text-xl font-extrabold text-amber-500 font-mono">
                          ₹{totalAmount}
                        </span>
                      </div>

                      {/* Rich Error Alert Banner */}
                      {submitError && (
                        <div className="bg-red-500/10 border border-red-500/15 text-red-400 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-left animate-pulse">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-grow">
                            <span className="font-bold block mb-0.5 text-red-300">Submission Failed</span>
                            <span>{submitError}</span>
                          </div>
                        </div>
                      )}

                      {/* Place Order CTA Button */}
                      <button
                        onClick={handlePlaceOrder}
                        disabled={isSubmitting || cart.length === 0}
                        className="w-full h-14 bg-amber-500 disabled:opacity-40 hover:bg-amber-600 disabled:pointer-events-none text-neutral-950 rounded-2xl font-extrabold text-sm tracking-widest uppercase flex items-center justify-center gap-2.5 shadow-[0_8px_24px_rgba(245,158,11,0.25)] cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                            Sending to Kitchen...
                          </>
                        ) : (
                          <>
                            <CookingPot className="w-5 h-5 stroke-[2.5]" />
                            Place Order
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
