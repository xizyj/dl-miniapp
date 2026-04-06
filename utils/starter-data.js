const starterHighlights = [
  {
    label: '应用入口',
    value: 'app.js / app.json / app.wxss'
  },
  {
    label: '默认页面',
    value: 'pages/index/index'
  },
  {
    label: '校验命令',
    value: 'npm run check'
  }
]

const starterChecklist = [
  {
    text: '使用微信开发者工具导入 mini-app 根目录，确认项目可以正常识别。'
  },
  {
    text: '查看首页文案和样式，确认初始化骨架已经生效。'
  },
  {
    text: '后续新增页面时先更新 OpenSpec，再补充 app.json 路由。'
  }
]

module.exports = {
  starterChecklist,
  starterHighlights
}