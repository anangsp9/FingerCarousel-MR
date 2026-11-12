/**
 * Ambient declarations for the legacy MediaPipe Solutions bundles loaded from
 * the CDN by index.html.
 *
 * TEMPORARY: these globals disappear once the project migrates to
 * `@mediapipe/tasks-vision`, which ships its own types.
 */

interface HandLandmarkPoint {
  x: number
  y: number
  z: number
}

interface HandsResults {
  multiHandLandmarks?: HandLandmarkPoint[][]
}

interface HandsOptions {
  locateFile: (file: string) => string
}

interface HandsSetOptions {
  maxNumHands?: number
  modelComplexity?: number
  minDetectionConfidence?: number
  minTrackingConfidence?: number
}

interface HandsInstance {
  setOptions(options: HandsSetOptions): void
  onResults(callback: (results: HandsResults) => void): void
  send(inputs: { image: HTMLVideoElement }): Promise<void>
  close(): Promise<void>
}

interface CameraOptions {
  onFrame: () => Promise<void>
  width: number
  height: number
}

interface CameraInstance {
  start(): Promise<void>
  stop(): void
}

declare const Hands: new (options: HandsOptions) => HandsInstance
declare const Camera: new (video: HTMLVideoElement, options: CameraOptions) => CameraInstance
