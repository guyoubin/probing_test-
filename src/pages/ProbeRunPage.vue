<template>
  <div class="probe-run-page">
    <h1 class="page-title">拨测执行</h1>

    <!-- Step 1: Suite Selection -->
    <section v-if="step === 1" class="step-section">
      <h2 class="section-title">选择测试套件</h2>
      <div class="grid-5 suite-grid">
        <div
          v-for="suite in suites"
          :key="suite.id"
          class="suite-card"
          :class="{ 'suite-card--selected': selectedSuite === suite.id }"
          @click="selectedSuite = suite.id"
        >
          <div class="suite-card__icon" :style="{ color: suite.color }">{{ suite.icon }}</div>
          <div class="suite-card__name">{{ suite.name }}</div>
          <div class="suite-card__desc">{{ suite.desc }}</div>
          <div class="suite-card__layers">
            <LayerBadge v-for="l in suite.layers" :key="l" :layer="l" />
          </div>
          <div class="suite-card__count">{{ suite.testCount }} 项测试</div>
        </div>
      </div>
      <div class="step-actions">
        <NeonButton :disabled="!selectedSuite" @click="step = 2">下一步 →</NeonButton>
      </div>
    </section>

    <!-- Step 2: Target Configuration -->
    <section v-if="step === 2" class="step-section">
      <h2 class="section-title">目标配置</h2>
      <div class="config-grid">
        <NeonCard title="基础配置" subtitle="TARGET">
          <div class="config-form">
            <div class="config-form__field">
              <label>IP 地址 / 域名</label>
              <input v-model="config.host" type="text" placeholder="8.8.8.8 或 example.com" />
            </div>
            <div class="config-form__field">
              <label>端口</label>
              <input v-model="config.port" type="number" placeholder="443" />
            </div>
            <div class="config-form__field">
              <label>测试轮次</label>
              <input v-model="config.rounds" type="number" placeholder="3" min="1" max="10" />
            </div>
          </div>
        </NeonCard>

        <NeonCard title="API 配置" subtitle="L3 / L4" variant="purple">
          <div class="config-form">
            <div class="config-form__field">
              <label>API URL</label>
              <input v-model="config.apiUrl" type="text" placeholder="https://api.openai.com/v1/chat/completions" />
            </div>
            <div class="config-form__field">
              <label>API Key</label>
              <input v-model="config.apiKey" type="password" placeholder="sk-..." />
            </div>
            <div class="config-form__field">
              <label>AI 模型</label>
              <input v-model="config.model" type="text" placeholder="gpt-4o / claude-3-sonnet" />
            </div>
            <div class="config-form__field">
              <label>请求体 (JSON)</label>
              <textarea v-model="config.body" rows="4" placeholder='{"model":"gpt-4o","messages":[{"role":"user","content":"hi"}]}'></textarea>
            </div>
          </div>
        </NeonCard>
      </div>

      <!-- Probe Node Selection -->
      <NeonCard title="探针节点" subtitle="PROBE NODES" style="margin-top: 20px;">
        <div class="node-select-grid">
          <div
            v-for="node in nodes"
            :key="node.id"
            class="node-select-item"
            :class="{
              'node-select-item--selected': selectedNodes.includes(node.id),
              'node-select-item--offline': node.status !== 'online'
            }"
            @click="toggleNode(node.id)"
          >
            <StatusDot :status="node.status === 'online' ? 'UP' : 'DOWN'" />
            <div class="node-select-item__info">
              <div class="node-select-item__name">{{ node.name }}</div>
              <div class="node-select-item__region">{{ node.region }}</div>
            </div>
          </div>
        </div>
      </NeonCard>

      <div class="step-actions">
        <NeonButton type="secondary" @click="step = 1">← 上一步</NeonButton>
        <NeonButton :disabled="!config.host && !config.apiUrl" @click="startProbe">⚡ 开始测试</NeonButton>
      </div>
    </section>

    <!-- Step 3: Running / Results -->
    <section v-if="step === 3" class="step-section">
      <div class="run-header">
        <h2 class="section-title">
          {{ running ? '测试进行中...' : '测试完成' }}
        </h2>
        <div v-if="running" class="progress-bar">
          <div class="progress-bar__fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="progress-text">{{ completedTests }}/{{ totalTests }} 已完成</span>
      </div>

      <!-- Test Results -->
      <div class="results-grid">
        <div
          v-for="(result, i) in testResults"
          :key="i"
          class="result-card"
          :class="[
            `result-card--${resultStatus(result)}`,
            { 'animate-in': true }
          ]"
        >
          <div class="result-card__header">
            <LayerBadge :layer="result.layer" />
            <StatusDot
              :status="result.status === 'running' ? 'PENDING' : result.status === 'passed' ? 'UP' : 'DOWN'"
            />
          </div>
          <div class="result-card__name">{{ result.name }}</div>
          <div class="result-card__metrics">
            <div v-if="result.latency != null" class="result-card__metric">
              <span class="result-card__metric-label">延迟</span>
              <span class="result-card__metric-value">{{ result.latency }}ms</span>
            </div>
            <div v-if="result.score != null" class="result-card__metric">
              <span class="result-card__metric-label">评分</span>
              <span class="result-card__metric-value" :style="{ color: result.score >= 80 ? 'var(--neon-green)' : result.score >= 50 ? 'var(--neon-yellow)' : 'var(--neon-pink)' }">
                {{ result.score }}
              </span>
            </div>
            <div v-if="result.detail" class="result-card__metric">
              <span class="result-card__metric-label">详情</span>
              <span class="result-card__metric-value detail-text">{{ result.detail }}</span>
            </div>
          </div>
          <div v-if="result.status === 'running'" class="result-card__progress">
            <div class="result-card__progress-bar">
              <div class="result-card__progress-fill"></div>
            </div>
          </div>
          <div v-if="result.error" class="result-card__error">{{ result.error }}</div>
        </div>
      </div>

      <div class="step-actions">
        <NeonButton type="secondary" @click="resetProbe">← 重新配置</NeonButton>
        <NeonButton v-if="!running" type="primary" @click="resetProbe">再次测试</NeonButton>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import socket from '@/socket';
