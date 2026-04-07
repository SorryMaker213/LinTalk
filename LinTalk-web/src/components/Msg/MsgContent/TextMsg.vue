<template>
  <span v-if="isArrayContents" class="text-msg">
    <template v-for="(item, index) in contents" :key="item.id || `txt-${index}`">
      <span v-if="item.type === TextContentType.At" class="text-msg-at" :class="{ right: right }">
        {{ `@${getUserName(item.content)}` }}
      </span>
      <span v-if="item.type === TextContentType.Text">
        {{ item.content }}
      </span>
    </template>
  </span>
  <div v-else>
    {{ props.msg.message }}
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { TextContentType } from '@/constant/textContentType.js'

const props = defineProps({ msg: Object, right: Boolean })
const contents = ref()
watch(
  () => props.msg,
  () => {
    try {
      contents.value = JSON.parse(props.msg?.message)
    } catch {
      contents.value = props.msg?.message
    }
  },
  { immediate: true },
)

const isArrayContents = computed(() => Array.isArray(contents.value))

const getUserName = (content) => {
  try {
    const user = JSON.parse(content)
    return user?.name || '未知用户'
  } catch {
    return typeof content === 'string' && content.trim() ? content : '未知用户'
  }
}
</script>

<style lang="less" scoped>
.text-msg {
  .text-msg-at {
    color: rgba(var(--primary-color));
    font-style: italic;
    margin: 0 2px;
    cursor: pointer;
    font-weight: 600;
    display: inline-block;

    &.right {
      color: white;
    }
  }
}
</style>
