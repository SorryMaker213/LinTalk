<template>
  <lintalk-modal :is-open="isOpen">
    <div class="modify-user-info" @click.stop>
      <lintalk-avatar :info="{ name: name, avatar: avatar }" size="70px" />
      <lintalk-input
        v-model:value="avatar"
        label="头像URL"
        placeholder="请输入头像URL"
        height="40px"
        font-size="14px"
      />
      <lintalk-input
        v-model:value="name"
        label="用户名"
        placeholder="请输入用户名"
        height="40px"
        font-size="14px"
      />
      <lintalk-input
        v-model:value="email"
        label="邮箱"
        placeholder="请输入邮箱"
        height="40px"
        font-size="14px"
        :readonly="true"
      />
      <div class="flex gap-[15px] w-full justify-end mt-[20px]">
        <lintalk-button type="minor" @click="isOpen = false">取消</lintalk-button>
        <lintalk-button @click="onUpdateUser">确定</lintalk-button>
      </div>
    </div>
  </lintalk-modal>
</template>
<script setup>
import LintalkModal from '@/components/LintalkModal.vue'
import LintalkAvatar from '@/components/LintalkAvatar.vue'
import LintalkInput from '@/components/LintalkInput.vue'
import LintalkButton from '@/components/LintalkButton.vue'
import { ref, watch } from 'vue'
import { useUserInfoStore } from '@/stores/useUserInfoStore.js'
import UserApi from '@/api/user.js'
import { useToast } from '@/components/ToastProvider.vue'

const showToast = useToast()
const isOpen = defineModel('isOpen')

const userInfoStore = useUserInfoStore()
const name = ref(userInfoStore.userName)
const email = ref(userInfoStore.email)
const avatar = ref(userInfoStore.avatar)

watch(isOpen, (newVal) => {
  if (newVal) {
    name.value = userInfoStore.userName
    email.value = userInfoStore.email
    avatar.value = userInfoStore.avatar
  }
})

const onUpdateUser = () => {
  if (!name.value || !name.value.trim()) {
    showToast('用户名不能为空~', true)
    return
  }

  UserApi.update({ name: name.value, avatar: avatar.value }).then((res) => {
    if (res.code === 0) {
      userInfoStore.setUserName(name.value)
      userInfoStore.setUserAvatar(avatar.value)
      showToast('修改成功~')
      isOpen.value = false
    } else {
      showToast(res.msg || '修改失败~', true)
    }
  }).catch((err) => {
    showToast(err?.message || '修改失败~', true)
  })
}
</script>
<style lang="less" scoped>
.modify-user-info {
  width: 500px;
  height: 350px;
  background-image: linear-gradient(
    130deg,
    rgba(var(--background-color), 0.7),
    rgba(var(--background-color), 0.9)
  );
  backdrop-filter: blur(10px);
  border: rgba(var(--background-color), 0.5) 3px solid;
  max-width: 90%;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 15px;
}
</style>