import NeonCard from '@/components/common/NeonCard.vue';
import NeonButton from '@/components/common/NeonButton.vue';
import StatusDot from '@/components/common/StatusDot.vue';
import LayerBadge from '@/components/common/LayerBadge.vue';

const step = ref(1);
const selectedSuite = ref('');
const running = ref(false);

const suites = [
  {
    id: 'full',
    name: '全量测试',
    desc: '覆盖 L1-L4 全层级深度拨测',
    icon: '◆',
    color: 'var(--neon-cyan)',
    layers: ['L1', 'L2', 'L3', 'L4'],
    testCount: 24,
  },
  {
    id: 'network',
    name: '网络质量',
    desc: 'ICMP Ping / TCP连通 / 丢包率 / 抖动',
    icon: '◇',
    color: 'var(--neon-green)',
    layers: ['L1'],
    testCount: 6,
  },
  {
    id: 'api',
    name: 'API 服务',
    desc: 'HTTP状态 / 响应延迟 / SSL证书 / 重定向',
    icon: '▣',
    color: 'var(--neon-purple)',
    layers: ['L3'],
    testCount: 8,
  },
  {
    id: 'security',
    name: '安全合规',
    desc: 'DNS劫持 / TLS版本 / 证书链 / 混合内容',
    icon: '▧',
    color: 'var(--neon-pink)',
    layers: ['L2', 'L3'],
    testCount: 6,
  },
  {
    id: 'quick',
    name: '快速诊断',
    desc: '基础 Ping + DNS + HTTP 快速检查',
    icon: '◁',
    color: 'var(--neon-yellow)',
    layers: ['L1', 'L2', 'L3'],
    testCount: 4,
  },
];

const config = ref({
  host: '',
  port: 443,
  rounds: 3,
  apiUrl: '',
  apiKey: '',
  model: '',
  body: '',
});

const nodes = ref([]);
const selectedNodes = ref([]);
const testResults = ref([]);
const totalTests = ref(0);

const completedTests = computed(() => {
  return testResults.value.filter(r => r.status !== 'running').length;
});

const progress = computed(() => {
  if (totalTests.value === 0) return 0;
  return Math.round((completedTests.value / totalTests.value) * 100);
});

function toggleNode(nodeId) {
  const idx = selectedNodes.value.indexOf(nodeId);
  if (idx >= 0) {
    selectedNodes.value.splice(idx, 1);
  } else {
    selectedNodes.value.push(nodeId);
  }
}

