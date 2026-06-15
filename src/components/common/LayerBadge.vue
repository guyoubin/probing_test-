<template>
  <span class="layer-badge" :class="[`layer-badge--${layer}`]">
    {{ layer }}
  </span>
</template>

<script setup>
defineProps({
  layer: { type: String, required: true }, // L1, L2, L3, L4
});
</script>

<style scoped>
.layer-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  border-radius: 3px;
  border: 1px solid;
  text-transform: uppercase;
}

.layer-badge--L1 {
  color: var(--layer-l1);
  border-color: var(--layer-l1);
  background: rgba(0, 240, 255, 0.08);
  text-shadow: 0 0 6px rgba(0, 240, 255, 0.4);
}

.layer-badge--L2 {
  color: var(--layer-l2);
  border-color: var(--layer-l2);
  background: rgba(177, 78, 255, 0.08);
  text-shadow: 0 0 6px rgba(177, 78, 255, 0.4);
}

.layer-badge--L3 {
  color: var(--layer-l3);
  border-color: var(--layer-l3);
  background: rgba(255, 46, 147, 0.08);
  text-shadow: 0 0 6px rgba(255, 46, 147, 0.4);
}

.layer-badge--L4 {
  color: var(--layer-l4);
  border-color: var(--layer-l4);
  background: rgba(255, 225, 86, 0.08);
  text-shadow: 0 0 6px rgba(255, 225, 86, 0.4);
}
</style>
