<template>
  <div class="score-gauge">
    <svg viewBox="0 0 120 120" :width="size" :height="size">
      <!-- Background arc -->
      <circle
        cx="60" cy="60" r="50"
        fill="none"
        stroke="var(--border-color)"
        stroke-width="8"
        :stroke-dasharray="circumference"
        stroke-dashoffset="0"
        stroke-linecap="round"
        transform="rotate(-90 60 60)"
      />
      <!-- Score arc -->
      <circle
        cx="60" cy="60" r="50"
        fill="none"
        :stroke="scoreColor"
        stroke-width="8"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        transform="rotate(-90 60 60)"
        style="transition: stroke-dashoffset 0.8s ease, stroke 0.5s ease;"
      />
      <!-- Score text -->
      <text
        x="60" y="55"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="scoreColor"
        font-size="28"
        font-weight="bold"
        font-family="Consolas, monospace"
      >
        {{ displayScore }}
      </text>
      <text
        x="60" y="76"
        text-anchor="middle"
        fill="var(--text-secondary)"
        font-size="10"
        font-family="Consolas, monospace"
        letter-spacing="2"
      >
        SCORE
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  score: { type: Number, default: 0 },
  size: { type: Number, default: 140 },
});

const circumference = 2 * Math.PI * 50;

const displayScore = computed(() => {
  return props.score != null ? Math.round(props.score) : '--';
});

const dashOffset = computed(() => {
  const s = props.score || 0;
  const pct = Math.min(Math.max(s, 0), 100) / 100;
  return circumference * (1 - pct);
});

const scoreColor = computed(() => {
  const s = props.score || 0;
  if (s >= 90) return '#00FF88';
  if (s >= 70) return '#00F0FF';
  if (s >= 50) return '#FFE156';
  if (s >= 30) return '#FF8844';
  return '#FF4444';
});
</script>

<style scoped>
.score-gauge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
