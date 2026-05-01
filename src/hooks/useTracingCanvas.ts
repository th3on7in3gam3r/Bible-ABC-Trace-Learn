import { useState, useRef, useEffect, useCallback, RefObject, PointerEvent } from 'react';
import { TRACE_CONFIG } from '../types';
import type { DifficultyLevel, TracingPoint, TracingParticle } from '../types';

type PointerPosition = { x: number; y: number };
type CanvasPointerEvent = PointerEvent<HTMLCanvasElement>;
type SoundEffectType = 'start' | 'success' | 'magic';

interface UseTracingCanvasArgs {
  difficulty?: DifficultyLevel;
  darkMode?: boolean;
  soundVolume?: number;
  soundEnabled?: boolean;
  renderTemplate: (ctx: CanvasRenderingContext2D, width: number, height: number, coverage: number) => void;
  generateTargetPoints: (width: number, height: number) => TracingPoint[];
  onReadyChange?: (isReady: boolean) => void;
  onCoverageChange?: (coverage: number) => void;
}

interface UseTracingCanvasResult {
  canvasRef: RefObject<HTMLCanvasElement>;
  coverage: number;
  isReady: boolean;
  targetPointsState: TracingPoint[];
  particles: TracingParticle[];
  cursorPos: PointerPosition | null;
  isDrawing: boolean;
  startDrawing: (e: CanvasPointerEvent) => void;
  draw: (e: CanvasPointerEvent) => void;
  endDrawing: () => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  playSoundEffect: (type: SoundEffectType) => void;
}

