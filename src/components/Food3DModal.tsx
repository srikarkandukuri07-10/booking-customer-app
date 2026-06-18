"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MenuItem } from "@/types";
import { X, RefreshCw, Move } from "lucide-react";
import { motion } from "framer-motion";

// Lazy load ModelViewer with SSR disabled to prevent Server-Side ThreeJS errors
const ModelViewer = dynamic(() => import("./ModelViewer"), { ssr: false });

interface Food3DModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

export default function Food3DModal({ item, isOpen, onClose }: Food3DModalProps) {
  const [resetKey, setResetKey] = useState(0);

  // Accessibility escape key listener and scrolling management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    
    // Lock scrolling on viewport
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121211]/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-lg aspect-square sm:max-h-[85vh] bg-[#121211] border border-white/10 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl relative"
      >
        {/* Header container */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div>
            <h3 id="modal-title" className="text-sm font-bold text-amber-500 uppercase tracking-wider font-serif">
              3D preview: {item.name}
            </h3>
            {item.model3dUrl && (
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Drag to rotate, pinch to zoom, right-click/two-finger drag to pan
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close 3D viewer"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D viewport wrapper */}
        <div className="flex-grow relative p-4 min-h-[300px]">
          <ModelViewer
            key={resetKey}
            url={item.model3dUrl || ""}
          />

          {/* User interaction HUD overlay */}
          {item.model3dUrl && (
            <div className="absolute bottom-6 left-6 bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 pointer-events-none select-none text-[9px] text-neutral-400 font-semibold shadow-lg">
              <Move className="w-3.5 h-3.5 text-amber-500" />
              <span>Interactive Space</span>
            </div>
          )}
        </div>

        {/* Footer controls container */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/40">
          {item.model3dUrl ? (
            <button
              onClick={() => setResetKey((prev) => prev + 1)}
              aria-label="Reset 3D camera position"
              className="text-[10px] text-neutral-300 hover:text-white font-bold flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Position
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="text-[10px] text-neutral-950 font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
