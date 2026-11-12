import { describe, expect, it } from "vitest"
import {
  cardOrigins,
  hoveredIndexAt,
  wrap,
  type CardGeometry,
} from "../src/engine/geometry"

const CARD_COUNT = 6
const RING_WIDTH = CARD_COUNT * 200

const geometry: CardGeometry = {
  cardWidth: 180,
  cardHeight: 120,
  spacing: 200,
  ringWidth: RING_WIDTH,
  viewportWidth: 640,
  rowY: 192,
}

describe("wrap", () => {
  it("keeps values already inside the ring untouched", () => {
    expect(wrap(0, RING_WIDTH)).toBe(0)
    expect(wrap(250, RING_WIDTH)).toBe(250)
    expect(wrap(RING_WIDTH - 1, RING_WIDTH)).toBe(RING_WIDTH - 1)
  })

  it("maps negative offsets back into [0, ringWidth)", () => {
    expect(wrap(-1, RING_WIDTH)).toBe(RING_WIDTH - 1)
    expect(wrap(-RING_WIDTH, RING_WIDTH)).toBe(0)
    expect(wrap(-1450, RING_WIDTH)).toBe(950)
  })

  it("is periodic over the ring width", () => {
    for (const value of [0, 37, 599, RING_WIDTH, 2500, -2500]) {
      expect(wrap(value + RING_WIDTH, RING_WIDTH)).toBeCloseTo(
        wrap(value, RING_WIDTH),
        10,
      )
    }
  })
})

describe("cardOrigins", () => {
  it("lists the four cards that fit in the viewport at scroll 0", () => {
    expect(cardOrigins(0, CARD_COUNT, geometry).map((card) => card.x)).toEqual([
      0, 200, 400, 600,
    ])
  })

  it("never shows the same card twice (card width < spacing)", () => {
    for (const scrollX of [0, 1, 199.5, 600, 1199, -3000, 12500]) {
      const indices = cardOrigins(scrollX, CARD_COUNT, geometry).map((card) => card.index)
      expect(new Set(indices).size).toBe(indices.length)
    }
  })

  it("is visually invariant under a full ring shift", () => {
    expect(cardOrigins(250, CARD_COUNT, geometry)).toEqual(
      cardOrigins(250 + RING_WIDTH, CARD_COUNT, geometry),
    )
  })

  it("only returns cards that actually intersect the viewport", () => {
    for (const scrollX of [0, 137, 900, -420]) {
      for (const card of cardOrigins(scrollX, CARD_COUNT, geometry)) {
        expect(card.x + geometry.cardWidth).toBeGreaterThan(0)
        expect(card.x).toBeLessThan(geometry.viewportWidth)
      }
    }
  })

  it("keeps the row filled while scrolling through a full loop", () => {
    for (let scrollX = 0; scrollX < RING_WIDTH; scrollX += 50) {
      const origins = cardOrigins(scrollX, CARD_COUNT, geometry)
      expect(origins.length).toBeGreaterThanOrEqual(4)
    }
  })
})

describe("hoveredIndexAt", () => {
  it("returns -1 when the fingertip is missing", () => {
    expect(hoveredIndexAt(null, 220, 0, CARD_COUNT, geometry)).toBe(-1)
    expect(hoveredIndexAt(220, null, 0, CARD_COUNT, geometry)).toBe(-1)
  })

  it("returns -1 outside the card row", () => {
    expect(hoveredIndexAt(100, geometry.rowY - 1, 0, CARD_COUNT, geometry)).toBe(-1)
    expect(
      hoveredIndexAt(100, geometry.rowY + geometry.cardHeight + 1, 0, CARD_COUNT, geometry),
    ).toBe(-1)
  })

  it("maps the fingertip onto a card index", () => {
    expect(hoveredIndexAt(10, geometry.rowY + 10, 0, CARD_COUNT, geometry)).toBe(0)
    expect(hoveredIndexAt(210, geometry.rowY + 10, 0, CARD_COUNT, geometry)).toBe(1)
    expect(hoveredIndexAt(610, geometry.rowY + 10, 0, CARD_COUNT, geometry)).toBe(3)
  })

  it("treats both card edges as inclusive", () => {
    expect(hoveredIndexAt(200, geometry.rowY + 10, 0, CARD_COUNT, geometry)).toBe(1)
    expect(hoveredIndexAt(380, geometry.rowY + 10, 0, CARD_COUNT, geometry)).toBe(1)
  })

  it("returns -1 in the gap between two cards", () => {
    expect(hoveredIndexAt(190, geometry.rowY + 10, 0, CARD_COUNT, geometry)).toBe(-1)
  })

  it("follows the cards while the gallery is scrolled", () => {
    // scrolled by one slot: card #1 now sits at x=0
    expect(hoveredIndexAt(110, geometry.rowY + 10, 200, CARD_COUNT, geometry)).toBe(1)
    expect(hoveredIndexAt(110, geometry.rowY + 10, 400, CARD_COUNT, geometry)).toBe(2)
  })
})