export function useTracingCanvas({
  difficulty = 'medium',
  darkMode = false,
  soundVolume = 0.5,
  soundEnabled = true,
  renderTemplate,
  generateTargetPoints,
  onReadyChange,
  onCoverageChange,
}: UseTracingCanvasArgs): UseTracingCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // All mutable drawing state lives in refs — no re-renders during active drawing
  const isDrawingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const lastPosRef = useRef<PointerPosition | null>(null);
  const currentStrokeRef = useRef<PointerPosition[]>([]);
  const strokesRef = useRef<PointerPosition[][]>([]);
  const redoStackRef = useRef<PointerPosition[][]>([]);
  const targetPointsRef = useRef<TracingPoint[]>([]);
  const coverageRef = useRef(0);
  const hasPlayedSuccessRef = useRef(false);
  const particleIdRef = useRef(0);

  // React state — only updated when we need a UI re-render
  const [isDrawing, setIsDrawing] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [targetPointsState, setTargetPointsState] = useState<TracingPoint[]>([]);
  const [particles, setParticles] = useState<TracingParticle[]>([]);
  const [cursorPos, setCursorPos] = useState<PointerPosition | null>(null);
  const [strokeVersion, setStrokeVersion] = useState(0); // bumped only on undo/redo/reset

  const config = TRACE_CONFIG[difficulty];

  // ─── Sound ───────────────────────────────────────────────────────────────
  const playSoundEffect = useCallback((type: SoundEffectType) => {
    if (!soundEnabled || soundVolume <= 0) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.linearRampToValueAtTime(soundVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.05);
        gain.gain.linearRampToValueAtTime(soundVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'magic') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.5, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      }
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }, [soundEnabled, soundVolume]);

  // ─── Particles ───────────────────────────────────────────────────────────
  const addParticle = useCallback((x: number, y: number) => {
    const id = particleIdRef.current++;
    setParticles(prev => [...prev.slice(-20), { id, x, y }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 900);
  }, []);

  // ─── Point-segment distance (for coverage) ───────────────────────────────
  const pointSegmentDistanceSq = useCallback((
    pt: TracingPoint,
    a: PointerPosition,
    b: PointerPosition,
  ): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      return (pt.x - a.x) ** 2 + (pt.y - a.y) ** 2;
    }
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (dx * dx + dy * dy)));
    return (pt.x - (a.x + t * dx)) ** 2 + (pt.y - (a.y + t * dy)) ** 2;
  }, []);

  // ─── Hit-test a segment against target points (mutates ref, no setState) ─
  const hitTestSegment = useCallback((from: PointerPosition, to: PointerPosition) => {
    const radiusSq = config.radius * config.radius;
    let changed = false;
    const pts = targetPointsRef.current;
    for (let i = 0; i < pts.length; i++) {
      if (!pts[i].hit && pointSegmentDistanceSq(pts[i], from, to) <= radiusSq) {
        pts[i] = { ...pts[i], hit: true };
        changed = true;
      }
    }
    if (changed) {
      const hitCount = pts.filter(p => p.hit).length;
      const newCoverage = pts.length > 0 ? (hitCount / pts.length) * 100 : 0;
      coverageRef.current = newCoverage;
      setCoverage(newCoverage);
      onCoverageChange?.(newCoverage);
      // Sync React state for dot overlay (throttled — only when something changed)
      setTargetPointsState([...pts]);

      // Fire ready callback once
      const isReady = newCoverage >= config.threshold;
      if (isReady && !hasPlayedSuccessRef.current) {
        hasPlayedSuccessRef.current = true;
        playSoundEffect('success');
        onReadyChange?.(true);
      }
    }
  }, [config.radius, config.threshold, onCoverageChange, onReadyChange, playSoundEffect, pointSegmentDistanceSq]);

  // ─── Canvas helpers ───────────────────────────────────────────────────────
  const getPos = useCallback((e: CanvasPointerEvent): PointerPosition => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const applyStrokeStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = config.lineWidth;
    ctx.strokeStyle = darkMode ? '#60a5fa' : '#3b82f6';
    ctx.shadowBlur = 12;
    ctx.shadowColor = darkMode ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.5)';
  }, [config.lineWidth, darkMode]);

  // ─── Full redraw (used only for undo/redo/reset) ──────────────────────────
  const fullRedraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Recompute coverage from scratch
    const pts = targetPointsRef.current.map(p => ({ ...p, hit: false }));
    const strokes = strokesRef.current;

    strokes.forEach(stroke => {
      for (let i = 1; i < stroke.length; i++) {
        const radiusSq = config.radius * config.radius;
        for (let j = 0; j < pts.length; j++) {
          if (!pts[j].hit && pointSegmentDistanceSq(pts[j], stroke[i - 1], stroke[i]) <= radiusSq) {
            pts[j] = { ...pts[j], hit: true };
          }
        }
      }
    });

    targetPointsRef.current = pts;
    const hitCount = pts.filter(p => p.hit).length;
    const newCoverage = pts.length > 0 ? (hitCount / pts.length) * 100 : 0;
    coverageRef.current = newCoverage;
    setCoverage(newCoverage);
    setTargetPointsState([...pts]);
    onCoverageChange?.(newCoverage);

    // Draw template (fades with coverage)
    renderTemplate(ctx, canvas.width, canvas.height, newCoverage);

    // Redraw all strokes on top
    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      applyStrokeStyle(ctx);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }, [applyStrokeStyle, config.radius, onCoverageChange, pointSegmentDistanceSq, renderTemplate]);

  // ─── Initialise canvas when template/points change ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = generateTargetPoints(canvas.width, canvas.height);
    targetPointsRef.current = pts;
    coverageRef.current = 0;
    hasPlayedSuccessRef.current = false;
    strokesRef.current = [];
    redoStackRef.current = [];
    currentStrokeRef.current = [];
    hasStartedRef.current = false;

    setCoverage(0);
    setTargetPointsState([...pts]);
    setStrokeVersion(0);

    renderTemplate(ctx, canvas.width, canvas.height, 0);
  }, [generateTargetPoints, renderTemplate]);

  // ─── Full redraw triggered by undo/redo/reset ─────────────────────────────
  useEffect(() => {
    if (strokeVersion > 0) fullRedraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeVersion]);

  // ─── Pointer events ───────────────────────────────────────────────────────
  const startDrawing = useCallback((e: CanvasPointerEvent) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const pos = getPos(e);

    isDrawingRef.current = true;
    setIsDrawing(true);
    setCursorPos(pos);
    currentStrokeRef.current = [pos];
    lastPosRef.current = pos;

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      playSoundEffect('start');
    }

    // Hit-test the single point
    hitTestSegment(pos, pos);

    // Begin live canvas path
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      applyStrokeStyle(ctx);
    }
  }, [applyStrokeStyle, getPos, hitTestSegment, playSoundEffect]);

  const draw = useCallback((e: CanvasPointerEvent) => {
    if (!isDrawingRef.current) return;
    const pos = getPos(e);
    const prev = lastPosRef.current ?? pos;

    setCursorPos(pos);
    currentStrokeRef.current.push(pos);
    lastPosRef.current = pos;

    // Hit-test the new segment
    hitTestSegment(prev, pos);
    addParticle(pos.x, pos.y);

    // Draw the segment live — no clear, no redraw
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      // Keep path open for next segment
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      applyStrokeStyle(ctx);
    }
  }, [addParticle, applyStrokeStyle, getPos, hitTestSegment]);

  const endDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current = [...strokesRef.current, [...currentStrokeRef.current]];
      redoStackRef.current = [];
      currentStrokeRef.current = [];
    }
    isDrawingRef.current = false;
    setIsDrawing(false);
    setCursorPos(null);
    lastPosRef.current = null;

    // Redraw template with updated coverage so guide fades correctly
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cov = coverageRef.current;
    renderTemplate(ctx, canvas.width, canvas.height, cov);
    // Redraw all strokes on top of the refreshed template
    strokesRef.current.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      applyStrokeStyle(ctx);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }, [applyStrokeStyle, renderTemplate]);

  // ─── Undo / Redo / Reset ─────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const last = strokesRef.current[strokesRef.current.length - 1];
    redoStackRef.current = [...redoStackRef.current, last];
    strokesRef.current = strokesRef.current.slice(0, -1);
    hasPlayedSuccessRef.current = false;
    setStrokeVersion(v => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const last = redoStackRef.current[redoStackRef.current.length - 1];
    strokesRef.current = [...strokesRef.current, last];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    setStrokeVersion(v => v + 1);
  }, []);

  const reset = useCallback(() => {
    strokesRef.current = [];
    redoStackRef.current = [];
    currentStrokeRef.current = [];
    isDrawingRef.current = false;
    hasStartedRef.current = false;
    hasPlayedSuccessRef.current = false;
    lastPosRef.current = null;
    coverageRef.current = 0;

    // Reset all points to unhit
    targetPointsRef.current = targetPointsRef.current.map(p => ({ ...p, hit: false }));

    setIsDrawing(false);
    setCursorPos(null);
    setCoverage(0);
    setTargetPointsState([...targetPointsRef.current]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderTemplate(ctx, canvas.width, canvas.height, 0);
  }, [renderTemplate]);

  const isReady = coverage >= config.threshold;

  return {
    canvasRef,
    coverage,
    isReady,
    targetPointsState,
    particles,
    cursorPos,
    isDrawing,
    startDrawing,
    draw,
    endDrawing,
    reset,
    undo,
    redo,
    playSoundEffect,
  };
}
