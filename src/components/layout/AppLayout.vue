<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
      <div class="sidebar__logo" @click="collapsed = !collapsed">
        <span class="sidebar__logo-icon">⚡</span>
        <span v-if="!collapsed" class="sidebar__logo-text">CYBERPROBE</span>
      </div>

      <nav class="sidebar__nav">
        <router-link to="/" class="sidebar__link" :class="{ 'sidebar__link--active': $route.path === '/' }">
          <span class="sidebar__link-icon">◉</span>
          <span v-if="!collapsed" class="sidebar__link-text">仪表盘</span>
        </router-link>
        <router-link to="/monitors" class="sidebar__link" :class="{ 'sidebar__link--active': $route.path.startsWith('/monitor') }">
          <span class="sidebar__link-icon">◈</span>
          <span v-if="!collapsed" class="sidebar__link-text">监控列表</span>
        </router-link>
        <router-link to="/probe/run" class="sidebar__link" :class="{ 'sidebar__link--active': $route.path.startsWith('/probe/run') }">
          <span class="sidebar__link-icon">▶</span>
          <span v-if="!collapsed" class="sidebar__link-text">拨测执行</span>
        </router-link>
        <router-link to="/probe/nodes" class="sidebar__link" :class="{ 'sidebar__link--active': $route.path === '/probe/nodes' }">
          <span class="sidebar__link-icon">⬡</span>
          <span v-if="!collapsed" class="sidebar__link-text">探针节点</span>
        </router-link>
        <router-link to="/reports" class="sidebar__link" :class="{ 'sidebar__link--active': $route.path === '/reports' }">
          <span class="sidebar__link-icon">▤</span>
          <span v-if="!collapsed" class="sidebar__link-text">报告</span>
        </router-link>
        <router-link to="/settings" class="sidebar__link" :class="{ 'sidebar__link--active': $route.path === '/settings' }">
          <span class="sidebar__link-icon">⚙</span>
          <span v-if="!collapsed" class="sidebar__link-text">设置</span>
        </router-link>
      </nav>

      <div class="sidebar__footer">
        <div v-if="!collapsed" class="sidebar__status">
          <StatusDot status="UP" />
          <span class="sidebar__status-text">系统在线</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <div class="main-content__inner">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import StatusDot from '@/components/common/StatusDot.vue';

const collapsed = ref(false);
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: var(--bg-dark);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.sidebar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(
    to bottom,
    var(--neon-cyan),
    var(--neon-pink),
    var(--neon-purple)
  );
  opacity: 0.3;
}

.sidebar--collapsed {
  width: 60px;
}

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
}

.sidebar__logo-icon {
  font-size: 1.5rem;
  color: var(--neon-cyan);
  text-shadow: var(--glow-cyan);
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}

.sidebar__logo-text {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 3px;
  color: var(--neon-cyan);
  text-shadow: var(--glow-cyan);
  white-space: nowrap;
}

.sidebar__nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

.sidebar__link:hover {
  color: var(--text-primary);
  background: rgba(0, 240, 255, 0.05);
}

.sidebar__link--active {
  color: var(--neon-cyan) !important;
  background: rgba(0, 240, 255, 0.08);
  border-left: 2px solid var(--neon-cyan);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
}

.sidebar__link-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}

.sidebar__link-text {
  white-space: nowrap;
}

.sidebar__footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.sidebar__status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar__status-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.main-content {
  flex: 1;
  min-width: 0;
  background: var(--bg-void);
  overflow-y: auto;
  height: 100vh;
}

.main-content__inner {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
