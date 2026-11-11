/**
 * FingerCarousel-MR engine.
 *
 * Framework-free by design: this module owns the camera pipeline, the gesture
 * state machine and the canvas rendering. It never imports Vue and never
 * touches the DOM beyond the <video>/<canvas> elements handed to it, so the UI
 * layer can be replaced without changing any of this logic.
 */
import { CAROUSEL_CONFIG, type CarouselConfig } from "../config"

export interface CarouselOptions {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  config?: Partial<CarouselConfig>
  /** Called whenever the user-facing status line should change. */
  onStatus: (message: string | null, isError?: boolean) => void
  /** Called the first time hand tracking produces a result. */
  onLive: () => void
}

export interface CarouselHandle {
  start: () => Promise<void>
  stop: () => void
}

export function createCarousel(options: CarouselOptions): CarouselHandle {
  const { video, canvas, onStatus, onLive } = options
  const config: CarouselConfig = { ...CAROUSEL_CONFIG, ...options.config }

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("CanvasRenderingContext2D is not available")
  }
  // Explicit annotation: TS does not carry the null-narrowing above into the
  // nested draw helpers below.
  const ctx: CanvasRenderingContext2D = context

  canvas.width = config.canvasWidth
  canvas.height = config.canvasHeight

  const { cardWidth: CARD_W, cardHeight: CARD_H, spacing: SPACING } = config
  const ROW_Y = canvas.height * config.rowYRatio

  // Satu putaran penuh galeri: setelah kartu terakhir, kartu pertama muncul lagi
  const RING_WIDTH = config.imagePaths.length * SPACING

  const images: HTMLImageElement[] = config.imagePaths.map((src) => {
    const img = new Image()
    img.src = src
    return img
  })

  let scrollX = 0
  let targetScrollX = 0

  let latestResults: HandsResults | null = null
  let lastTimestamp = 0
  let statusCleared = false
  let hintTimer: ReturnType<typeof setTimeout> | null = null

  // State gestur
  let isDragging = false
  let dragAnchorX: number | null = null
  let dragCardIndex = -1
  let prevTipX: number | null = null

  let rafId = 0
  let hands: HandsInstance | null = null
  let camera: CameraInstance | null = null
  let disposed = false

  // Selalu mengembalikan nilai positif, termasuk untuk input negatif
  function wrap(value: number): number {
    const remainder = value % RING_WIDTH
    return remainder < 0 ? remainder + RING_WIDTH : remainder
  }

  function dismissHint(): void {
    if (hintTimer !== null) {
      clearTimeout(hintTimer)
      hintTimer = null
    }
    onStatus(null)
  }

  // Mengiterasi semua kartu yang terlihat, termasuk salinan hasil pembungkusan
  // agar deretan gambar tampak berputar tanpa ujung.
  function forEachVisibleCard(callback: (index: number, x: number) => void): void {
    const offset = wrap(scrollX)

    for (let i = 0; i < images.length; i++) {
      const base = i * SPACING - offset

      // Satu salinan ke kiri dan ke kanan cukup untuk menutup seluruh viewport
      for (let copy = -1; copy <= 1; copy++) {
        const x = base + copy * RING_WIDTH
        if (x + CARD_W <= 0 || x >= canvas.width) continue
        callback(i, x)
      }
    }
  }

  function getHoveredIndex(tipX: number | null, tipY: number | null): number {
    if (tipX === null || tipY === null) return -1
    if (tipY < ROW_Y || tipY > ROW_Y + CARD_H) return -1

    let hoveredIndex = -1
    forEachVisibleCard((i, x) => {
      if (tipX >= x && tipX <= x + CARD_W) hoveredIndex = i
    })
    return hoveredIndex
  }

  function endDrag(): void {
    isDragging = false
    dragAnchorX = null
    dragCardIndex = -1
    prevTipX = null
  }

  function updateDragState(tipX: number | null, tipY: number | null, hoveredIndex: number): void {
    // Tangan hilang dari frame: reset total agar tidak melompat saat muncul lagi
    if (tipX === null || tipY === null) {
      endDrag()
      return
    }

    if (isDragging) {
      const withinRow =
        tipY >= ROW_Y - config.releaseMargin &&
        tipY <= ROW_Y + CARD_H + config.releaseMargin

      if (!withinRow) {
        endDrag()
        return
      }

      // Tanpa clamp: melewati ujung akan berputar ke sisi seberang
      if (prevTipX !== null) {
        targetScrollX -= tipX - prevTipX
      }
      prevTipX = tipX
      return
    }

    // Belum dragging: butuh hover pada kartu + gerakan melewati threshold
    if (hoveredIndex === -1) {
      dragAnchorX = null
      prevTipX = null
      return
    }

    if (dragAnchorX === null) {
      dragAnchorX = tipX
    }

    if (Math.abs(tipX - dragAnchorX) > config.dragStartThreshold) {
      isDragging = true
      dragCardIndex = hoveredIndex
      prevTipX = tipX
      dismissHint()
    }
  }

  // Jalur rounded-rect dengan fallback untuk browser lama
  function roundedRect(x: number, y: number, w: number, h: number, radius: number): void {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, radius)
      return
    }
    const r = Math.min(radius, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  function drawImages(activeIndex: number): void {
    forEachVisibleCard((i, x) => {
      const image = images[i]
      if (!image) return

      const isActive = i === activeIndex
      const yOffset = isActive ? -30 : 0
      const scale = isActive ? 1.05 : 1
      const frameW = CARD_W + 12
      const frameH = CARD_H + 12

      ctx.save()
      ctx.translate(x + CARD_W / 2, ROW_Y + CARD_H / 2 + yOffset)
      ctx.scale(scale, scale)

      // Alas kaca di belakang kartu
      roundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 20)
      ctx.fillStyle = isActive ? "rgba(126, 231, 255, 0.18)" : "rgba(255, 255, 255, 0.08)"
      ctx.fill()

      // Gambar dengan sudut membulat
      roundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14)
      ctx.save()
      ctx.clip()
      ctx.drawImage(image, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H)

      // Kilau kaca di bagian atas gambar
      const gloss = ctx.createLinearGradient(0, -CARD_H / 2, 0, -CARD_H / 2 + CARD_H * 0.5)
      gloss.addColorStop(0, "rgba(255, 255, 255, 0.2)")
      gloss.addColorStop(1, "rgba(255, 255, 255, 0)")
      ctx.fillStyle = gloss
      ctx.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H * 0.5)
      ctx.restore()

      // Garis tepi kaca
      roundedRect(-frameW / 2, -frameH / 2, frameW, frameH, 20)
      ctx.strokeStyle = isActive ? "rgba(126, 231, 255, 0.95)" : "rgba(255, 255, 255, 0.32)"
      ctx.lineWidth = isActive ? 2 : 1
      ctx.stroke()

      ctx.restore()
    })
  }

  function draw(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Video dicerminkan seperti cermin
    if (video.readyState >= 2) {
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      ctx.restore()
    }

    let tipX: number | null = null
    let tipY: number | null = null

    const hand = latestResults?.multiHandLandmarks?.[0]

    if (hand) {
      // Koordinat dicerminkan agar sesuai dengan tampilan mirror
      const mirrored: HandLandmarkPoint[] = hand.map((pt) => ({
        x: 1 - pt.x,
        y: pt.y,
        z: pt.z,
      }))

      const tip = mirrored[8] // ujung telunjuk
      if (tip) {
        tipX = tip.x * canvas.width
        tipY = tip.y * canvas.height

        drawConnectors(ctx, mirrored, HAND_CONNECTIONS, {
          color: "rgba(126, 231, 255, 0.55)",
          lineWidth: 2,
        })
        drawLandmarks(ctx, mirrored, {
          color: "rgba(214, 245, 255, 0.9)",
          lineWidth: 1,
          radius: 3,
        })
        drawLandmarks(ctx, [tip], { color: "#7ee7ff", radius: 7 })
      }
    }

    const hoveredIndex = getHoveredIndex(tipX, tipY)
    updateDragState(tipX, tipY, hoveredIndex)

    // Kartu yang sedang di-hover/di-drag tetap terangkat selama gesture berjalan
    const activeIndex = isDragging ? dragCardIndex : hoveredIndex
    drawImages(activeIndex)
  }

  function renderLoop(timestamp: number): void {
    if (disposed) return

    const dt =
      lastTimestamp === 0 ? 16.67 : Math.min(timestamp - lastTimestamp, 50)
    lastTimestamp = timestamp

    // Smoothing berbasis waktu: konsisten di 30 fps maupun 60 fps
    const smoothing = 1 - Math.pow(1 - config.smoothingFactor, dt / 16.67)
    scrollX += (targetScrollX - scrollX) * smoothing
    if (Math.abs(targetScrollX - scrollX) < 0.01) {
      scrollX = targetScrollX
    }

    // Normalisasi: tampilan tidak berubah karena posisi dihitung modulo
    // RING_WIDTH, tapi nilai tidak membesar tanpa batas.
    if (Math.abs(scrollX) >= RING_WIDTH) {
      const shift = Math.floor(scrollX / RING_WIDTH) * RING_WIDTH
      scrollX -= shift
      targetScrollX -= shift
    }

    draw()

    rafId = requestAnimationFrame(renderLoop)
  }

  function handleResults(results: HandsResults): void {
    if (disposed) return

    latestResults = results

    if (!statusCleared) {
      statusCleared = true
      onLive()
      onStatus("Arahkan telunjuk ke mobil, lalu geser ke kiri atau kanan.")
      hintTimer = setTimeout(dismissHint, config.hintDurationMs)
    }
  }

  async function start(): Promise<void> {
    if (disposed) return

    rafId = requestAnimationFrame(renderLoop)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onStatus(
        "Browser ini tidak mendukung akses kamera. Gunakan Chrome, Edge, atau Firefox terbaru.",
        true,
      )
      return
    }

    try {
      hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${config.handsVersion}/${file}`,
      })
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      })
      hands.onResults(handleResults)

      camera = new Camera(video, {
        onFrame: async () => {
          try {
            await hands?.send({ image: video })
          } catch (err) {
            console.error("hands.send gagal:", err)
          }
        },
        width: config.canvasWidth,
        height: config.canvasHeight,
      })

      await camera.start()
    } catch (err) {
      console.error("Kamera gagal dimulai:", err)

      let message =
        "Kamera tidak dapat diakses. Pastikan halaman dibuka lewat localhost/HTTPS dan kamera tidak dipakai aplikasi lain."
      if (err instanceof Error && err.name === "NotAllowedError") {
        message =
          "Akses kamera ditolak. Izinkan kamera di pengaturan browser, lalu muat ulang halaman."
      } else if (err instanceof Error && err.name === "NotFoundError") {
        message =
          "Kamera tidak ditemukan. Hubungkan kamera, lalu muat ulang halaman."
      }
      onStatus(message, true)
    }
  }

  function stop(): void {
    if (disposed) return
    disposed = true

    cancelAnimationFrame(rafId)

    if (hintTimer !== null) {
      clearTimeout(hintTimer)
      hintTimer = null
    }

    try {
      camera?.stop()
    } catch (err) {
      console.error("camera.stop gagal:", err)
    }

    const stream = video.srcObject
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    video.srcObject = null

    try {
      void hands?.close()
    } catch (err) {
      console.error("hands.close gagal:", err)
    }

    hands = null
    camera = null
  }

  return { start, stop }
}
