## MODIFIED Requirements

### Requirement: Starter Home Page
系统 MUST 提供一个以设备列表为核心的首页，用于展示设备概览、设备卡片和主操作入口，并避免展示与设备卡片信息重复的独立房间分布模块。

#### Scenario: Home page focuses on devices
- **WHEN** 用户进入默认首页
- **THEN** 页面应展示设备概览与设备列表
- **THEN** 页面不应再展示单独的房间分布区块

#### Scenario: Device context remains available
- **WHEN** 用户查看设备列表卡片
- **THEN** 仍应能看到设备所属位置或房间信息