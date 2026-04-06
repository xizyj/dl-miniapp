const { starterChecklist, starterHighlights } = require('../../utils/starter-data')

Page({
  data: {
    title: '微信小程序初始化完成',
    subtitle: '当前工程已经具备最小可运行骨架，可继续扩展页面与公共模块。',
    highlights: starterHighlights,
    checklist: starterChecklist
  }
})