<template>
  <button class="neon-btn" :class="[`neon-btn--${type}`, { 'neon-btn--block': block }]" :disabled="disabled" @click="$emit('click', $event)">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  type: { type: String, default: 'primary' }, // primary, secondary, danger
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
});

defineEmits(['click']);
</script>

<style scoped>
.neon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.neon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.neon-btn--primary {
  background: transparent;
  color: var(--neon-cyan);
  border-color: var(--neon-cyan);
}

.neon-btn--primary:not(:disabled):hover {
  background: rgba(0, 240, 255, 0.1);
  box-shadow: var(--glow-cyan);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
}

.neon-btn--primary:not(:disabled):active {
  background: rgba(0, 240, 255, 0.2);
}

.neon-btn--secondary {
  background: transparent;
  color: var(--neon-purple);
  border-color: var(--neon-purple);
}

.neon-btn--secondary:not(:disabled):hover {
  background: rgba(177, 78, 255, 0.1);
  box-shadow: 0 0 10px rgba(177, 78, 255, 0.3), 0 0 20px rgba(177, 78, 255, 0.1);
}

.neon-btn--danger {
  background: transparent;
  color: var(--neon-pink);
  border-color: var(--neon-pink);
}

.neon-btn--danger:not(:disabled):hover {
  background: rgba(255, 46, 147, 0.1);
  box-shadow: var(--glow-pink);
}

.neon-btn--block {
  display: flex;
  width: 100%;
}
</style>
