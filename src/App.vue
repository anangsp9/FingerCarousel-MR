<script setup lang="ts">
import { useTemplateRef, watch } from "vue"
import { useFingerCarousel } from "./composables/useFingerCarousel"

const videoRef = useTemplateRef<HTMLVideoElement>("video")
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas")

const { status, isError, isLive } = useFingerCarousel(videoRef, canvasRef)

// The glass-dot styles are keyed off `body.is-live`, so mirror the reactive
// state onto <body> instead of duplicating selectors.
watch(
  isLive,
  (live) => {
    document.body.classList.toggle("is-live", live)
  },
  { immediate: true },
)
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <span class="orb orb--1"></span>
    <span class="orb orb--2"></span>
    <span class="orb orb--3"></span>
  </div>

  <main class="stage">
    <video ref="video" autoplay playsinline muted></video>
    <canvas ref="canvas"></canvas>
    <div class="vignette" aria-hidden="true"></div>

    <header class="hud hud-top">
      <div class="glass brand">
        <span class="brand-dot" aria-hidden="true"></span>
        <div class="brand-text">
          <h1>FingerCarousel<span>-MR</span></h1>
          <p>Geser galeri dengan ujung telunjuk</p>
        </div>
      </div>
      <div class="glass badge" aria-hidden="true">Mixed Reality</div>
    </header>

    <div class="hud hud-bottom">
      <div
        v-if="status"
        class="glass status"
        :class="{ error: isError }"
        role="status"
        aria-live="polite"
      >
        {{ status }}
      </div>
    </div>
  </main>
</template>
