<template>
  <div class="neon-card" :class="[`neon-card--${variant}`]" @click="$emit('click', $event)">
    <div v-if="title" class="neon-card__header">
      <h3 class="neon-card__title">{{ title }}</h3>
      <span v-if="subtitle" class="neon-card__subtitle">{{ subtitle }}</span>
    </div>
    <div class="neon-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="neon-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  variant: { type: String, default: 'default' }, // default, cyan, pink, purple
});

defineEmits(['click']);
</script>

<style scoped>
.neon-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.neon-card:hover {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
  transform: translateY(-2px);
}

.neon-card--cyan:hover {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
}

.neon-card--pink:hover {
  border-color: var(--neon-pink);
  box-shadow: var(--glow-pink);
}

.neon-card--purple:hover {
  border-color: var(--neon-purple);
  box-shadow: 0 0 10px rgba(177, 78, 255, 0.3), 0 0 20px rgba(177, 78, 255, 0.1);
}

.neon-card--selected {
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
  background: var(--bg-card-alt);
}

.neon-card__header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-color);
}

.neon-card__title {
  font-size: 1rem;
  color: var(--neon-cyan);
  letter-spacing: 1px;
}

.neon-card__subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}

.neon-card__body {
  padding: 20px;
}

.neon-card__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.2);
}
</style>
