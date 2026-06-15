<template>
  <div class="reports-page">
    <h1 class="page-title">报告</h1>

    <NeonCard>
      <table>
        <thead>
          <tr>
            <th>报告ID</th>
            <th>套件</th>
            <th>目标</th>
            <th>状态</th>
            <th>评分</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.id">
            <td class="report-id">{{ report.id }}</td>
            <td>
              <LayerBadge v-for="l in (report.layers || [])" :key="l" :layer="l" />
              <span class="report-suite">{{ report.suiteName || report.suite }}</span>
            </td>
            <td class="report-target">{{ report.target || report.host || '--' }}</td>
            <td>
              <StatusDot :status="report.status === 'completed' ? 'UP' : report.status === 'failed' ? 'DOWN' : 'PENDING'" />
              <span class="report-status-text">{{ report.status }}</span>
            </td>
            <td>
              <span class="report-score" :style="{ color: scoreColor(report.score) }">
                {{ report.score != null ? report.score : '--' }}
              </span>
            </td>
            <td class="time-cell">{{ formatTime(report.createdAt || report.time) }}</td>
            <td>
              <div class="report-actions">
                <button class="report-action-btn" title="下载 HTML" @click="downloadReport(report.id, 'html')">HTML</button>
                <button class="report-action-btn" title="下载 JSON" @click="downloadReport(report.id, 'json')">JSON</button>
              </div>
            </td>
          </tr>
          <tr v-if="reports.length === 0">
            <td colspan="7" style="text-align:center;color:var(--text-secondary);">暂无报告</td>
          </tr>
        </tbody>
      </table>
    </NeonCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import socket from '@/socket';
import NeonCard from '@/components/common/NeonCard.vue';
import StatusDot from '@/components/common/StatusDot.vue';
import LayerBadge from '@/components/common/LayerBadge.vue';

const reports = ref([]);

function loadReports() {
  socket.emit('getReports', (data) => {
    if (data) {
      reports.value = Array.isArray(data) ? data : [];
    }
  });
}

function formatTime(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scoreColor(score) {
  if (score == null) return 'var(--text-secondary)';
  if (score >= 90) return 'var(--neon-green)';
  if (score >= 70) return 'var(--neon-cyan)';
  if (score >= 50) return 'var(--neon-yellow)';
  return 'var(--neon-pink)';
}

function downloadReport(id, format) {
  const url = `/reports/${id}.${format}`;
  window.open(url, '_blank');
}

onMounted(() => {
  loadReports();
});
</script>

<style scoped>
.report-id {
  font-family: 'Consolas', monospace;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.report-suite {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 6px;
}

.report-target {
  font-family: 'Consolas', monospace;
  font-size: 0.85rem;
}

.report-status-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.report-score {
  font-weight: 700;
  font-size: 1rem;
}

.time-cell {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.report-actions {
  display: flex;
  gap: 6px;
}

.report-action-btn {
  padding: 4px 10px;
  font-size: 0.7rem;
  color: var(--neon-cyan);
  border: 1px solid var(--border-color);
  background: var(--bg-dark);
  border-radius: 3px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.2s;
}

.report-action-btn:hover {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 6px rgba(0, 240, 255, 0.2);
}
</style>
