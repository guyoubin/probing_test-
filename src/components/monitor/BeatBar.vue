<template>
  <div class="beat-bar">
    <div
      v-for="(beat, i) in beats"
      :key="i"
      class="beat-bar__item"
      :class="[`beat-bar__item--${beat}`]"
      :title="beatLabel(beat, i)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  heartbeats: { type: Array, default: () => [] }, // Array of { status: 1|0|2 } => 1=up, 0=down, 2=pending
  maxBeats: { type: Number, default: 20 },
});

const beats = computed(() => {
  const list = props.heartbeats.slice(-props.maxBeats);
  while (list.length < props.maxBeats) {
    list.unshift('empty');
  }
  return list.map(b => {
    if (b === 'empty') return 'empty';
    if (b.status === 1) return 'up';
    if (b.status === 0) return 'down';
    return 'pending';
  });
});

function beatLabel(beat, i) {
  const idx = props.heartbeats.length - props.maxBeats + i;
  if (beat === 'up') return `#${idx + 1}: UP`;
  if (beat === 'down') return `#${idx + 1}: DOWN`;
  if (beat === 'pending') return `#${idx + 1}: PENDING`;
  return '';
}
</script>

<style scoped>
.beat-bar {
  display: flex;
  gap: 3px;
  align-items: stretch;
  height: 24px;
}

.beat-bar__item {
  flex: 1;
  min-width: 0;
  border-radius: 2px;
  transition: transform 0.15s;
}

.beat-bar__item:hover {
  transform: scaleY(1.4);
}

.beat-bar__item--up {
  background-color: var(--neon-green);
  box-shadow: 0 0 4px rgba(0, 255, 136, 0.3);
}

.beat-bar__item--down {
  background-color: #FF4444;
  box-shadow: 0 0 4px rgba(255, 68, 68, 0.3);
}

.beat-bar__item--pending {
  background-color: var(--neon-yellow);
  box-shadow: 0 0 4px rgba(255, 225, 86, 0.3);
}

.beat-bar__item--empty {
  background-color: var(--border-color);
}
</style>
