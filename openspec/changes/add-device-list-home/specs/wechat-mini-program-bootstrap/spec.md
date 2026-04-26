## MODIFIED Requirements

### Requirement: Starter Home Page
系统 MUST 提供一个以设备列表为核心的首页，用于展示当前设备概览，并提供清晰的主操作入口，验证首页已经具备真实业务承载能力。

#### Scenario: Home page renders device list
- **WHEN** 开发者启动项目并打开默认首页
- **THEN** 页面应展示设备列表而不是初始化说明内容
- **THEN** 页面中应能看到设备名称、所属位置或房间信息，以及设备状态

#### Scenario: Primary add button is visible
- **WHEN** 用户进入首页首屏
- **THEN** 应能在显眼位置看到“添加设备”按钮

## ADDED Requirements

### Requirement: Add Device Drawer
系统 MUST 在用户点击“添加设备”按钮后，从页面底部弹出抽屉式操作面板，并展示预定义的设备添加入口。

#### Scenario: Drawer opens with actions
- **WHEN** 用户点击“添加设备”按钮
- **THEN** 页面底部应弹出抽屉面板
- **THEN** 抽屉中应展示“扫一扫配网”“蓝牙配网”“绑定设备”“取消”四个按钮项

#### Scenario: Drawer can be dismissed
- **WHEN** 用户点击“取消”按钮或抽屉外部遮罩
- **THEN** 抽屉应关闭并返回首页设备列表视图

### Requirement: Add Device Actions Deferred
系统 MUST 在本次版本中仅提供设备添加入口的界面与反馈，不实现实际设备添加流程。

#### Scenario: User taps a pending action
- **WHEN** 用户点击“扫一扫配网”“蓝牙配网”或“绑定设备”任一操作项
- **THEN** 系统应反馈该功能暂未开放
- **THEN** 不应进入实际配网或绑定流程