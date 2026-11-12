// 演示证据图片 URL（文生图生成，仅原型演示用；真实系统为移动端采集的加水印原片/视频）
const IMG = (prompt, size = 'square') =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`

export const EVIDENCE_IMAGES = {
  wheatField: IMG('handheld photo of winter wheat field farmland in northern China, sunny day, field inspection, farmland protection'),
  violationSeedling: IMG('farmland illegally planted with ornamental nursery seedlings, aerial drone photo of basic farmland, violation of grain planting'),
  greenhouse: IMG('vegetable greenhouse structures occupying farmland, drone aerial photo, rural China, non-grain use'),
  pond: IMG('excavated aquaculture fish pond occupying farmland, aerial drone photo, rural China'),
  cornField: IMG('summer corn field farmland, handheld photo, daylight, crop inspection'),
  rectified: IMG('restored farmland with young crop rows after rectification, handheld photo, sunny day, grain planting recovered'),
  videoCover: IMG('smartphone camera viewfinder recording farmland inspection video, outdoor daylight')
}

// 核查现场照片轮换顺序（演示：让同批次内照片不重复）
const PHOTO_URLS = [EVIDENCE_IMAGES.wheatField, EVIDENCE_IMAGES.violationSeedling, EVIDENCE_IMAGES.greenhouse]

// 为演示附件补图片 URL：photo 按顺序轮换场景图，video 用录制画面封面，整改后照片用恢复耕地图
export const fillEvidenceUrls = (attachments, startIndex = 0, forceUrl = '') => {
  let n = startIndex
  ;(attachments || []).forEach((a) => {
    if (a.url) return
    a.url = forceUrl || (a.type === 'video' ? EVIDENCE_IMAGES.videoCover : PHOTO_URLS[(n++) % PHOTO_URLS.length])
  })
  return n
}
