// 青贮作物字典：原型内可维护，正式内容以二包共享字典为准。
// 这里仅提供演示初始值，页面会明确“项目字典”来源，不把 mock 值当成正式政策口径。
export const DEFAULT_SIL_CROPS = [
  { code: 'silage_corn', name: '青贮玉米', enabled: true, source: '现有原型' },
  { code: 'silage_sorghum', name: '青贮高粱', enabled: true, source: '现有原型' },
  { code: 'alfalfa', name: '苜蓿', enabled: true, source: '现有原型' },
  { code: 'barley', name: '大麦', enabled: true, source: '可研字段线索' },
  { code: 'oat', name: '燕麦', enabled: true, source: '可研字段线索' },
  { code: 'rye', name: '黑麦', enabled: true, source: '可研字段线索' },
  { code: 'dense_wheat', name: '密植小麦', enabled: true, source: '可研字段线索' },
  { code: 'other', name: '其他', enabled: true, source: '可研字段线索' }
]

const KEY = 'ah_sil_crop_dict'
export const readSilCropDict = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : DEFAULT_SIL_CROPS.map((item) => ({ ...item }))
  } catch { return DEFAULT_SIL_CROPS.map((item) => ({ ...item })) }
}
export const writeSilCropDict = (rows) => localStorage.setItem(KEY, JSON.stringify(rows))
export const enabledSilCrops = () => readSilCropDict().filter((item) => item.enabled)
