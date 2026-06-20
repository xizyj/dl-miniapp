const { buildApiUrl, buildDeviceApiUrl, encodeApiDeviceId, request } = require('../../utils/http')
const { fromApiDeviceId, normalizeDeviceId } = require('../../utils/device-id')
const DEVICE_DETAIL_BASE_URL = buildApiUrl('/user_device/deviceInfo')
const RESET_DEVICE_BASE_URL = buildApiUrl('/device_setting/reset')
const CREATE_AGENT_VISIBLE = false
const QUICK_ACTIONS = [
  {
    key: 'agent',
    iconText: 'AI',
    iconClass: 'icon-agent',
    label: '创建智能体',
    hidden: !CREATE_AGENT_VISIBLE
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
    deviceId: fromApiDeviceId(settings.deviceId || fallbackDeviceId),
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
  shouldRefreshOnShow: false,

  data: {
    loading: true,
    errorMessage: '',
    deviceId: '',
    modelName: '',
    model: '',
    modelPrefix: '',
    version: '',
    quickActions: QUICK_ACTIONS.filter((action) => !action.hidden)
  },

  onLoad(options) {
    const deviceId = normalizeDeviceId(options.deviceId || '')

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

  onShow() {
    if (!this.shouldRefreshOnShow) {
      return
    }

    this.shouldRefreshOnShow = false

    if (!this.data.deviceId) {
      return
    }

    this.setData({
      loading: true,
      errorMessage: ''
    })

    this.fetchDeviceDetail(this.data.deviceId)
  },

  fetchDeviceDetail(deviceId) {
    request({
      url: buildDeviceApiUrl(DEVICE_DETAIL_BASE_URL, deviceId),
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
      url: buildDeviceApiUrl(RESET_DEVICE_BASE_URL, deviceId),
      method: 'POST',
      withAuth: true,
      success: (response, responseData) => {
        console.log('reset device response:', response)

        if (responseData.resultCode !== 0) {
          showToast(responseData.resultMsg || '重置失败')
          return
        }

        showToast('重置成功')
        this.fetchDeviceDetail(deviceId)
      },
      fail: (error) => {
        console.error('reset device failed:', error)
        showToast(error && error.message ? error.message : '重置失败')
      }
    })
  },

  confirmResetDevice() {
    wx.showModal({
      title: '确认重置设备',
      content: '重置后设备可能需要重新配网，是否继续？',
      confirmText: '确认重置',
      cancelText: '取消',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        this.resetDevice()
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

    if (key === 'history') {
      wx.navigateTo({
        url: `/pages/chat-history/chat-history?deviceId=${encodeURIComponent(this.data.deviceId)}`
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
      this.confirmResetDevice()
      return
    }

    if (key === 'unbind') {
      showToast('暂未开放')
      return
    }

    showToast(`${label}暂未开放`)
  }
})