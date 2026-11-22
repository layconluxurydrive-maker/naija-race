export type GamePhase = 'ready' | 'countdown' | 'racing' | 'paused' | 'finished';

export type CameraMode = 'chase' | 'hood' | 'far';

export type Difficulty = 'casual' | 'pro';

export type SteeringStyle = 'grip' | 'arcade' | 'drift';

export type SteeringInputMode = 'keyboard' | 'mouse' | 'onscreen';

export interface RaceSettings {
  laps: number;
  difficulty: Difficulty;
  steeringStyle: SteeringStyle;
  steeringInput: SteeringInputMode;
  steeringSensitivity: number;
  volume: number;
  muted: boolean;
}

export interface LiveryOption {
  id: string;
  name: string;
  primaryHex: string;
  accentHex: string;
  colorValue: number;
  accentValue: number;
}

export const LIVERY_OPTIONS: LiveryOption[] = [
  {
    id: 'crimson',
    name: 'Scuderia Red',
    primaryHex: '#DC2626',
    accentHex: '#F59E0B',
    colorValue: 0xdc2626,
    accentValue: 0xf59e0b,
  },
  {
    id: 'cobalt',
    name: 'Cobalt Works',
    primaryHex: '#2563EB',
    accentHex: '#38BDF8',
    colorValue: 0x2563eb,
    accentValue: 0x38bdf8,
  },
  {
    id: 'emerald',
    name: 'British Racing',
    primaryHex: '#059669',
    accentHex: '#FBBF24',
    colorValue: 0x059669,
    accentValue: 0xfbbf24,
  },
  {
    id: 'obsidian',
    name: 'Carbon Gold',
    primaryHex: '#1E293B',
    accentHex: '#F59E0B',
    colorValue: 0x1e293b,
    accentValue: 0xf59e0b,
  },
];

export interface RacerStandingsEntry {
  id: string;
  name: string;
  colorHex: string;
  isPlayer: boolean;
  position: number;
  lap: number;
  totalProgress: number;
  finished: boolean;
  finishTimeMs: number | null;
}

export interface MinimapMarker {
  id: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  colorHex: string;
  isPlayer: boolean;
}

export type TrackId = 'alpine' | 'coastal' | 'canyon' | 'midnight';

export interface TrackSummary {
  id: TrackId;
  name: string;
  subtitle: string;
  targetLengthMeters: number;
  styleTag: string;
  accentHex: string;
  previewPoints: Array<{ x: number; y: number }>;
}

export interface FinishNotification {
  id: string;
  racerId: string;
  name: string;
  colorHex: string;
  position: number;
  finishTimeMs: number;
  timestamp: number;
}

export interface RaceTelemetry {
  phase: GamePhase;
  trackId: TrackId;
  trackName: string;
  trackLengthMeters: number;
  countdownValue: number; // 3, 2, 1, 0 (GO)
  speedKmh: number;
  gear: string;
  rpmRatio: number; // 0..1
  nitro: number; // 0..100
  isBoosting: boolean;
  isDrifting: boolean;
  lap: number;
  totalLaps: number;
  position: number;
  totalRacers: number;
  raceTimeMs: number;
  currentLapTimeMs: number;
  bestLapTimeMs: number | null;
  standings: RacerStandingsEntry[];
  minimapMarkers: MinimapMarker[];
  wrongWay: boolean;
  steerAxis: number;
  isGameOver: boolean;
  notifications: FinishNotification[];
}

export interface InputState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  boost: boolean;
  analogSteer: number | null; // -1 (right) to +1 (left), null when using digital buttons
}
