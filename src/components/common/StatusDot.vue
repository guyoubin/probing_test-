<template>
  <span class="status-dot" :class="[`status-dot--${status}`]" :title="statusLabel" />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, required: true }, // UP, DOWN, PENDING, MAINTENANCE
});

const statusLabel = computed(() => props.status);
</script>

<style scoped>
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
}

.status-dot::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.status-dot--UP {
  background-color: var(--neon-green);
  box-shadow: 0 0 6px var(--neon-green);
}

.status-dot--UP::after {
  animation: dotPulse 2s ease-in-out infinite;
  background-color: var(--neon-green);
}

.status-dot--DOWN {
  background-color: #FF4444;
  box-shadow: 0 0 6px #FF4444;
}

.status-dot--DOWN::after {
  animation: dotPulse 1s ease-in-out infinite;
  background-color: #FF4444;
}

.status-dot--PENDING {
  background-color: var(--neon-yellow);
  box-shadow: 0 0 6px var(--neon-yellow);
}

.status-dot--PENDING::after {
  animation: dotPulse 2s ease-in-out infinite;
  background-color: var(--neon-yellow);
}

.status-dot--MAINTENANCE {
  background-color: #666688;
  box-shadow: 0 0 4px #666688;
}

@keyframes dotPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.8);
    opacity: 0;
  }
}
</style>
