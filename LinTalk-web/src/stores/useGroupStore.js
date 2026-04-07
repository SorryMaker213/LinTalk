import { defineStore } from 'pinia'

export const useGroupStore = defineStore('group', {
  state: () => ({
    name: 'LinTalk在线聊天室',
  }),
  actions: {
    setName(name) {
      this.theme = name
    },
  },
})

