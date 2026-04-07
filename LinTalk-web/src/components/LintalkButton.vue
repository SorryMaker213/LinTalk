<template>
  <div class="custom-button" :class="[props.class, props.type]" :style="props.style">
    <slot />
  </div>
</template>
<script setup>
const props = defineProps({
  class: String,
  style: Object,
  type: String,
})
</script>
<style lang="less" scoped>
.custom-button {
  width: 70px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(var(--primary-color));
  border-radius: 5px;
  color: #ffffff;
  user-select: none;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background-color: rgba(var(--primary-color), 0.8);
  }

  &.minor {
    color: rgb(var(--text-color));
    background-color: rgba(var(--primary-color), 0.12);

    &:hover {
      background-color: rgba(var(--primary-color), 0.2);
    }
  }

  &.error {
    background-color: #ff4c4c;

    &:hover {
      background-color: rgba(255, 76, 76, 0.6);
    }
  }
}
</style>
