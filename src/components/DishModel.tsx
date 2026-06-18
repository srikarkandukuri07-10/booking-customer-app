"use client";

import React from "react";
import { useGLTF } from "@react-three/drei";

interface DishModelProps {
  url: string;
}

export default function DishModel({ url }: DishModelProps) {
  const { scene } = useGLTF(url);
  
  // Clone to avoid state/mutation issues when the same model is loaded multiple times
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  
  return <primitive object={clonedScene} scale={1.8} />;
}

// Warm up client cache for default placeholder
if (typeof window !== "undefined") {
  useGLTF.preload("/models/default-food.glb");
}