function resultStatus(result) {
  if (result.status === 'running') return 'running';
  if (result.status === 'passed') return 'passed';
  return 'failed';
}

function startProbe() {
  running.value = true;
  step.value = 3;
  testResults.value = [];

  const payload = {
    suite: selectedSuite.value,
    config: { ...config.value },
    nodes: selectedNodes.value,
  };

  socket.emit('startProbe', payload, (res) => {
    if (res && res.testCount) {
      totalTests.value = res.testCount;
    }
  });
}

function resetProbe() {
  step.value = 1;
  running.value = false;
  testResults.value = [];
  totalTests.value = 0;
}

function onProbeStart(data) {
  if (data.tests) {
    testResults.value = data.tests.map(t => ({ ...t, status: 'running' }));
    totalTests.value = data.tests.length;
  }
}

function onProbeResult(data) {
  const idx = testResults.value.findIndex(t => t.id === data.id || t.name === data.name);
  if (idx >= 0) {
    testResults.value[idx] = { ...testResults.value[idx], ...data };
  } else {
    testResults.value.push(data);
  }

  // Check if all done
  if (testResults.value.length > 0 && testResults.value.every(t => t.status !== 'running')) {
    running.value = false;
  }
}

function onProbeComplete() {
  running.value = false;
}

function loadNodes() {
  socket.emit('getProbeNodes', (data) => {
    if (data) {
      nodes.value = Array.isArray(data) ? data : [];
      // Auto-select online nodes
      selectedNodes.value = nodes.value
        .filter(n => n.status === 'online')
        .map(n => n.id);
    }
  });
}

onMounted(() => {
  loadNodes();
  socket.on('probeStart', onProbeStart);
  socket.on('probeResult', onProbeResult);
  socket.on('probeComplete', onProbeComplete);
});

onBeforeUnmount(() => {
  socket.off('probeStart', onProbeStart);
  socket.off('probeResult', onProbeResult);
  socket.off('probeComplete', onProbeComplete);
});
</script>

<style scoped>
.step-section {
  animation: fadeInUp 0.4s ease-out;
}

.suite-grid {
  margin-bottom: 24px;
}

.suite-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.suite-card:hover {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
  transform: translateY(-3px);
}

.suite-card--selected {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
  background: var(--bg-card-alt);
}

.suite-card--selected::after {
  content: '✓';
  position: absolute;
  top: 8px;
  right: 10px;
  color: var(--neon-green);
  font-size: 1.2rem;
}

.suite-card {
  position: relative;
}

.suite-card__icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.suite-card__name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.suite-card__desc {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.4;
}

.suite-card__layers {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-bottom: 8px;
}

.suite-card__count {
  font-size: 0.7rem;
  color: var(--neon-cyan);
  letter-spacing: 1px;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-form__field label {
  font-size: 0.75rem;
  color: var(--neon-cyan);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.config-form__field textarea {
  resize: vertical;
  min-height: 80px;
}

.node-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.node-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.node-select-item:hover {
  border-color: var(--neon-cyan);
}

.node-select-item--selected {
  border-color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.05);
  box-shadow: inset 0 0 8px rgba(0, 240, 255, 0.05);
}

.node-select-item--offline {
  opacity: 0.5;
  cursor: not-allowed;
}

.node-select-item__name {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}

.node-select-item__region {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.run-header {
  margin-bottom: 24px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
  margin: 12px 0 8px;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-pink));
  border-radius: 2px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.progress-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.result-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.result-card--passed {
  border-left: 3px solid var(--neon-green);
}

.result-card--failed {
  border-left: 3px solid #FF4444;
}

.result-card--running {
  border-left: 3px solid var(--neon-cyan);
}

.result-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.result-card__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.result-card__metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-card__metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-card__metric-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.result-card__metric-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-text {
  font-size: 0.75rem;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-card__progress {
  margin-top: 10px;
}

.result-card__progress-bar {
  height: 2px;
  background: var(--border-color);
  border-radius: 1px;
  overflow: hidden;
}

.result-card__progress-fill {
  width: 100%;
  height: 100%;
  background: var(--neon-cyan);
  animation: dataFlow 1.5s linear infinite;
  background-size: 200% 100%;
}

.result-card__error {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--neon-pink);
  word-break: break-all;
}
</style>
