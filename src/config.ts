/**
 * Single source of truth for the carousel engine.
 *
 * These values were previously scattered as magic numbers inside the
 * single-file prototype. Keeping them here makes the engine configurable
 * without touching the rendering or gesture logic.
 */
export interface CarouselConfig {
  /** Logical canvas size. All hit-testing happens in this coordinate space. */
  canvasWidth: number
  canvasHeight: number
  /** Card size in logical pixels. */
  cardWidth: number
  cardHeight: number
  /** Horizontal distance between two card origins. */
  spacing: number
  /** Row center as a ratio of canvas height. */
  rowYRatio: number
  /** Minimum horizontal travel (px) before a hover becomes a drag. */
  dragStartThreshold: number
  /** Vertical distance (px) outside the row that releases a drag. */
  releaseMargin: number
  /** Per-frame smoothing factor at 60 fps, normalised by dt. */
  smoothingFactor: number
  /** How long the gesture hint stays visible. */
  hintDurationMs: number
  /** Pinned version of the legacy MediaPipe Hands bundle. */
  handsVersion: string
  imagePaths: string[]
}

export const CAROUSEL_CONFIG: CarouselConfig = {
  canvasWidth: 640,
  canvasHeight: 480,
  cardWidth: 180,
  cardHeight: 120,
  spacing: 200,
  rowYRatio: 0.4,
  dragStartThreshold: 6,
  releaseMargin: 90,
  smoothingFactor: 0.1,
  hintDurationMs: 7000,
  handsVersion: "0.4.1675469240",
  imagePaths: [
    "img1.jpg",
    "img2.jpg",
    "img3.jpeg",
    "img4.jpg",
    "img5.jpg",
    "img6.jpg",
  ],
}
