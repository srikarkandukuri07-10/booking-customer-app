"use client";

import React, { Component, ErrorInfo, ReactNode, Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import { Layers, Utensils } from "lucide-react";

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

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.8} />;
}

// 3D Simulated Hologram Fallback Component
function Fallback3DViewer({ fallbackImage }: { fallbackImage?: string }) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - rotate.y, y: e.clientY - rotate.x });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newY = e.clientX - startPos.x;
    const newX = e.clientY - startPos.y;
    // Limit rotation tilt angle
    setRotate({
      x: Math.max(-30, Math.min(30, newX)),
      y: Math.max(-60, Math.min(60, newY))
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 p-6 text-center select-none z-10 rounded-2xl">
      {fallbackImage ? (
        <div 
          className="relative w-48 h-48 cursor-grab active:cursor-grabbing preserve-3d touch-none mb-4 flex items-center justify-center"
          style={{
            transform: `perspective(800px) rotateX(${-rotate.x}deg) rotateY(${rotate.y}deg)`,
            transition: isDragging ? "none" : "transform 0.5s ease-out"
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fallbackImage}
            alt="3D Hologram Fallback"
            className="w-full h-full object-contain rounded-2xl drop-shadow-[0_15px_30px_rgba(245,158,11,0.2)] border border-white/10 bg-neutral-900/30"
            draggable={false}
          />
        </div>
      ) : (
        <div className="w-36 h-36 bg-neutral-900 rounded-2xl flex items-center justify-center border border-white/5 mb-4 shadow-lg shadow-black/50">
          <Layers className="w-10 h-10 text-neutral-600 animate-pulse" />
        </div>
      )}
      <span className="text-amber-500 font-black uppercase tracking-widest text-[9px] bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 shadow-lg shadow-amber-950/20">
        3D preview fallback
      </span>
      <p className="text-[10px] text-neutral-400 mt-2 font-medium">
        Drag image to rotate dish in simulated 3D space
      </p>
    </div>
  );
}

export default function ModelViewer({ url, fallbackImage }: { url: string; fallbackImage?: string }) {
  const fallbackUI = <Fallback3DViewer fallbackImage={fallbackImage} />;

  if (!url) {
    return fallbackUI;
  }

  return (
    <div className="relative w-full h-full bg-neutral-950 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
      <ErrorBoundary fallback={fallbackUI}>
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
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 12, 5]} intensity={1.2} castShadow />
            <directionalLight position={[-5, 5, -5]} intensity={0.6} />
            <pointLight position={[0, 4, 0]} intensity={0.8} />
            <Center>
              <Model url={url} />
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
