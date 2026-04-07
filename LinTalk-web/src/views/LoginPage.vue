<template>
  <div class="login-container">
    <div class="operations">
      <theme-picker />
    </div>
    <div :class="['brand', { dark: themeStore.theme === 'dark' }]">LinTalk</div>
    <div class="login-bg">
      <div class="login-content">
        <div v-if="!isVerifySuccess" class="login-box">
          <div class="title">
            <div
              class="text-[28px] text-[rgb(var(--text-color))] font-[600] leading-[28px] mb-[10px]"
            >
              LinTalk在线聊天室
            </div>
            <div class="text-[18px] text-[rgba(var(--text-color),0.7)] leading-[20px]">
              欢迎使用LinTalk
            </div>
          </div>
          <div class="info">
            <lintalk-input
              v-model:value="password"
              placeholder="请输入群聊密码"
              type="password"
              @keydown.enter="onVerifyPassword"
            />
          </div>
          <div @click="onVerifyPassword" :class="['login-button', { logging: logging }]">
            {{ !logging ? '验 证' : '登 录 中' }}
          </div>
        </div>
        <div v-if="isVerifySuccess" class="login-box">
          <div class="title">
            <div class="text-[28px] text-[rgb(var(--text-color))] font-[600] leading-[28px]">
              填写个人信息
            </div>
          </div>
          <div class="info">
            <lintalk-input
              v-model:value="username"
              class="mb-[10px]"
              placeholder="用户名"
              @keydown.enter="onLogin"
            />
            <lintalk-input v-model:value="email" placeholder="邮箱" @keydown.enter="onLogin" />
          </div>
          <div @click="onLogin" :class="['login-button', { logging: logging }]">
            {{ !logging ? '进 入' : '请 等 待' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LintalkInput from '@/components/LintalkInput.vue'
import ThemePicker from '@/components/ThemePicker.vue'
import { useToast } from '@/components/ToastProvider.vue'
import { useRoute, useRouter } from 'vue-router'
import LoginApi from '@/api/login.js'
import { useUserInfoStore } from '@/stores/useUserInfoStore.js'
import { useThemeStore } from '@/stores/useThemeStore.js'

const userInfoStore = useUserInfoStore()
const themeStore = useThemeStore()
const router = useRouter()
const route = useRoute()

const logging = ref(false)
const isVerifySuccess = ref(false)
const password = ref(route.query.p)
const username = ref('')
const email = ref('')
const showToast = useToast()

const pemToArrayBuffer = (pem) => {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const encryptWithRsaOaep = async (publicKeyPem, plainText) => {
  if (!window.crypto || !window.crypto.subtle) {
    return plainText
  }
  const keyBuffer = pemToArrayBuffer(publicKeyPem)
  const cryptoKey = await window.crypto.subtle.importKey(
    'spki',
    keyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt'],
  )

  const encoded = new TextEncoder().encode(plainText)
  const cipher = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    cryptoKey,
    encoded,
  )

  const bytes = new Uint8Array(cipher)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const onVerifyPassword = async () => {
  if (!password.value) {
    showToast('密码不能为空~', true)
    return
  }
  logging.value = true
  Promise.resolve()
    .then(async () => {
      if (!window.crypto || !window.crypto.subtle) {
        return password.value
      }
      const keyData = await LoginApi.publicKey()
      if (keyData.code !== 0) {
        throw new Error(keyData.msg || '获取公钥失败')
      }
      return encryptWithRsaOaep(keyData.data, password.value)
    })
    .then((encryptedPassword) => LoginApi.verify({ password: encryptedPassword }))
    .then((res) => {
      if (res.code === 0) {
        localStorage.setItem('x-token', res.data)
        isVerifySuccess.value = true
      } else {
        showToast(res.msg, true)
      }
    })
    .catch((res) => {
      showToast(res.message, true)
    })
    .finally(() => {
      logging.value = false
    })
}
const onLogin = () => {
  if (!username.value) {
    showToast('用户名不能为空~', true)
    return
  }
  if (!password.value) {
    showToast('邮箱不能为空~', true)
    return
  }
  logging.value = true
  LoginApi.login({ name: username.value, email: email.value })
    .then((res) => {
      if (res.code === 0) {
        localStorage.setItem('x-token', res.data.token)
        userInfoStore.setUserInfo({
          userId: res.data.userId,
          userName: res.data.userName,
          email: res.data.email,
          avatar: res.data.avatar,
        })
        router.push('/')
      } else {
        showToast(res.msg, true)
      }
    })
    .catch((res) => {
      showToast(res.message, true)
    })
    .finally(() => {
      logging.value = false
    })
}
</script>

<style lang="less" scoped>
.login-container {
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  background: var(--screen-bg-color);

  .operations {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    @media screen and (max-height: 500px) {
      display: none;
    }
  }

  .brand {
    position: absolute;
    top: 18px;
    left: 22px;
    font-size: 34px;
    line-height: 1;
    font-weight: 700;
    font-family:
      'Arial Rounded MT Bold',
      'Segoe UI Rounded',
      'Trebuchet MS',
      sans-serif;
    color: rgb(var(--primary-color));
    letter-spacing: 1px;
    user-select: none;
    @media screen and (max-width: 1000px) {
      font-size: 28px;
    }
    @media screen and (max-height: 500px) {
      display: none;
    }
  }

  .brand.dark {
    color: #ffffff;
  }

  .login-bg {
    width: 100%;
    height: 100%;
    display: flex;
    background-image: var(--scrren-grid-bg-color);
    background-size: 50px 50px;
  }

  .login-content {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-size: 50px 50px;
    flex-direction: column;

    .login-box {
      width: 600px;
      height: 360px;
      border-radius: 10px;
      background-image: linear-gradient(
        130deg,
        rgba(var(--background-color), 0.3),
        rgba(var(--background-color), 0.5)
      );
      backdrop-filter: blur(10px);
      border: rgba(var(--background-color), 0.5) 3px solid;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 60px;

      @media screen and (max-width: 1000px) {
        width: 95%;
        padding: 60px 20px;
      }

      .title {
        display: flex;
        flex-direction: column;
      }

      .info {
        margin-top: 20px;
        margin-bottom: 20px;
      }

      .login-button {
        width: 100%;
        height: 50px;
        font-size: 24px;
        font-weight: 600;
        color: #ffffff;
        background-color: rgb(var(--primary-color));
        border-radius: 5px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        user-select: none;

        &.logging,
        &:hover {
          background-color: rgba(var(--primary-color), 0.8);
        }
      }
    }
  }
}
</style>

