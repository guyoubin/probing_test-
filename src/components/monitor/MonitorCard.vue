<template>
  <div class="monitor-card" @click="$emit('click')">
    <div class="monitor-card__header">
      <StatusDot :status="monitor.status" />
      <LayerBadge :layer="monitor.layer" />
    </div>
    <div class="monitor-card__name">{{ monitor.name }}</div>
    <div class="monitor-card__type">{{ monitor.type }}</div>
    <div class="monitor-card__stats">
      <div class="monitor-card__stat">
        <span class="monitor-card__stat-label">延迟</span>
        <span class="monitor-card__stat-value" :class="latencyClass">
          {{ monitor.lastLatency != null ? monitor.lastLatency + 'ms' : '--' }}
        </span>
      </div>
      <div class="monitor-card__stat">
        <span class="monitor-card__stat-label">评分</span>
        <span class="monitor-card__stat-value" :style="{ color: scoreColor }">
          {{ monitor.score != null ? monitor.score : '--' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import StatusDot from '@/components/common/StatusDot.vue';
import LayerBadge from '@/components/common/LayerBadge.vue';

const props = defineProps({
  monitor: { type: Object, required: true },
});

defineEmits(['click']);

const latencyClass = computed(() => {
  const lat = props.monitor.lastLatency;
  if (lat == null) return '';
  if (lat < 100) return 'latency-good';
  if (lat < 500) return 'latency-warn';
  return 'latency-bad';
});

const scoreColor = computed(() => {
  const s = props.monitor.score;
  if (s == null) return 'var(--text-secondary)';
  if (s >= 90) return 'var(--neon-green)';
  if (s >= 70) return 'var(--neon-cyan)';
  if (s >= 50) return 'var(--neon-yellow)';
  return 'var(--neon-pink)';
});
</script>

<style scoped>
.monitor-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.monitor-card:hover {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
  transform: translateY(-2px);
}

.monitor-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.monitor-card__name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.monitor-card__type {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.monitor-card__stats {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.monitor-card__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.monitor-card__stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.monitor-card__stat-value {
  font-size: 1rem;
  font-weight: 700;
}

.latency-good { color: var(--neon-green); }
.latency-warn { color: var(--neon-yellow); }
.latency-bad { color: var(--neon-pink); }
</style>
