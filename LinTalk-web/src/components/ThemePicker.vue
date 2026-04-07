<template>
  <div class="theme-picker" title="切换页面颜色">
    <div class="trigger-btn" aria-label="切换皮肤">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8.7 3.5 10 5h4l1.3-1.5 3.2.9 1.9 4.3-2.9 1.7-1.3-2V20H7.8V8.4l-1.3 2-2.9-1.7 1.9-4.3 3.2-.9z"
        />
      </svg>
    </div>
    <div class="theme-panel">
      <button
        v-for="item in themeOptions"
        :key="item.value"
        class="theme-item"
        :class="{ active: themeStore.theme === item.value }"
        :title="item.label"
        :aria-label="item.label"
        @click="(e) => onSwitchTheme(e, item.value)"
      >
        <span class="theme-dot" :style="{ background: item.color }"></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useThemeStore } from '@/stores/useThemeStore.js'
import { toggleDark } from '@/utils/theme.js'

const themeStore = useThemeStore()

const themeOptions = [
  { value: 'light', label: '蓝', color: '#4c9bff' },
  { value: 'dark', label: '黑', color: '#212121' },
  { value: 'yellow', label: '黄', color: '#e9b300' },
  { value: 'red', label: '红', color: '#e64848' },
  { value: 'purple', label: '紫', color: '#8b5cf6' },
  { value: 'green', label: '绿', color: '#16a34a' },
]

const onSwitchTheme = (event, theme) => {
  if (themeStore.theme === theme) return
  toggleDark(event, theme)
}
</script>

<style lang="less" scoped>
.theme-picker {
  position: relative;
  z-index: 999;

  .trigger-btn {
    width: 30px;
    height: 30px;
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    color: rgb(var(--text-color));

    &:hover {
      background-color: rgb(var(--background-color));
    }

    svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  .theme-panel {
    position: absolute;
    top: 100%;
    right: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 10px;
    border-radius: 10px;
    background-color: rgba(var(--background-color), 0.92);
    border: 1px solid rgba(var(--text-color), 0.08);
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateY(-6px) scale(0.96);
    transform-origin: top right;
    pointer-events: none;
    transition: all 0.2s ease;
    z-index: 1000;
  }

  &:hover {
    .theme-panel {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
  }

  .theme-item {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: none;
    background: transparent;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease;

    &:hover {
      transform: scale(1.08);
    }

    &.active {
      box-shadow: 0 0 0 2px rgba(var(--primary-color), 0.55);
    }

    .theme-dot {
      width: 100%;
      height: 100%;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.7);
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    }
  }
}
</style>
