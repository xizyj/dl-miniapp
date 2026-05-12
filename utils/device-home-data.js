const HOME_DEVICE_STORAGE_KEY = 'homeDevice'

function createHomeDevice(deviceId, name = '我的设备') {
  return {
    id: deviceId,
    name,
    room: '默认空间',
    category: '网关',
    online: true,
    statusText: '在线',
    detail: `设备ID: ${deviceId}`
  }
}

function getStoredHomeDevice() {
  const storedDevice = wx.getStorageSync(HOME_DEVICE_STORAGE_KEY)

  if (!storedDevice || typeof storedDevice !== 'object') {
    return null
  }

  const deviceId = typeof storedDevice.id === 'string' ? storedDevice.id.trim() : ''

  if (!deviceId) {
    return null
  }

  return createHomeDevice(deviceId, storedDevice.name || '我的设备')
}

function getHomeDevices() {
  const device = getStoredHomeDevice()

  return device ? [device] : []
}

function saveHomeDevice(deviceInfo) {
  const normalizedDevice = typeof deviceInfo === 'string'
    ? createHomeDevice(deviceInfo.trim())
    : createHomeDevice(
      typeof deviceInfo.deviceId === 'string' ? deviceInfo.deviceId.trim() : '',
      deviceInfo.name || '我的设备'
    )

  if (!normalizedDevice.id) {
    return null
  }

  wx.setStorageSync(HOME_DEVICE_STORAGE_KEY, normalizedDevice)

  return normalizedDevice
}

const addDeviceActions = [
  {
    action: 'scan',
    label: '扫一扫'
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
  HOME_DEVICE_STORAGE_KEY,
  createHomeDevice,
  getHomeDevices,
  getStoredHomeDevice,
  saveHomeDevice
}