<template>
  <div
    v-if="visible"
    @mousedown.stop
    class="lintalk-popup"
    :class="{ overlay: props.overlay }"
    @click="handlerOverlay"
  >
    <div
      ref="contentRef"
      class="content"
      :style="{
        top: top + 'px',
        left: left + 'px',
        outline: 'none',
      }"
      tabindex="0"
      @blur="handleBlur"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  position: Object,
  isFocus: {
    type: Boolean,
    default: true,
  },
  overlay: {
    type: Boolean,
    default: false,
  },
})

const top = ref(0)
const left = ref(0)

const emit = defineEmits(['close'])
const visible = defineModel('visible')
const contentRef = ref()

watch(
  () => visible.value,
  () => {
    if (visible.value) {
      nextTick(() => {
        if (props.isFocus) contentRef.value.focus()
        const positionTop = props.position?.top || 0
        const positionLeft = props.position?.left || 0
        const contentHeight = contentRef.value?.offsetHeight || 0
        const contentWidth = contentRef.value?.offsetWidth || 0
        const maxTop = Math.max(8, window.innerHeight - contentHeight - 8)
        const maxLeft = Math.max(8, window.innerWidth - contentWidth - 8)
        top.value = Math.min(maxTop, Math.max(8, positionTop - contentHeight))
        left.value = Math.min(maxLeft, Math.max(8, positionLeft))
      })
    }
  },
)

const handlerOverlay = () => {
  if (props.overlay) {
    handleBlur()
  }
}

const handleBlur = () => {
  visible.value = false
  emit('close')
}

const updateWindowSize = () => {
  handleBlur()
}

onMounted(() => {
  window.addEventListener('resize', updateWindowSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWindowSize)
})
</script>

<style lang="less" scoped>
.lintalk-popup {
  .content {
    position: absolute;
    z-index: 88;
  }

  &.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
