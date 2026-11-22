/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RaceHUD } from './components/RaceHUD';
import { RacingEngine } from './game/RacingEngine';
import { useMobileLandscape } from './hooks/useMobileLandscape';
import {
  CameraMode,
  Difficulty,
  InputState,
  LIVERY_OPTIONS,
  LiveryOption,
  RaceTelemetry,
  SteeringInputMode,
  SteeringStyle,
  TrackId,
} from './game/types';

const INITIAL_TELEMETRY: RaceTelemetry = {
  phase: 'ready',
  trackId: 'alpine',
  trackName: 'Alpine Club',
  trackLengthMeters: 1050,
  countdownValue: 3,
  speedKmh: 0,
  gear: 'N',
  rpmRatio: 0,
  nitro: 100,
  isBoosting: false,
  isDrifting: false,
  lap: 1,
  totalLaps: 3,
  position: 4,
  totalRacers: 4,
  raceTimeMs: 0,
  currentLapTimeMs: 0,
  bestLapTimeMs: null,
  standings: [],
  minimapMarkers: [],
  wrongWay: false,
  steerAxis: 0,
  isGameOver: false,
  notifications: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RacingEngine | null>(null);

  const [telemetry, setTelemetry] = useState<RaceTelemetry>(INITIAL_TELEMETRY);
  const [minimapPath, setMinimapPath] = useState<Array<{ x: number; y: number }>>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>('alpine');
  const [selectedLivery, setSelectedLivery] = useState<LiveryOption>(LIVERY_OPTIONS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('casual');
  const [laps, setLaps] = useState<number>(3);
  const [steeringStyle, setSteeringStyle] = useState<SteeringStyle>('arcade');
  const [steeringInput, setSteeringInput] = useState<SteeringInputMode>('keyboard');
  const [steeringSensitivity, setSteeringSensitivity] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.7);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [muted, setMuted] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const {
    isTouchDevice,
    isIOS,
    isPortrait,
    canLockOrientation,
    portraitDismissed,
    dismissPortraitPrompt,
    requestLandscape,
  } = useMobileLandscape();

  // Initialize Three.js WebGL RacingEngine once inside isolated ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new RacingEngine(
      mount,
      (t) => setTelemetry(t),
      (lost) => setContextLost(lost)
    );
    engineRef.current = engine;
    setMinimapPath(engine.getMinimapPathPoints());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard input bindings
  useEffect(() => {
    const handleKey = (e: KeyboardEvent, down: boolean) => {
      const engine = engineRef.current;
      if (!engine) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          engine.setInput({ throttle: down });
          break;
        case 'KeyS':
        case 'ArrowDown':
          engine.setInput({ brake: down });
          break;
        case 'KeyA':
        case 'ArrowLeft':
          engine.setInput({ left: down });
          break;
        case 'KeyD':
        case 'ArrowRight':
          engine.setInput({ right: down });
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          engine.setInput({ drift: down });
          break;
        case 'Space':
          e.preventDefault();
          engine.setInput({ boost: down });
          break;
        case 'KeyC':
          if (down && !e.repeat) {
            const next = engine.cycleCameraMode();
            setCameraMode(next);
          }
          break;
        case 'KeyH':
          if (down && !e.repeat) {
            setHudCollapsed((prev) => !prev);
          }
          break;
        case 'KeyP':
        case 'Escape':
          if (down && !e.repeat) {
            setSettingsOpen(false);
            setTrackSelectOpen(false);
            engine.togglePause();
          }
          break;
        case 'KeyR':
          if (down && !e.repeat) {
            setSettingsOpen(false);
            setTrackSelectOpen(false);
            engine.startRace();
          }
          break;
        case 'KeyF':
          if (down && !e.repeat) {
            engine.recoverCarToTrack();
          }
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);
    const onBlur = () => {
      engineRef.current?.setInput({
        throttle: false,
        brake: false,
        left: false,
        right: false,
        drift: false,
        boost: false,
        analogSteer: null,
      });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Mouse Steering listener when steeringInput === 'mouse'
  useEffect(() => {
    const engine = engineRef.current;
    if (steeringInput !== 'mouse') {
      engine?.setInput({ analogSteer: null });
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      if (settingsOpen || trackSelectOpen) return;
      const halfW = window.innerWidth * 0.5 || 1;
      const normX = (e.clientX - halfW) / (halfW * 0.65);
      const clamped = Math.max(-1, Math.min(1, normX));
      // Positive steer is Left (+1), so negate clientX delta, with small center deadzone
      const deadzone = 0.05;
      const steer = Math.abs(clamped) < deadzone ? 0 : -clamped;
      engineRef.current?.setInput({ analogSteer: steer });
    };

    const onMouseDown = (e: MouseEvent) => {
      if (settingsOpen || trackSelectOpen) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, input, a')) return;
      if (e.button === 0) engineRef.current?.setInput({ throttle: true });
      if (e.button === 2) engineRef.current?.setInput({ brake: true });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) engineRef.current?.setInput({ throttle: false });
      if (e.button === 2) engineRef.current?.setInput({ brake: false });
    };

    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('button, input, a')) {
        e.preventDefault();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      engineRef.current?.setInput({ analogSteer: null, throttle: false, brake: false });
    };
  }, [steeringInput, settingsOpen, trackSelectOpen]);

  const handleSelectTrack = useCallback((trackId: TrackId) => {
    setSelectedTrackId(trackId);
    const engine = engineRef.current;
    if (!engine) return;
    engine.setTrack(trackId);
    setMinimapPath(engine.getMinimapPathPoints());
  }, []);

  const handleSelectLivery = useCallback((livery: LiveryOption) => {
    setSelectedLivery(livery);
    engineRef.current?.setPlayerLivery(livery);
  }, []);

  const handleSelectDifficulty = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    engineRef.current?.setDifficulty(diff);
  }, []);

  const handleSelectLaps = useCallback((count: number) => {
    setLaps(count);
    engineRef.current?.setLaps(count);
  }, []);

  const handleSelectSteeringStyle = useCallback((style: SteeringStyle) => {
    setSteeringStyle(style);
    engineRef.current?.setSteeringStyle(style);
  }, []);

  const handleSelectSteeringInput = useCallback((mode: SteeringInputMode) => {
    setSteeringInput(mode);
  }, []);

  const handleSelectSensitivity = useCallback((sens: number) => {
    setSteeringSensitivity(sens);
    engineRef.current?.setSteeringSensitivity(sens);
  }, []);

  const handleChangeVolume = useCallback((vol: number) => {
    setVolume(vol);
    if (vol > 0 && muted) {
      setMuted(false);
      engineRef.current?.setMuted(false);
    } else if (vol === 0 && !muted) {
      setMuted(true);
      engineRef.current?.setMuted(true);
    }
    engineRef.current?.setVolume(vol);
  }, [muted]);

  const handleSelectCamera = useCallback((mode: CameraMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleToggleSettings = useCallback(() => {
    setTrackSelectOpen(false);
    setSettingsOpen((prev) => {
      const next = !prev;
      if (next && (telemetry.phase === 'racing' || telemetry.phase === 'countdown')) {
        engineRef.current?.pauseRace();
      }
      return next;
    });
  }, [telemetry.phase]);

  const handleToggleTrackSelect = useCallback(() => {
    setSettingsOpen(false);
    setTrackSelectOpen((prev) => {
      const next = !prev;
      if (next && (telemetry.phase === 'racing' || telemetry.phase === 'countdown')) {
        engineRef.current?.pauseRace();
      }
      return next;
    });
  }, [telemetry.phase]);

  const handleStartRace = useCallback(() => {
    setSettingsOpen(false);
    setTrackSelectOpen(false);
    if (isTouchDevice) {
      void requestLandscape();
    }
    engineRef.current?.startRace();
  }, [isTouchDevice, requestLandscape]);

  const handlePauseRace = useCallback(() => {
    engineRef.current?.pauseRace();
  }, []);

  const handleResumeRace = useCallback(() => {
    setSettingsOpen(false);
    setTrackSelectOpen(false);
    engineRef.current?.resumeRace();
  }, []);

  const handleRestartRace = useCallback(() => {
    setSettingsOpen(false);
    setTrackSelectOpen(false);
    engineRef.current?.startRace();
  }, []);

  const handleBackToGrid = useCallback(() => {
    setSettingsOpen(false);
    setTrackSelectOpen(false);
    engineRef.current?.resetToGrid();
  }, []);

  const handleRecoverCar = useCallback(() => {
    engineRef.current?.recoverCarToTrack();
    engineRef.current?.resumeRace();
  }, []);

  const handleTouchInput = useCallback((patch: Partial<InputState>) => {
    engineRef.current?.setInput(patch);
  }, []);

  return (
    <div className="relative w-[100dvw] h-[100dvh] overflow-hidden bg-[#0a0c10]">
      {/* Dedicated isolated WebGL canvas mount */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {contextLost && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0a0c10]/95 text-center p-6">
          <div className="max-w-sm border border-white/10 rounded-2xl p-6 bg-slate-900">
            <h2 className="font-display text-xl font-bold text-white">Graphics Context Paused</h2>
            <p className="text-sm text-slate-400 mt-2">
              Your browser temporarily paused WebGL rendering. Reload the page if it does not resume automatically.
            </p>
          </div>
        </div>
      )}

      <RaceHUD
        telemetry={telemetry}
        minimapPath={minimapPath}
        selectedTrackId={selectedTrackId}
        selectedLivery={selectedLivery}
        difficulty={difficulty}
        laps={laps}
        steeringStyle={steeringStyle}
        steeringInput={steeringInput}
        steeringSensitivity={steeringSensitivity}
        volume={volume}
        cameraMode={cameraMode}
        muted={muted}
        hudCollapsed={hudCollapsed}
        settingsOpen={settingsOpen}
        trackSelectOpen={trackSelectOpen}
        isTouchDevice={isTouchDevice}
        isIOS={isIOS}
        isPortrait={isPortrait}
        canLockOrientation={canLockOrientation}
        portraitDismissed={portraitDismissed}
        onRequestLandscape={() => {
          void requestLandscape();
        }}
        onDismissPortrait={dismissPortraitPrompt}
        onSelectTrack={handleSelectTrack}
        onSelectLivery={handleSelectLivery}
        onSelectDifficulty={handleSelectDifficulty}
        onSelectLaps={handleSelectLaps}
        onSelectSteeringStyle={handleSelectSteeringStyle}
        onSelectSteeringInput={handleSelectSteeringInput}
        onSelectSensitivity={handleSelectSensitivity}
        onChangeVolume={handleChangeVolume}
        onSelectCamera={handleSelectCamera}
        onToggleMute={handleToggleMute}
        onToggleCollapse={() => setHudCollapsed((p) => !p)}
        onToggleSettings={handleToggleSettings}
        onCloseSettings={() => setSettingsOpen(false)}
        onToggleTrackSelect={handleToggleTrackSelect}
        onCloseTrackSelect={() => setTrackSelectOpen(false)}
        onStartRace={handleStartRace}
        onPauseRace={handlePauseRace}
        onResumeRace={handleResumeRace}
        onRestartRace={handleRestartRace}
        onBackToGrid={handleBackToGrid}
        onRecoverCar={handleRecoverCar}
        onTouchInput={handleTouchInput}
      />
    </div>
  );
}
