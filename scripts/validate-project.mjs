import { existsSync } from 'node:fs'
import { join } from 'node:path'

const projectRoot = process.cwd()
const requiredFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'sitemap.json',
  'pages/index/index.js',
  'pages/index/index.wxml',
  'pages/index/index.wxss',
  'README.md'
]

const missingFiles = requiredFiles.filter((relativePath) => {
  return !existsSync(join(projectRoot, relativePath))
})

if (missingFiles.length > 0) {
  console.error('缺少以下关键文件:')
  missingFiles.forEach((relativePath) => {
    console.error(`- ${relativePath}`)
  })
  process.exit(1)
}

console.log('微信小程序初始化工程校验通过。')