"use client";

import React, { Component, ErrorInfo, ReactNode, Suspense } from "react";
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
  // Center and scale scene automatically
  return <primitive object={scene} scale={1.8} />;
}

export default function ModelViewer({ url, fallbackImage }: { url: string; fallbackImage?: string }) {
  const fallbackUI = (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm p-6 text-center select-none z-10">
      {fallbackImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackImage}
          alt="Fallback dish preview"
          className="w-36 h-36 object-cover rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(239,68,68,0.1)] mb-4 opacity-75"
        />
      ) : (
        <div className="w-36 h-36 bg-neutral-900 rounded-2xl flex items-center justify-center border border-white/5 mb-4 shadow-lg shadow-black/50">
          <Layers className="w-10 h-10 text-neutral-600 animate-pulse" />
        </div>
      )}
      <span className="text-red-400 font-black uppercase tracking-widest text-[10px] bg-red-950/20 px-3 py-1.5 rounded-full border border-red-500/20 shadow-lg shadow-red-950/20">
        3D preview unavailable
      </span>
      <p className="text-[10px] text-neutral-500 mt-2 font-medium">
        The 3D model could not be loaded or processed.
      </p>
    </div>
  );

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
