<template>
  <div class="monitor-list-page">
    <h1 class="page-title">监控列表</h1>

    <!-- Filters -->
    <div class="filters">
      <div class="filters__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索监控..."
          class="filters__search-input"
        />
      </div>
      <div class="filters__group">
        <select v-model="filterLayer" class="filters__select">
          <option value="">全部层级</option>
          <option value="L1">L1 - 基础网络</option>
          <option value="L2">L2 - DNS解析</option>
          <option value="L3">L3 - API服务</option>
          <option value="L4">L4 - AI模型</option>
        </select>
        <select v-model="filterType" class="filters__select">
          <option value="">全部类型</option>
          <option value="ping">Ping</option>
          <option value="dns">DNS</option>
          <option value="http">HTTP</option>
          <option value="ai-api">AI API</option>
        </select>
        <select v-model="filterStatus" class="filters__select">
          <option value="">全部状态</option>
          <option value="UP">在线</option>
          <option value="DOWN">离线</option>
          <option value="PENDING">待定</option>
          <option value="MAINTENANCE">维护</option>
        </select>
      </div>
      <NeonButton @click="showAddDialog = true">+ 添加监控</NeonButton>
    </div>

    <!-- Monitor Grid -->
    <div v-if="filteredMonitors.length > 0" class="grid-3 monitor-grid">
      <MonitorCard
        v-for="m in filteredMonitors"
        :key="m.id"
        :monitor="m"
        @click="goToMonitor(m.id)"
      />
    </div>
    <div v-else class="empty-state">
      <p>暂无监控数据</p>
      <NeonButton @click="showAddDialog = true">添加第一个监控</NeonButton>
    </div>

    <!-- Add Monitor Dialog -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="showAddDialog = false">
      <div class="dialog">
        <h2 class="dialog__title">添加监控</h2>
        <form @submit.prevent="addMonitor">
          <div class="dialog__field">
            <label>名称</label>
            <input v-model="newMonitor.name" type="text" required placeholder="监控名称" />
          </div>
          <div class="dialog__field">
            <label>类型</label>
            <select v-model="newMonitor.type" required>
              <option value="ping">Ping</option>
              <option value="dns">DNS</option>
              <option value="http">HTTP</option>
              <option value="ai-api">AI API</option>
            </select>
          </div>
          <div class="dialog__field">
            <label>层级</label>
            <select v-model="newMonitor.layer" required>
              <option value="L1">L1 - 基础网络</option>
              <option value="L2">L2 - DNS解析</option>
              <option value="L3">L3 - API服务</option>
              <option value="L4">L4 - AI模型</option>
            </select>
          </div>
          <div class="dialog__field">
            <label>目标地址</label>
            <input v-model="newMonitor.url" type="text" required placeholder="IP/域名/URL" />
          </div>
          <div class="dialog__actions">
            <NeonButton type="secondary" @click="showAddDialog = false">取消</NeonButton>
            <NeonButton type="primary">确认添加</NeonButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import socket from '@/socket';
import NeonButton from '@/components/common/NeonButton.vue';
import MonitorCard from '@/components/monitor/MonitorCard.vue';

const router = useRouter();

const monitors = ref([]);
const searchQuery = ref('');
const filterLayer = ref('');
const filterType = ref('');
const filterStatus = ref('');
const showAddDialog = ref(false);

const newMonitor = ref({
  name: '',
  type: 'ping',
  layer: 'L1',
  url: '',
});

const filteredMonitors = computed(() => {
  return monitors.value.filter(m => {
    if (searchQuery.value && !m.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false;
    if (filterLayer.value && m.layer !== filterLayer.value) return false;
    if (filterType.value && m.type !== filterType.value) return false;
    if (filterStatus.value && m.status !== filterStatus.value) return false;
    return true;
  });
});

function loadMonitors() {
  socket.emit('getMonitors', (data) => {
    if (data) {
      monitors.value = Array.isArray(data) ? data : [];
    }
  });
}

function goToMonitor(id) {
  router.push(`/monitor/${id}`);
}

function addMonitor() {
  socket.emit('addMonitor', newMonitor.value, (res) => {
    if (res && res.ok) {
      showAddDialog.value = false;
      newMonitor.value = { name: '', type: 'ping', layer: 'L1', url: '' };
      loadMonitors();
    }
  });
}

function onMonitorUpdate(data) {
  const idx = monitors.value.findIndex(m => m.id === data.id);
  if (idx >= 0) {
    monitors.value[idx] = { ...monitors.value[idx], ...data };
  } else {
    loadMonitors();
  }
}

onMounted(() => {
  loadMonitors();
  socket.on('monitorUpdate', onMonitorUpdate);
});

onBeforeUnmount(() => {
  socket.off('monitorUpdate', onMonitorUpdate);
});
</script>

<style scoped>
.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filters__search {
  flex: 1;
  min-width: 200px;
}

.filters__search-input {
  width: 100%;
}

.filters__group {
  display: flex;
  gap: 8px;
}

.filters__select {
  width: auto;
  min-width: 140px;
}

.monitor-grid {
  margin-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state p {
  margin-bottom: 16px;
  font-size: 1.1rem;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(5, 5, 16, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-card);
  border: 1px solid var(--neon-cyan);
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--glow-cyan);
}

.dialog__title {
  font-size: 1.3rem;
  color: var(--neon-cyan);
  margin-bottom: 24px;
  letter-spacing: 2px;
}

.dialog__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.dialog__field label {
  font-size: 0.8rem;
  color: var(--neon-cyan);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
