<template>
  <div class="probe-nodes-page">
    <h1 class="page-title">探针节点</h1>

    <div v-if="nodes.length > 0" class="grid-3">
      <div v-for="node in nodes" :key="node.id" class="node-card">
        <div class="node-card__header">
          <StatusDot :status="node.status === 'online' ? 'UP' : 'DOWN'" />
          <span class="node-card__status-text">{{ node.status }}</span>
        </div>
        <div class="node-card__name">{{ node.name }}</div>
        <div class="node-card__region">{{ node.region }}</div>
        <div class="node-card__ip">{{ node.ip || '--' }}</div>
        <div class="node-card__capabilities">
          <span v-for="cap in (node.capabilities || [])" :key="cap" class="node-card__cap">
            {{ cap }}
          </span>
        </div>
        <div class="node-card__stats">
          <div class="node-card__stat">
            <span class="node-card__stat-label">运行任务</span>
            <span class="node-card__stat-value">{{ node.runningTasks || 0 }}</span>
          </div>
          <div class="node-card__stat">
            <span class="node-card__stat-label">最后心跳</span>
            <span class="node-card__stat-value">{{ formatTime(node.lastHeartbeat) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>暂无探针节点</p>
      <p class="empty-hint">启动探针客户端以注册节点</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import socket from '@/socket';
import StatusDot from '@/components/common/StatusDot.vue';

const nodes = ref([]);

function loadNodes() {
  socket.emit('getProbeNodes', (data) => {
    if (data) {
      nodes.value = Array.isArray(data) ? data : [];
    }
  });
}

function formatTime(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function onNodeUpdate(data) {
  const idx = nodes.value.findIndex(n => n.id === data.id);
  if (idx >= 0) {
    nodes.value[idx] = { ...nodes.value[idx], ...data };
  } else {
    loadNodes();
  }
}

onMounted(() => {
  loadNodes();
  socket.on('probeNodeUpdate', onNodeUpdate);
});

onBeforeUnmount(() => {
  socket.off('probeNodeUpdate', onNodeUpdate);
});
</script>

<style scoped>
.node-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
}

.node-card:hover {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
  transform: translateY(-2px);
}

.node-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.node-card__status-text {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.node-card__name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.node-card__region {
  font-size: 0.8rem;
  color: var(--neon-cyan);
  margin-bottom: 4px;
}

.node-card__ip {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Consolas', monospace;
  margin-bottom: 12px;
}

.node-card__capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.node-card__cap {
  padding: 2px 8px;
  font-size: 0.65rem;
  color: var(--neon-purple);
  border: 1px solid var(--neon-purple);
  border-radius: 3px;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: rgba(177, 78, 255, 0.05);
}

.node-card__stats {
  display: flex;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.node-card__stat {
  display: flex;
  flex-direction: column;
}

.node-card__stat-label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.node-card__stat-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-hint {
  font-size: 0.8rem;
  margin-top: 8px;
  color: var(--text-secondary);
  opacity: 0.7;
}
</style>
