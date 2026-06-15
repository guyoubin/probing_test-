<template>
  <div class="setup-page">
    <div class="setup-page__bg"></div>
    <div class="setup-page__container">
      <div class="setup-page__header">
        <h1 class="setup-page__title">CYBERPROBE</h1>
        <p class="setup-page__subtitle">// 系统初始化 — 创建管理员账号</p>
      </div>

      <form class="setup-page__form" @submit.prevent="handleSetup">
        <div class="setup-page__field">
          <label class="setup-page__label">管理员用户名</label>
          <input
            v-model="form.username"
            type="text"
            placeholder="admin"
            required
            autocomplete="username"
          />
        </div>

        <div class="setup-page__field">
          <label class="setup-page__label">密码</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>

        <div class="setup-page__field">
          <label class="setup-page__label">确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
          />
        </div>

        <div class="setup-page__field">
          <label class="setup-page__label">邮箱 (可选)</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="admin@cyberprobe.local"
            autocomplete="email"
          />
        </div>

        <p v-if="error" class="setup-page__error">{{ error }}</p>

        <NeonButton type="primary" block :disabled="loading">
          {{ loading ? '正在初始化...' : '初始化系统' }}
        </NeonButton>
      </form>

      <div class="setup-page__footer">
        <span>CyberProbe v1.0.0</span>
        <span>// 赛博拨测系统</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NeonButton from '@/components/common/NeonButton.vue';
import socket from '@/socket';

const router = useRouter();

const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
});

const loading = ref(false);
const error = ref('');

onMounted(() => {
  // Check if setup is still needed
  fetch('/api/setup-status')
    .then(r => r.json())
    .then(data => {
      if (!data.needSetup) {
        router.replace('/');
      }
    })
    .catch(() => {});
});

async function handleSetup() {
  error.value = '';

  if (form.value.password !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致';
    return;
  }

  if (form.value.password.length < 6) {
    error.value = '密码至少6位';
    return;
  }

  loading.value = true;

  try {
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.value.username,
        password: form.value.password,
        email: form.value.email,
      }),
    });

    const data = await res.json();

    if (data.ok || data.token) {
      router.replace('/');
    } else {
      error.value = data.msg || '初始化失败';
    }
  } catch (e) {
    error.value = '网络错误，请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.setup-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-void);
  position: relative;
  overflow: hidden;
}

.setup-page__bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 240, 255, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 50%, rgba(255, 46, 147, 0.06) 0%, transparent 60%);
  pointer-events: none;
}

.setup-page__container {
  width: 100%;
  max-width: 440px;
  padding: 40px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  position: relative;
  z-index: 1;
}

.setup-page__container::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-pink));
  opacity: 0.15;
  z-index: -1;
}

.setup-page__header {
  text-align: center;
  margin-bottom: 32px;
}

.setup-page__title {
  font-size: 2rem;
  color: var(--neon-cyan);
  text-shadow: var(--glow-cyan);
  letter-spacing: 6px;
  margin-bottom: 8px;
}

.setup-page__subtitle {
  color: var(--text-secondary);
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.setup-page__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setup-page__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setup-page__label {
  font-size: 0.8rem;
  color: var(--neon-cyan);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.setup-page__error {
  color: var(--neon-pink);
  font-size: 0.85rem;
  text-align: center;
  text-shadow: 0 0 6px rgba(255, 46, 147, 0.3);
}

.setup-page__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  letter-spacing: 1px;
}
</style>
