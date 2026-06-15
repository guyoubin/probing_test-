<template>
  <div class="settings-page">
    <h1 class="page-title">设置</h1>

    <div class="settings-grid">
      <!-- Notification Settings -->
      <NeonCard title="通知配置" subtitle="NOTIFICATION" variant="cyan">
        <div class="settings-form">
          <div class="settings-form__field">
            <label>通知方式</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input v-model="settings.notifyEmail" type="checkbox" />
                <span>邮件通知</span>
              </label>
              <label class="checkbox-label">
                <input v-model="settings.notifyWebhook" type="checkbox" />
                <span>Webhook</span>
              </label>
            </div>
          </div>
          <div class="settings-form__field">
            <label>邮件地址</label>
            <input v-model="settings.email" type="email" placeholder="admin@example.com" />
          </div>
          <div class="settings-form__field">
            <label>Webhook URL</label>
            <input v-model="settings.webhookUrl" type="text" placeholder="https://hooks.example.com/..." />
          </div>
          <div class="settings-form__field">
            <label>告警阈值 (ms)</label>
            <input v-model="settings.alertThreshold" type="number" placeholder="1000" />
          </div>
        </div>
      </NeonCard>

      <!-- General Settings -->
      <NeonCard title="通用设置" subtitle="GENERAL" variant="purple">
        <div class="settings-form">
          <div class="settings-form__field">
            <label>心跳间隔 (秒)</label>
            <input v-model="settings.heartbeatInterval" type="number" placeholder="60" min="10" />
          </div>
          <div class="settings-form__field">
            <label>数据保留天数</label>
            <input v-model="settings.dataRetentionDays" type="number" placeholder="30" min="1" />
          </div>
          <div class="settings-form__field">
            <label>时区</label>
            <select v-model="settings.timezone">
              <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>
          <div class="settings-form__field">
            <label>主题</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input v-model="settings.scanlineEffect" type="checkbox" />
                <span>CRT 扫描线效果</span>
              </label>
            </div>
          </div>
        </div>
      </NeonCard>
    </div>

    <div class="settings-actions">
      <NeonButton @click="saveSettings">保存设置</NeonButton>
      <NeonButton type="secondary" @click="loadSettings">重置</NeonButton>
    </div>

    <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import socket from '@/socket';
import NeonCard from '@/components/common/NeonCard.vue';
import NeonButton from '@/components/common/NeonButton.vue';

const settings = ref({
  notifyEmail: false,
  notifyWebhook: false,
  email: '',
  webhookUrl: '',
  alertThreshold: 1000,
  heartbeatInterval: 60,
  dataRetentionDays: 30,
  timezone: 'Asia/Shanghai',
  scanlineEffect: true,
});

const saveMsg = ref('');

function loadSettings() {
  socket.emit('getSettings', (data) => {
    if (data) {
      settings.value = { ...settings.value, ...data };
    }
  });
}

function saveSettings() {
  socket.emit('saveSettings', settings.value, (res) => {
    if (res && res.ok) {
      saveMsg.value = '设置已保存';
      setTimeout(() => { saveMsg.value = ''; }, 3000);
    }
  });
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-form__field label {
  font-size: 0.75rem;
  color: var(--neon-cyan);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.checkbox-group {
  display: flex;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  accent-color: var(--neon-cyan);
}

.settings-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.save-msg {
  margin-top: 12px;
  font-size: 0.85rem;
  color: var(--neon-green);
  letter-spacing: 1px;
}
</style>
