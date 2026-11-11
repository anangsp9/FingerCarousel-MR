import { nextTick, onBeforeUnmount, onMounted, ref, type ShallowRef } from "vue"
import { createCarousel, type CarouselHandle } from "../engine/carousel"

/** Matches the copy that used to live in index.html. */
const INITIAL_STATUS = "Menyiapkan kamera… izinkan akses kamera jika diminta."

/**
 * Thin bridge between Vue and the framework-free carousel engine.
 *
 * Only low-frequency UI state is reactive (status / error / live). High-frequency
 * values such as scrollX, targetScrollX and raw landmarks stay inside the engine
 * closure so Vue never participates in the render loop.
 */
export function useFingerCarousel(
  videoRef: Readonly<ShallowRef<HTMLVideoElement | null>>,
  canvasRef: Readonly<ShallowRef<HTMLCanvasElement | null>>,
) {
  const status = ref<string | null>(INITIAL_STATUS)
  const isError = ref(false)
  const isLive = ref(false)

  let carousel: CarouselHandle | null = null

  onMounted(async () => {
    await nextTick()

    if (!videoRef.value || !canvasRef.value) {
      console.warn("FingerCarousel: video/canvas belum ter-mount")
      return
    }

    carousel = createCarousel({
      video: videoRef.value,
      canvas: canvasRef.value,
      onStatus: (message, error = false) => {
        status.value = message
        isError.value = error
      },
      onLive: () => {
        isLive.value = true
      },
    })

    await carousel.start()
  })

  onBeforeUnmount(() => {
    carousel?.stop()
    carousel = null
  })

  return { status, isError, isLive }
}
