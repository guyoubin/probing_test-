<template>
  <div class="response-time-chart">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const props = defineProps({
  data: { type: Array, default: () => [] }, // [{ time, value }]
  label: { type: String, default: '响应时间 (ms)' },
  maxDataPoints: { type: Number, default: 50 },
});

const canvasRef = ref(null);
let chartInstance = null;

function createChart() {
  if (!canvasRef.value) return;
  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = props.data.map(d => {
    if (d.time) {
      const date = new Date(d.time);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return '';
  });
  const values = props.data.map(d => d.value ?? d.latency ?? 0);

  chartInstance = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: props.label,
        data: values,
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#00F0FF',
        pointHoverBorderColor: '#00F0FF',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#12122A',
          titleColor: '#00F0FF',
          bodyColor: '#E8E8F0',
          borderColor: '#2A2A4A',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          display: true,
          ticks: {
            color: '#9999BB',
            maxTicksLimit: 8,
            font: { size: 10 },
          },
          grid: {
            color: 'rgba(42, 42, 74, 0.5)',
          },
        },
        y: {
          display: true,
          ticks: {
            color: '#9999BB',
            font: { size: 10 },
          },
          grid: {
            color: 'rgba(42, 42, 74, 0.5)',
          },
          min: 0,
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    },
  });
}

onMounted(() => {
  createChart();
});

watch(() => props.data, () => {
  createChart();
}, { deep: true });

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<style scoped>
.response-time-chart {
  width: 100%;
  height: 250px;
  position: relative;
}
</style>
