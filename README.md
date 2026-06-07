# AI 硬件智能体 · 微信小程序

面向 MYF / DL 系列 AI 硬件设备的微信小程序，提供设备添加、蓝牙配网、设备管理与模型配置等能力。

## 功能概览

| 模块 | 说明 |
| --- | --- |
| 首页 | 展示已添加设备，支持扫一扫、蓝牙配网、手动绑定设备 |
| 蓝牙搜索 | 扫描并筛选 `MYF-`、`DL-` 前缀设备，连接后进入配网流程 |
| 蓝牙配网 | 基于 BLUFI 协议，为设备配置 Wi-Fi 并自动登录绑定 |
| 设备详情 | 查看设备模型信息，支持历史对话、模型市场、重置设备等操作 |
| 历史对话 | 分页查看设备聊天记录 |
| 模型市场 | 浏览并绑定 GPT 模型到设备 |
| 创建智能体 | 已实现，当前默认隐藏入口（`CREATE_AGENT_VISIBLE = false`） |

## 技术栈

- 微信小程序原生开发（WXML / WXSS / JS）
- 蓝牙配网：BLUFI 协议（`utils/blufi/`）
- 后端 API：`https://aigo.8ms.xyz/api`
- 本地存储：设备列表、认证 Token、Wi-Fi 密码缓存

## 目录结构

```
mini-app/
├── app.js / app.json / app.wxss    # 小程序入口与全局配置
├── pages/
│   ├── index/                      # 首页 · 设备列表与添加入口
│   ├── search/                     # 蓝牙设备搜索
│   ├── device/                     # 蓝牙配网 · Wi-Fi 选择与提交
│   ├── device-detail/              # 设备详情与快捷功能
│   ├── chat-history/               # 历史对话
│   ├── model-market/               # 模型市场
│   └── create-agent/               # 创建智能体（暂隐藏）
├── utils/
│   ├── blufi/                      # BLUFI 配网核心库
│   ├── http.js                     # API 请求与设备登录
│   ├── device-id.js                # 设备 ID 规范化（MYF- 前缀）
│   └── device-home-data.js         # 首页设备本地存储
├── images/                         # 静态图片资源
└── scripts/validate-project.mjs    # 工程结构校验脚本
```

## 快速开始

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 基础库建议 `3.x`（当前工程配置为 `3.15.1`）
- 真机调试（蓝牙、Wi-Fi 扫描、扫码等功能需使用真机）

### 本地运行

1. 克隆仓库到本地
2. 使用微信开发者工具打开项目根目录
3. 在开发者工具中填写自己的 AppID（或使用测试号）
4. 编译并在真机上预览调试

```bash
npm run check   # 校验关键文件是否齐全
npm start       # 提示使用微信开发者工具打开
```

## 主要流程

### 添加设备

首页点击右下角 **+** 按钮，可选择：

1. **扫一扫**：扫描设备二维码，自动识别 `deviceId` 并登录绑定
2. **蓝牙配网**：搜索 MYF / DL 设备 → 蓝牙连接 → 选择 Wi-Fi → 提交配网 → 自动绑定
3. **绑定设备**：手动输入设备 ID 完成绑定

### 蓝牙配网

```
首页 → 蓝牙配网 → 搜索设备 → 连接设备 → 选择 Wi-Fi → 输入密码 → 开始配网
```

- 仅展示名称以 `MYF-` 或 `DL-` 开头的蓝牙设备
- 未搜索到设备时显示「没有搜索到设备」
- 支持扫描附近 Wi-Fi 列表，不限于手机当前连接的 Wi-Fi
- 配网成功后自动调用设备登录接口并保存到首页

### 设备管理

进入设备详情后可使用：

- **历史对话**：查看设备聊天记录
- **模型市场**：为设备绑定模型
- **重置设备**：远程重置，重置后可能需要重新配网
- **创建智能体**：代码已保留，修改 `pages/device-detail/device-detail.js` 中 `CREATE_AGENT_VISIBLE = true` 即可恢复入口

## 配置说明

### API 地址

后端地址定义在 `utils/http.js`：

```js
const API_BASE_URL = 'https://aigo.8ms.xyz/api'
```

如需切换环境，修改该常量即可。

### 设备 ID 规范

`utils/device-id.js` 会将设备 ID 统一规范为 `MYF-` 前缀格式，例如：

- 输入 `00011C00D5AD` → `MYF-00011C00D5AD`
- 输入 `MYF-00011C00D5AD` → 保持不变

### 权限声明

`app.json` 中已声明以下权限，用于 Wi-Fi 列表扫描：

- `scope.userLocation`：Android 平台扫描附近 Wi-Fi 时需要
- `requiredPrivateInfos: ["getLocation"]`：隐私合规配置

蓝牙相关能力需在小程序后台开通，并在真机上授权蓝牙权限。

## 开发说明

### BLUFI 配网库

`utils/blufi/` 目录封装了微信小程序端的 BLUFI 蓝牙配网能力，核心文件：

| 文件 | 作用 |
| --- | --- |
| `xBlufi.js` | 对外 API 与事件类型定义 |
| `xBlufi-wx-impl.js` | 微信蓝牙 API 实现 |
| `util.js` | 协议组包、设备名过滤等工具函数 |

页面通过监听 `xBlufi` 事件驱动搜索、连接、初始化与配网流程。

### 本地存储 Key

| Key | 用途 |
| --- | --- |
| `homeDevice` | 首页展示的设备信息 |
| `authToken` | 设备认证 Token |
| `authDeviceId` | 当前认证绑定的设备 ID |
| `{ssid}` | 各 Wi-Fi 的历史密码缓存 |

### 隐藏功能开关

| 开关 | 位置 | 默认值 |
| --- | --- | --- |
| `CREATE_AGENT_VISIBLE` | `pages/device-detail/device-detail.js` | `false` |

## 注意事项

1. **真机调试**：蓝牙配网、Wi-Fi 扫描、扫码等功能无法在模拟器中完整验证。
2. **iOS Wi-Fi 列表**：若扫描结果为空，需按提示进入系统「设置 → Wi-Fi」后再返回小程序刷新列表。
3. **设备配网模式**：设备需进入 BLUFI 配网状态；若设备暴露业务服务 `FD5C` 而非 BLUFI 服务，配网会失败并给出相应提示。
4. **project.config.json**：该文件已被 `.gitignore` 忽略，首次导入项目时由微信开发者工具自动生成。

## 致谢

蓝牙配网能力基于开源项目 [BlufiEsp32WeChat](https://github.com/xuhongv/BlufiEsp32WeChat) 的 BLUFI 实现演进而来，在此向原作者表示感谢。
