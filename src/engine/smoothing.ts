/**
 * Pure time-based smoothing and ring normalisation.
 *
 * Keeping these frame-rate independent is what makes the carousel feel the same
 * on a 30 fps laptop and a 120 Hz phone.
 */

/** Nominal frame duration used to express the smoothing factor. */
export const FRAME_MS = 16.67
/** Upper bound for a single delta, so a stalled tab cannot teleport the gallery. */
export const MAX_FRAME_DELTA_MS = 50
/** Remaining distance below which the scroll snaps exactly onto its target. */
export const SNAP_EPSILON = 0.01

export function clampDelta(dt: number, max: number = MAX_FRAME_DELTA_MS): number {
  return Math.min(dt, max)
}

/**
 * Per-frame interpolation factor for an arbitrary frame duration. `base` is the
 * factor at 60 fps; compounding this over any number of frames yields the same
 * result for the same elapsed time.
 */
export function smoothingFor(dt: number, base: number, frameMs: number = FRAME_MS): number {
  return 1 - Math.pow(1 - base, dt / frameMs)
}

/** Move `current` toward `target`, snapping once the gap is negligible. */
export function approach(
  current: number,
  target: number,
  dt: number,
  base: number,
  epsilon: number = SNAP_EPSILON,
): number {
  const next = current + (target - current) * smoothingFor(dt, base)
  return Math.abs(target - next) < epsilon ? target : next
}

export interface RingScroll {
  scrollX: number
  targetScrollX: number
}

/**
 * Keeps the scroll pair bounded without changing what is on screen: positions
 * are rendered modulo `ringWidth`, so shifting both values by whole rings is
 * visually a no-op. Prevents unbounded float growth during long sessions.
 */
export function normalizeRing(
  scrollX: number,
  targetScrollX: number,
  ringWidth: number,
): RingScroll {
  if (Math.abs(scrollX) < ringWidth) return { scrollX, targetScrollX }

  const shift = Math.floor(scrollX / ringWidth) * ringWidth
  return { scrollX: scrollX - shift, targetScrollX: targetScrollX - shift }
}
