"use client";

import React, { Component, ErrorInfo, ReactNode, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import { Utensils, AlertCircle } from "lucide-react";
import DishModel from "./DishModel";

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ThreeJS Model Loader Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Sleek placeholder when model is not available
export function ModelComingSoon() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 p-6 text-center select-none rounded-2xl border border-white/5">
      <span className="text-amber-500 font-black uppercase tracking-widest text-[10px] bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 shadow-lg shadow-amber-950/20">
        3D model coming soon
      </span>
      <p className="text-[10px] text-neutral-400 mt-3 max-w-[240px] font-medium leading-relaxed">
        Our culinary artists are crafting the high-fidelity 3D model for this dish. Check back soon!
      </p>
    </div>
  );
}

// Error UI fallback if loading the GLB fails
function ErrorFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 p-6 text-center select-none rounded-2xl border border-white/5">
      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
      <span className="text-red-500 font-black uppercase tracking-widest text-[10px] bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
        Failed to load 3D model
      </span>
      <p className="text-[10px] text-neutral-500 mt-2 font-medium">
        There was an error loading the 3D asset. Please try again.
      </p>
    </div>
  );
}

export default function ModelViewer({ url }: { url: string; fallbackImage?: string }) {
  if (!url) {
    return <ModelComingSoon />;
  }

  return (
    <div className="relative w-full h-full bg-neutral-950 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense
          fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/80 z-20 select-none">
              <div className="relative flex items-center justify-center">
                <span className="w-9 h-9 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin" />
                <Utensils className="absolute w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest text-neutral-400">
                Loading 3D Dish...
              </span>
            </div>
          }
        >
          <Canvas camera={{ position: [0, 1.5, 3.5], fov: 45 }}>
            <ambientLight intensity={1.0} />
            <directionalLight position={[5, 12, 5]} intensity={1.2} castShadow />
            <directionalLight position={[-5, 5, -5]} intensity={0.6} />
            <pointLight position={[0, 4, 0]} intensity={0.8} />
            <Center>
              <DishModel url={url} />
            </Center>
            <OrbitControls
              enableDamping
              dampingFactor={0.06}
              minDistance={1.2}
              maxDistance={7}
              makeDefault
            />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
