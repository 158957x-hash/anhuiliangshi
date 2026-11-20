import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'leaflet/dist/leaflet.css'
import '@/assets/styles/global.scss'
import '@/assets/styles/map-dark.scss'
import '@/assets/styles/mobile-sheet.scss'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 运行时异常不得表现为整页白屏；记录到控制台并在当前页面给出可识别的错误提示。
app.config.errorHandler = (error, instance, info) => {
  console.error('[应用运行异常]', info, error)
  const root = document.querySelector('#app')
  if (root && !root.innerText.trim()) {
    root.innerHTML = `<div style="padding:24px;color:#b42318;font:14px/1.6 system-ui"><b>页面加载失败，请刷新后重试。</b><div style="margin-top:8px;color:#667085">${String(error?.message || error || '未知运行异常')}</div></div>`
  }
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
