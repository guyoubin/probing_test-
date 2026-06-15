<template>
  <div class="monitor-detail-page">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="monitor">
      <!-- Header -->
      <div class="detail-header">
        <router-link to="/monitors" class="back-link">← 返回列表</router-link>
        <div class="detail-header__info">
          <h1 class="detail-header__name">{{ monitor.name }}</h1>
          <div class="detail-header__meta">
            <StatusDot :status="monitor.status" />
            <LayerBadge :layer="monitor.layer" />
            <span class="detail-header__type">{{ monitor.type }}</span>
          </div>
        </div>
        <div class="detail-header__actions">
          <NeonButton v-if="monitor.active" type="danger" @click="pauseMonitor">暂停</NeonButton>
          <NeonButton v-else type="primary" @click="resumeMonitor">恢复</NeonButton>
          <NeonButton type="danger" @click="deleteMonitor">删除</NeonButton>
        </div>
      </div>

      <!-- Score + BeatBar -->
      <div class="grid-2" style="margin-top: 24px;">
        <NeonCard title="评分" subtitle="SCORE">
          <div style="display:flex;justify-content:center;padding:12px 0;">
            <ScoreGauge :score="monitor.score ?? 0" :size="180" />
          </div>
        </NeonCard>
        <NeonCard title="心跳条" subtitle="HEARTBEAT BAR">
          <div style="padding: 12px 0;">
            <BeatBar :heartbeats="heartbeats" :max-beats="20" />
          </div>
        </NeonCard>
      </div>

      <!-- Response Time Chart -->
      <NeonCard title="响应时间" subtitle="RESPONSE TIME" style="margin-top: 24px;">
        <ResponseTimeChart :data="chartData" />
      </NeonCard>

      <!-- Recent Heartbeats Table -->
      <NeonCard title="最近心跳" subtitle="RECENT HEARTBEATS" style="margin-top: 24px;">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>延迟</th>
              <th>时间</th>
              <th>消息</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="hb in heartbeats" :key="hb.id || hb.time">
              <td><StatusDot :status="hb.status === 1 ? 'UP' : 'DOWN'" /></td>
              <td :class="latencyClass(hb.latency)">{{ hb.latency != null ? hb.latency + 'ms' : '--' }}</td>
              <td class="time-cell">{{ formatTime(hb.time) }}</td>
              <td class="msg-cell">{{ hb.msg || '--' }}</td>
            </tr>
            <tr v-if="heartbeats.length === 0">
              <td colspan="4" style="text-align:center;color:var(--text-secondary);">暂无心跳数据</td>
            </tr>
          </tbody>
        </table>
      </NeonCard>
    </div>
    <div v-else class="empty-state">监控不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import socket from '@/socket';
import NeonCard from '@/components/common/NeonCard.vue';
import NeonButton from '@/components/common/NeonButton.vue';
import StatusDot from '@/components/common/StatusDot.vue';
import LayerBadge from '@/components/common/LayerBadge.vue';
import ScoreGauge from '@/components/chart/ScoreGauge.vue';
import BeatBar from '@/components/monitor/BeatBar.vue';
import ResponseTimeChart from '@/components/chart/ResponseTimeChart.vue';

const route = useRoute();
const router = useRouter();

const monitor = ref(null);
const heartbeats = ref([]);
const loading = ref(true);

const chartData = computed(() => {
  return heartbeats.value
    .filter(hb => hb.latency != null)
    .map(hb => ({ time: hb.time, value: hb.latency }))
    .reverse();
});

function loadMonitor() {
  const id = route.params.id;
  if (!id) return;

  loading.value = true;
  socket.emit('getMonitor', id, (data) => {
    if (data) {
      monitor.value = data;
    }
    loading.value = false;
  });

  socket.emit('getHeartbeats', id, (data) => {
    if (data) {
      heartbeats.value = Array.isArray(data) ? data : [];
    }
  });
}

function onHeartbeat(data) {
  if (data.monitorID === route.params.id || data.monitorID === monitor.value?.id) {
    heartbeats.value.unshift(data);
    if (heartbeats.value.length > 100) {
      heartbeats.value = heartbeats.value.slice(0, 100);
    }
    if (monitor.value) {
      monitor.value.status = data.status === 1 ? 'UP' : 'DOWN';
      monitor.value.lastLatency = data.latency;
    }
  }
}

function pauseMonitor() {
  socket.emit('pauseMonitor', route.params.id, () => {
    if (monitor.value) monitor.value.active = false;
  });
}

function resumeMonitor() {
  socket.emit('resumeMonitor', route.params.id, () => {
    if (monitor.value) monitor.value.active = true;
  });
}

function deleteMonitor() {
  if (confirm('确定删除此监控？')) {
    socket.emit('deleteMonitor', route.params.id, () => {
      router.replace('/monitors');
    });
  }
}

function formatTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function latencyClass(lat) {
  if (lat == null) return '';
  if (lat < 100) return 'latency-good';
  if (lat < 500) return 'latency-warn';
  return 'latency-bad';
}

watch(() => route.params.id, loadMonitor);

onMounted(() => {
  loadMonitor();
  socket.on('heartbeat', onHeartbeat);
});

onBeforeUnmount(() => {
  socket.off('heartbeat', onHeartbeat);
});
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.back-link {
  color: var(--neon-cyan);
  font-size: 0.85rem;
  letter-spacing: 1px;
  margin-bottom: 8px;
  display: block;
}

.detail-header__name {
  font-size: 1.8rem;
  color: var(--neon-cyan);
  text-shadow: var(--glow-cyan);
  letter-spacing: 2px;
}

.detail-header__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.detail-header__type {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.detail-header__actions {
  display: flex;
  gap: 8px;
}

.loading, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.time-cell { color: var(--text-secondary); font-size: 0.85rem; }
.msg-cell { color: var(--text-secondary); font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.latency-good { color: var(--neon-green); }
.latency-warn { color: var(--neon-yellow); }
.latency-bad { color: var(--neon-pink); }
</style>
