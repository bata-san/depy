import type { GameState } from './types';

/** Standard pacing: about five real hours per in-game year. */
export const STANDARD_SECONDS_PER_YEAR = 5 * 60 * 60;
export const STANDARD_SECONDS_PER_WEEK = STANDARD_SECONDS_PER_YEAR / 52;
export const STANDARD_DEVELOPMENT_SECONDS = 4 * 60;

export function speedMultiplier(speed: GameState['speed']): number {
  return speed === 0 ? 0 : speed;
}

export function secondsPerWeek(speed: GameState['speed']): number {
  const multiplier = speedMultiplier(speed);
  return multiplier === 0 ? Number.POSITIVE_INFINITY : STANDARD_SECONDS_PER_WEEK / multiplier;
}

export function researchDurationSeconds(totalWeeks: number): number {
  // A short practical research loop: roughly one to three minutes at normal speed.
  return Math.min(180, Math.max(60, 48 + totalWeeks * 4.6));
}
