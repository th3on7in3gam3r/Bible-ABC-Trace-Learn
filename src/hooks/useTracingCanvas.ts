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
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [targetPointsState, setTargetPointsState] = useState<TracingPoint[]>([]);
  const [particles, setParticles] = useState<TracingParticle[]>([]);
  const [strokes, setStrokes] = useState<PointerPosition[][]>([]);
  const [redoStack, setRedoStack] = useState<PointerPosition[][]>([]);
  const [cursorPos, setCursorPos] = useState<PointerPosition | null>(null);
  const [hasPlayedSuccess, setHasPlayedSuccess] = useState(false);
  const currentStrokeRef = useRef<PointerPosition[]>([]);
  const lastPosRef = useRef<PointerPosition | null>(null);
  const isDrawingRef = useRef(false);
  const particleIdRef = useRef(0);

  const config = TRACE_CONFIG[difficulty];

  const playSoundEffect = useCallback((type: 'start' | 'success' | 'magic') => {
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
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.05);
        gain.gain.linearRampToValueAtTime(soundVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'magic') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.5, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }, [soundVolume]);

  const addParticle = useCallback((x: number, y: number) => {
    const id = particleIdRef.current++;
    setParticles(prev => [...prev.slice(-15), { id, x, y }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  }, []);

  const pointSegmentDistanceSq = useCallback((pt: TracingPoint, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      const px = pt.x - a.x;
      const py = pt.y - a.y;
      return px * px + py * py;
    }

    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (dx * dx + dy * dy)));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const px = pt.x - projX;
    const py = pt.y - projY;
    return px * px + py * py;
  }, []);

  const markPointsAlongSegment = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const radiusSq = config.radius * config.radius;
    let hitCount = 0;

    setTargetPointsState(prev => {
      const next = prev.map(pt => {
        if (pt.hit) {
          hitCount += 1;
          return pt;
        }
        const distanceSq = pointSegmentDistanceSq(pt, from, to);
        if (distanceSq <= radiusSq) {
          hitCount += 1;
          return { ...pt, hit: true };
        }
        return pt;
      });

      const nextCoverage = next.length > 0 ? (hitCount / next.length) * 100 : 0;
      setCoverage(nextCoverage);
      onCoverageChange?.(nextCoverage);
      return next;
    });
  }, [config.radius, onCoverageChange, pointSegmentDistanceSq]);

  const updateCoverage = useCallback((x: number, y: number) => {
    const pos = { x, y };
    const prev = lastPosRef.current;
    if (prev) {
      markPointsAlongSegment(prev, pos);
    } else {
      markPointsAlongSegment(pos, pos);
    }

    if (isDrawingRef.current) {
      addParticle(x, y);
    }
  }, [addParticle, markPointsAlongSegment]);

  const getPos = useCallback((e: CanvasPointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const redrawFromStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    let hitCount = 0;
    const nextPoints = targetPointsState.map(pt => ({ ...pt, hit: false }));

    strokes.forEach(stroke => {
      for (let i = 1; i < stroke.length; i += 1) {
        const from = stroke[i - 1];
        const to = stroke[i];
        nextPoints.forEach((pt, index) => {
          if (!pt.hit && pointSegmentDistanceSq(pt, from, to) <= config.radius * config.radius) {
            nextPoints[index] = { ...pt, hit: true };
          }
        });
      }
    });

    hitCount = nextPoints.filter(pt => pt.hit).length;
    const nextCoverage = nextPoints.length > 0 ? (hitCount / nextPoints.length) * 100 : 0;
    setTargetPointsState(nextPoints);
    setCoverage(nextCoverage);
    onCoverageChange?.(nextCoverage);

    renderTemplate(ctx, width, height, nextCoverage);

    strokes.forEach(stroke => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = config.lineWidth;
      ctx.strokeStyle = darkMode ? '#60a5fa' : '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.shadowColor = darkMode ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.5)';
      stroke.forEach(pos => ctx.lineTo(pos.x, pos.y));
      ctx.stroke();
    });
  }, [config.lineWidth, config.radius, darkMode, onCoverageChange, pointSegmentDistanceSq, renderTemplate, strokes, targetPointsState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const points = generateTargetPoints(width, height);
    setTargetPointsState(points);
    setCoverage(0);
    setHasPlayedSuccess(false);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderTemplate(ctx, width, height, 0);
  }, [generateTargetPoints, renderTemplate]);

  useEffect(() => {
    redrawFromStrokes();
  }, [redrawFromStrokes]);

  const isReady = coverage >= config.threshold;

  useEffect(() => {
    if (isReady && hasStarted && !hasPlayedSuccess) {
      playSoundEffect('success');
      setHasPlayedSuccess(true);
      onReadyChange?.(true);
    }
  }, [isReady, hasStarted, hasPlayedSuccess, onReadyChange, playSoundEffect]);

  const startDrawing = useCallback((e: CanvasPointerEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    isDrawingRef.current = true;
    setCursorPos(pos);
    currentStrokeRef.current = [pos];
    lastPosRef.current = pos;
    if (!hasStarted) {
      playSoundEffect('start');
    }
    setHasStarted(true);
    updateCoverage(pos.x, pos.y);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = config.lineWidth;
      ctx.strokeStyle = darkMode ? '#60a5fa' : '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.shadowColor = darkMode ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.5)';
    }
  }, [config.lineWidth, darkMode, getPos, hasStarted, playSoundEffect, updateCoverage]);

  const draw = useCallback((e: CanvasPointerEvent) => {
    if (!isDrawingRef.current) return;
    const pos = getPos(e);
    setCursorPos(pos);
    const previous = lastPosRef.current ?? pos;
    currentStrokeRef.current.push(pos);
    lastPosRef.current = pos;
    markPointsAlongSegment(previous, pos);
    if (isDrawingRef.current) {
      addParticle(pos.x, pos.y);
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  }, [addParticle, getPos, markPointsAlongSegment]);

  const endDrawing = useCallback(() => {
    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      const completedStroke = [...currentStrokeRef.current];
      setStrokes(prev => [...prev, completedStroke]);
      setRedoStack([]);
      currentStrokeRef.current = [];
    }
    isDrawingRef.current = false;
    setIsDrawing(false);
    setCursorPos(null);
    lastPosRef.current = null;
  }, []);

  const undo = useCallback(() => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [...r, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes(prevStrokes => [...prevStrokes, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const reset = useCallback(() => {
    currentStrokeRef.current = [];
    setStrokes([]);
    setRedoStack([]);
    setIsDrawing(false);
    setCursorPos(null);
    setHasStarted(false);
    setHasPlayedSuccess(false);
    setCoverage(0);
    setTargetPointsState(prev => prev.map(pt => ({ ...pt, hit: false })));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderTemplate(ctx, canvas.width, canvas.height, 0);
  }, [renderTemplate]);

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
