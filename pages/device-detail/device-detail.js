const { buildApiUrl, request } = require('../../utils/http')
const DEVICE_DETAIL_BASE_URL = buildApiUrl('/user_device/deviceInfo')
const RESET_DEVICE_BASE_URL = buildApiUrl('/device_setting/reset')
const UNBIND_DEVICE_URL = buildApiUrl('/appuser/bindDevice')
const QUICK_ACTIONS = [
  {
    key: 'agent',
    iconText: 'AI',
    iconClass: 'icon-agent',
    label: '创建智能体'
  },
  {
    key: 'history',
    iconText: '时',
    iconClass: 'icon-history',
    label: '历史对话'
  },
  {
    key: 'market',
    iconText: '模',
    iconClass: 'icon-market',
    label: '模型市场'
  },
  {
    key: 'help',
    iconText: '助',
    iconClass: 'icon-help',
    label: '帮助文档'
  },
  {
    key: 'reset',
    iconText: '重',
    iconClass: 'icon-reset',
    label: '重置设备'
  },
  {
    key: 'unbind',
    iconText: '解',
    iconClass: 'icon-unbind',
    label: '解绑设备'
  }
]

// Flatten the API payload to the small view model required by the detail page.
function getDetailState(responseData, fallbackDeviceId) {
  const bot = responseData.data.bot || {}
  const settings = responseData.data.settings || {}

  return {
    loading: false,
    errorMessage: '',
    deviceId: settings.deviceId || fallbackDeviceId,
    modelName: bot.modelName || '',
    model: bot.model || '',
    modelPrefix: bot.modelPrefix || '',
    version: extractVersion(settings.shadow)
  }
}

function showToast(title) {
  wx.showToast({
    title,
    icon: 'none'
  })
}

function extractVersion(shadow) {
  if (!shadow) {
    return ''
  }

  try {
    const shadowData = JSON.parse(shadow)
    return shadowData.version || ''
  } catch (error) {
    return ''
  }
}

Page({
  data: {
    loading: true,
    errorMessage: '',
    deviceId: '',
    modelName: '',
    model: '',
    modelPrefix: '',
    version: '',
    quickActions: QUICK_ACTIONS
  },

  onLoad(options) {
    const deviceId = options.deviceId || ''

    this.setData({
      deviceId
    })

    if (!deviceId) {
      this.setData({
        loading: false,
        errorMessage: '缺少设备ID'
      })
      return
    }

    this.fetchDeviceDetail(deviceId)
  },

  fetchDeviceDetail(deviceId) {
    request({
      url: `${DEVICE_DETAIL_BASE_URL}/${encodeURIComponent(deviceId)}`,
      method: 'GET',
      withAuth: true,
      success: (response, responseData) => {
        console.log('device detail response:', response)

        if (responseData.resultCode !== 0 || !responseData.data) {
          this.setData({
            loading: false,
            errorMessage: responseData.resultMsg || '获取设备详情失败'
          })
          return
        }

        this.setData(getDetailState(responseData, deviceId))
      },
      fail: (error) => {
        console.error('device detail failed:', error)

        this.setData({
          loading: false,
          errorMessage: error && error.message ? error.message : '获取设备详情失败'
        })
      }
    })
  },

  resetDevice() {
    const { deviceId } = this.data

    if (!deviceId) {
      showToast('缺少设备ID')
      return
    }

    request({
      url: `${RESET_DEVICE_BASE_URL}/${encodeURIComponent(deviceId)}`,
      method: 'POST',
      withAuth: true,
      success: (response, responseData) => {
        console.log('reset device response:', response)

        if (responseData.resultCode !== 0) {
          showToast(responseData.resultMsg || '重置失败')
          return
        }

        showToast('重置成功')
      },
      fail: (error) => {
        console.error('reset device failed:', error)
        showToast(error && error.message ? error.message : '重置失败')
      }
    })
  },

  unbindDevice() {
    const { deviceId } = this.data

    if (!deviceId) {
      showToast('缺少设备ID')
      return
    }

    request({
      url: UNBIND_DEVICE_URL,
      method: 'POST',
      withAuth: true,
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        deviceId
      },
      success: (response, responseData) => {
        console.log('unbind device response:', response)

        if (responseData.resultCode !== 0) {
          showToast(responseData.resultMsg || '解绑失败')
          return
        }

        showToast('解绑成功')
      },
      fail: (error) => {
        console.error('unbind device failed:', error)
        showToast(error && error.message ? error.message : '解绑失败')
      }
    })
  },

  handleQuickActionTap(event) {
    const { key, label } = event.currentTarget.dataset

    if (key === 'agent') {
      wx.navigateTo({
        url: `/pages/create-agent/create-agent?deviceId=${encodeURIComponent(this.data.deviceId)}`
      })
      return
    }

    if (key === 'market') {
      wx.navigateTo({
        url: `/pages/model-market/model-market?deviceId=${encodeURIComponent(this.data.deviceId)}`
      })
      return
    }

    if (key === 'reset') {
      this.resetDevice()
      return
    }

    if (key === 'unbind') {
      this.unbindDevice()
      return
    }

    showToast(`${label}暂未开放`)
  }
})