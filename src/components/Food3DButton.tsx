"use client";

import React from "react";
import { Layers } from "lucide-react";

interface Food3DButtonProps {
  has3dView: boolean;
  onClick: () => void;
}

export default function Food3DButton({ has3dView, onClick }: Food3DButtonProps) {
  if (has3dView) {
    return (
      <button
        onClick={onClick}
        aria-label="View food item in 3D"
        className="text-[10px] text-amber-500 hover:text-amber-400 font-bold tracking-wide flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-full transition-colors border border-amber-500/20 cursor-pointer active:scale-95 transition-all"
      >
        <Layers className="w-3 h-3" />
        3D View
      </button>
    );
  }

  return (
    <button
      disabled
      aria-label="3D model coming soon"
      className="text-[10px] text-neutral-500 font-bold tracking-wide flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1.5 rounded-full border border-neutral-800 cursor-not-allowed opacity-50"
    >
      <Layers className="w-3 h-3" />
      3D model coming soon
    </button>
  );
}
