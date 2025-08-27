import { useState, useCallback, useLayoutEffect, useRef } from 'react';

// Types
type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number };
type LayoutPct = {
  innerLeftPct: number;
  innerTopPct: number;
  innerRightPct: number;
  innerBottomPct: number;
  innerWidthPct: number;
  innerHeightPct: number;
};

export function useCoordinateSystem(goalConfig: { width: number; height: number; depth: number }) {
  // DOM refs
  const gameRef = useRef<HTMLDivElement>(null);
  const goalRef = useRef<HTMLDivElement>(null);

  // Layout state
  const [layout, setLayout] = useState<LayoutPct | null>(null);

  // Constants
  const POST_THICKNESS_PX = 16;
  const CROSSBAR_THICKNESS_PX = 16;

  // Measure function
  const measure = useCallback(() => {
    if (!gameRef.current || !goalRef.current) return;

    const game = gameRef.current.getBoundingClientRect();
    const goal = goalRef.current.getBoundingClientRect();

    const inner: Rect = {
      left: goal.left + POST_THICKNESS_PX,
      right: goal.right - POST_THICKNESS_PX,
      top: goal.top + CROSSBAR_THICKNESS_PX,
      bottom: goal.bottom,
      width: goal.width - POST_THICKNESS_PX * 2,
      height: goal.height - CROSSBAR_THICKNESS_PX,
    };

    const toPctX = (px: number) => (px / game.width) * 100;
    const toPctY = (px: number) => (px / game.height) * 100;

    const innerLeftPct = toPctX(inner.left - game.left);
    const innerRightPct = toPctX(inner.right - game.left);
    const innerTopPct = toPctY(inner.top - game.top);
    const innerBottomPct = toPctY(inner.bottom - game.top);
    const innerWidthPct = innerRightPct - innerLeftPct;
    const innerHeightPct = innerBottomPct - innerTopPct;

    setLayout({ innerLeftPct, innerTopPct, innerRightPct, innerBottomPct, innerWidthPct, innerHeightPct });
  }, []);

  // Setup measurement
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (gameRef.current) ro.observe(gameRef.current);
    if (goalRef.current) ro.observe(goalRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);

  // Convert field coordinates to screen percentages
  const fieldToScreen = useCallback((fieldX: number, fieldZ: number, fieldY: number = 0) => {
    if (!layout) return { x: 50, y: 85 };
    const L = layout;
    const halfW = goalConfig.width / 2;

    let xPct: number, yPct: number;

    if (fieldZ <= goalConfig.depth) {
      // Allow outside to show truly wide/over
      const xNorm = (fieldX + halfW) / goalConfig.width;
      const yNorm = fieldY / goalConfig.height;
      xPct = L.innerLeftPct + xNorm * L.innerWidthPct;
      yPct = L.innerBottomPct - yNorm * L.innerHeightPct;
    } else {
      const depthRatio = Math.min(fieldZ / 100, 1);
      const centerXPct = L.innerLeftPct + L.innerWidthPct / 2;
      xPct = centerXPct + (fieldX / halfW) * (L.innerWidthPct / 2);
      yPct = L.innerBottomPct + depthRatio * (100 - L.innerBottomPct)
           - (fieldY / goalConfig.height) * 2;
    }
    return { x: xPct, y: yPct };
  }, [layout, goalConfig]);

  // Convert screen coordinates to field coordinates
  const screenToField = useCallback((clientX: number, clientY: number) => {
    if (!layout || !gameRef.current) return { x: 0, y: 0, z: 0 };
    const L = layout;
    const game = gameRef.current.getBoundingClientRect();

    const clickXPct = ((clientX - game.left) / game.width) * 100;
    const clickYPct = ((clientY - game.top) / game.height) * 100;

    const withinX = clickXPct >= L.innerLeftPct && clickXPct <= L.innerRightPct;
    const withinY = clickYPct >= L.innerTopPct && clickYPct <= L.innerBottomPct;

    const halfW = goalConfig.width / 2;

    if (withinX && withinY) {
      const xNorm = (clickXPct - L.innerLeftPct) / L.innerWidthPct;
      const yNorm = (L.innerBottomPct - clickYPct) / L.innerHeightPct;
      return { x: xNorm * goalConfig.width - halfW, y: yNorm * goalConfig.height, z: 0 };
    }

    if (withinY && !withinX) {
      // True wide (goal plane)
      const xNorm = (clickXPct - L.innerLeftPct) / L.innerWidthPct;
      const yNorm = (L.innerBottomPct - clickYPct) / L.innerHeightPct;
      return { x: xNorm * goalConfig.width - halfW, y: yNorm * goalConfig.height, z: 0 };
    }

    if (clickYPct > L.innerBottomPct) {
      // On the field in front
      const depth = (clickYPct - L.innerBottomPct) / (100 - L.innerBottomPct) * 100;
      const xNormAroundCenter =
        (clickXPct - (L.innerLeftPct + L.innerWidthPct / 2)) / (L.innerWidthPct / 2);
      return { x: xNormAroundCenter * halfW, y: 0, z: Math.max(0, Math.min(depth, 100)) };
    }

    // Above the crossbar (goal plane)
    const xNorm = (clickXPct - L.innerLeftPct) / L.innerWidthPct;
    const overYN = (L.innerTopPct - clickYPct) / L.innerHeightPct;
    return {
      x: xNorm * goalConfig.width - halfW,
      y: goalConfig.height + overYN * 50,
      z: 0,
    };
  }, [layout, goalConfig]);

  // Check if coordinates are in goal
  const isInGoal = useCallback((x: number, y: number, z: number) => {
    const halfW = goalConfig.width / 2;
    return Math.abs(x) <= halfW && y >= 0 && y <= goalConfig.height && z <= goalConfig.depth;
  }, [goalConfig]);

  // Convert target to chart position
  const targetToChartPosition = useCallback((target: { x: number; y: number; z: number }) => {
    const halfWidth = goalConfig.width / 2;
    const xPercent = ((target.x + halfWidth) / goalConfig.width) * 100;
    const yPercent = ((goalConfig.height - target.y) / goalConfig.height) * 100;
    return { x: Math.max(0, Math.min(100, xPercent)), y: Math.max(0, Math.min(100, yPercent)) };
  }, [goalConfig]);

  return {
    // Refs
    gameRef,
    goalRef,
    
    // State
    layout,
    
    // Functions
    fieldToScreen,
    screenToField,
    isInGoal,
    targetToChartPosition,
  };
}
