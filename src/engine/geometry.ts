/**
 * Pure carousel geometry.
 *
 * No DOM, no canvas, no globals: every function here is deterministic, which
 * makes the infinite-ring math and the finger hit-testing trivial to unit test.
 */

export interface CardGeometry {
  cardWidth: number
  cardHeight: number
  spacing: number
  /** Total width of one full loop: cardCount * spacing. */
  ringWidth: number
  /** Logical viewport width (640 in this project). */
  viewportWidth: number
  /** Top edge of the card row in logical pixels. */
  rowY: number
}

export interface CardOrigin {
  index: number
  x: number
}

/** Always returns a value in [0, ringWidth), including for negative inputs. */
export function wrap(value: number, ringWidth: number): number {
  const remainder = value % ringWidth
  // `-1200 % 1200` yields -0; normalise it so callers never see a negative zero.
  if (remainder === 0) return 0
  return remainder < 0 ? remainder + ringWidth : remainder
}

/**
 * Every card that intersects the viewport, including the wrapped copies on
 * either side. One copy per direction is enough to cover any viewport that is
 * narrower than the ring.
 */
export function cardOrigins(
  scrollX: number,
  cardCount: number,
  geometry: CardGeometry,
): CardOrigin[] {
  const offset = wrap(scrollX, geometry.ringWidth)
  const origins: CardOrigin[] = []

  for (let i = 0; i < cardCount; i++) {
    const base = i * geometry.spacing - offset

    for (let copy = -1; copy <= 1; copy++) {
      const x = base + copy * geometry.ringWidth
      if (x + geometry.cardWidth <= 0 || x >= geometry.viewportWidth) continue
      origins.push({ index: i, x })
    }
  }

  return origins
}

/**
 * Index of the card under the fingertip, or -1 when the tip is missing, above
 * or below the row, or in the gap between two cards.
 */
export function hoveredIndexAt(
  tipX: number | null,
  tipY: number | null,
  scrollX: number,
  cardCount: number,
  geometry: CardGeometry,
): number {
  if (tipX === null || tipY === null) return -1
  if (tipY < geometry.rowY || tipY > geometry.rowY + geometry.cardHeight) return -1

  let hoveredIndex = -1
  for (const card of cardOrigins(scrollX, cardCount, geometry)) {
    if (tipX >= card.x && tipX <= card.x + geometry.cardWidth) {
      hoveredIndex = card.index
    }
  }
  return hoveredIndex
}
