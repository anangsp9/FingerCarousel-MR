import { describe, expect, it } from "vitest"
import {
  FRAME_MS,
  MAX_FRAME_DELTA_MS,
  SNAP_EPSILON,
  approach,
  clampDelta,
  normalizeRing,
  smoothingFor,
} from "../src/engine/smoothing"

describe("smoothingFor", () => {
  it("equals the base factor at 60 fps", () => {
    expect(smoothingFor(FRAME_MS, 0.1)).toBeCloseTo(0.1, 12)
  })

  it("compounds correctly over a longer frame", () => {
    const at30Fps = smoothingFor(FRAME_MS * 2, 0.1)
    expect(1 - at30Fps).toBeCloseTo(0.9 ** 2, 12)
  })
})

describe("approach", () => {
  it("moves part of the way toward the target", () => {
    const next = approach(0, 100, FRAME_MS, 0.1)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(100)
  })

  it("converges to the same value at 30 fps and 60 fps", () => {
    let at60Fps = 0
    let at30Fps = 0
    const target = 100

    for (let frame = 0; frame < 60; frame++) {
      at60Fps = approach(at60Fps, target, FRAME_MS, 0.1)
    }
    for (let frame = 0; frame < 30; frame++) {
      at30Fps = approach(at30Fps, target, FRAME_MS * 2, 0.1)
    }

    expect(at30Fps).toBeCloseTo(at60Fps, 6)
  })

  it("snaps exactly onto the target once the gap is negligible", () => {
    const next = approach(99.995, 100, FRAME_MS, 0.1)
    expect(next).toBe(100)
    expect(Math.abs(100 - 99.995)).toBeLessThan(SNAP_EPSILON)
  })

  it("does not overshoot when the target is far away", () => {
    let value = 0
    for (let frame = 0; frame < 500; frame++) {
      value = approach(value, 1000, 100, 1)
      expect(value).toBeLessThanOrEqual(1000)
    }
    expect(value).toBe(1000)
  })
})

describe("clampDelta", () => {
  it("caps long frame gaps so a stalled tab cannot teleport the gallery", () => {
    expect(clampDelta(200)).toBe(MAX_FRAME_DELTA_MS)
    expect(clampDelta(MAX_FRAME_DELTA_MS)).toBe(MAX_FRAME_DELTA_MS)
  })

  it("leaves normal frame times alone", () => {
    expect(clampDelta(16)).toBe(16)
  })
})

describe("normalizeRing", () => {
  const ringWidth = 1200

  it("leaves values smaller than one ring untouched", () => {
    expect(normalizeRing(100, 120, ringWidth)).toEqual({
      scrollX: 100,
      targetScrollX: 120,
    })
  })

  it("shifts both values by whole rings", () => {
    expect(normalizeRing(1250, 1300, ringWidth)).toEqual({
      scrollX: 50,
      targetScrollX: 100,
    })
  })

  it("brings large negative offsets back to positive", () => {
    const normalized = normalizeRing(-1250, -1300, ringWidth)
    expect(normalized.scrollX).toBe(1150)
    expect(normalized.targetScrollX).toBe(1100)
  })

  it("keeps the on-screen offset identical", () => {
    const before = 2500
    const normalized = normalizeRing(before, before, ringWidth)
    expect(normalized.scrollX).toBeCloseTo(before % ringWidth, 10)
  })

  it("keeps the value bounded during a long session", () => {
    const normalized = normalizeRing(1_200_000 + 350, 1_200_000 + 350, ringWidth)
    expect(normalized.scrollX).toBe(350)
    expect(Math.abs(normalized.scrollX)).toBeLessThan(ringWidth)
  })
})
