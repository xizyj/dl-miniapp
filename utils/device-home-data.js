const deviceOverview = [
  {
    label: '在线设备',
    value: '4 台'
  },
  {
    label: '离线设备',
    value: '1 台'
  },
  {
    label: '今日提醒',
    value: '2 条'
  }
]

const devices = [
  {
    id: 'MYF-00011C00D5AD',
    name: '目标设备',
    room: '默认空间',
    category: '网关',
    online: true,
    statusText: '在线',
    detail: '设备ID: MYF-00011C00D5AD'
  }
]

const addDeviceActions = [
  {
    action: 'scan',
    label: '扫一扫配网'
  },
  {
    action: 'bluetooth',
    label: '蓝牙配网'
  },
  {
    action: 'bind',
    label: '绑定设备'
  },
  {
    action: 'cancel',
    label: '取消'
  }
]

module.exports = {
  addDeviceActions,
  deviceOverview,
  devices
}