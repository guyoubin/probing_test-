<template>
  <div class="dashboard-page">
    <h1 class="page-title">仪表盘</h1>

    <!-- Stats Cards -->
    <div class="grid-4 stats-grid">
      <NeonCard>
        <div class="stat-card">
          <div class="stat-card__icon" style="color: var(--neon-cyan);">◉</div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ stats.monitorCount }}</div>
            <div class="stat-card__label">监控数</div>
          </div>
        </div>
      </NeonCard>
      <NeonCard variant="pink">
        <div class="stat-card">
          <div class="stat-card__icon" style="color: var(--neon-green);">▲</div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ stats.uptimeRate }}%</div>
            <div class="stat-card__label">在线率</div>
          </div>
        </div>
      </NeonCard>
      <NeonCard variant="purple">
        <div class="stat-card">
          <div class="stat-card__icon" style="color: var(--neon-purple);">◈</div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ stats.avgScore }}</div>
            <div class="stat-card__label">平均评分</div>
          </div>
        </div>
      </NeonCard>
      <NeonCard variant="cyan">
        <div class="stat-card">
          <div class="stat-card__icon" style="color: var(--neon-yellow);">▤</div>
          <div class="stat-card__info">
            <div class="stat-card__value">{{ stats.heartbeatCount }}</div>
            <div class="stat-card__label">心跳数</div>
          </div>
        </div>
      </NeonCard>
    </div>

    <!-- Recent Heartbeats -->
    <NeonCard title="最近心跳" subtitle="REAL-TIME HEARTBEATS" style="margin-top: 28px;">
      <table class="heartbeat-table">
        <thead>
          <tr>
            <th>监控</th>
            <th>状态</th>
            <th>延迟</th>
            <th>时间</th>
            <th>消息</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hb in recentHeartbeats" :key="hb.id || hb.time" class="animate-in">
            <td>
              <router-link :to="`/monitor/${hb.monitorID}`" class="monitor-link">
                {{ hb.monitorName || hb.monitorID }}
              </router-link>
            </td>
            <td>
              <StatusDot :status="hb.status === 1 ? 'UP' : 'DOWN'" />
            </td>
            <td :class="latencyClass(hb.latency)">{{ hb.latency != null ? hb.latency + 'ms' : '--' }}</td>
            <td class="time-cell">{{ formatTime(hb.time) }}</td>
            <td class="msg-cell">{{ hb.msg || '--' }}</td>
          </tr>
          <tr v-if="recentHeartbeats.length === 0">
            <td colspan="5" style="text-align: center; color: var(--text-secondary);">暂无心跳数据</td>
          </tr>
        </tbody>
      </table>
    </NeonCard>

    <!-- System Status -->
    <NeonCard title="系统状态" subtitle="SYSTEM STATUS" style="margin-top: 28px;">
      <div class="system-status">
        <div class="system-status__item">
          <span class="system-status__label">Socket 连接</span>
          <StatusDot :status="socketConnected ? 'UP' : 'DOWN'" />
        </div>
        <div class="system-status__item">
          <span class="system-status__label">探针节点</span>
          <span class="system-status__value">{{ stats.nodeCount || 0 }}</span>
        </div>
        <div class="system-status__item">
          <span class="system-status__label">运行时间</span>
          <span class="system-status__value">{{ stats.uptime || '--' }}</span>
        </div>
      </div>
    </NeonCard>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import socket from '@/socket';
import NeonCard from '@/components/common/NeonCard.vue';
import StatusDot from '@/components/common/StatusDot.vue';

const stats = ref({
  monitorCount: 0,
  uptimeRate: 0,
  avgScore: 0,
  heartbeatCount: 0,
  nodeCount: 0,
  uptime: '--',
});

const recentHeartbeats = ref([]);
const socketConnected = ref(socket.connected);

function loadDashboard() {
  socket.emit('getDashboardData', (data) => {
    if (data) {
      stats.value = {
        monitorCount: data.monitorCount ?? 0,
        uptimeRate: data.uptimeRate ?? 0,
        avgScore: data.avgScore ?? 0,
        heartbeatCount: data.heartbeatCount ?? 0,
        nodeCount: data.nodeCount ?? 0,
        uptime: data.uptime ?? '--',
      };
      recentHeartbeats.value = data.recentHeartbeats ?? [];
    }
  });
}

function onHeartbeat(data) {
  recentHeartbeats.value.unshift(data);
  if (recentHeartbeats.value.length > 50) {
    recentHeartbeats.value = recentHeartbeats.value.slice(0, 50);
  }
}

function onConnect() { socketConnected.value = true; loadDashboard(); }
function onDisconnect() { socketConnected.value = false; }

function formatTime(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function latencyClass(lat) {
  if (lat == null) return '';
  if (lat < 100) return 'latency-good';
  if (lat < 500) return 'latency-warn';
  return 'latency-bad';
}

onMounted(() => {
  loadDashboard();
  socket.on('heartbeat', onHeartbeat);
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
});

onBeforeUnmount(() => {
  socket.off('heartbeat', onHeartbeat);
  socket.off('connect', onConnect);
  socket.off('disconnect', onDisconnect);
});
</script>

<style scoped>
.stats-grid {
  margin-bottom: 8px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-card__icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.stat-card__info {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.stat-card__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.heartbeat-table {
  width: 100%;
}

.monitor-link {
  color: var(--neon-cyan);
}

.monitor-link:hover {
  text-shadow: var(--glow-cyan);
}

.time-cell {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.msg-cell {
  color: var(--text-secondary);
  font-size: 0.85rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.latency-good { color: var(--neon-green); }
.latency-warn { color: var(--neon-yellow); }
.latency-bad { color: var(--neon-pink); }

.system-status {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}

.system-status__item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.system-status__label {
  color: var(--text-secondary);
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.system-status__value {
  color: var(--neon-cyan);
  font-weight: 600;
}
</style>
