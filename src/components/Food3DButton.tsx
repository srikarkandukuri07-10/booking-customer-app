"use client";

import React from "react";
import { Layers } from "lucide-react";

interface Food3DButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function Food3DButton({ onClick, disabled }: Food3DButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[10px] text-amber-500 hover:text-amber-400 font-bold tracking-wide flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-full transition-colors border border-amber-500/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
    >
      <Layers className="w-3 h-3" />
      3D View
    </button>
  );
}
