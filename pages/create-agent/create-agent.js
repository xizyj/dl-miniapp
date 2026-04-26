const { request } = require('../../utils/http')

const CREATE_AGENT_URL = 'http://penholderoneos.llm.aiha.cloud:8099/user_bot'

function showToast(title, icon = 'none') {
  wx.showToast({
    title,
    icon
  })
}

function normalizeNumber(value, fallback) {
  const parsedValue = Number(value)

  if (Number.isNaN(parsedValue)) {
    return fallback
  }

  return parsedValue
}

Page({
  data: {
    submitting: false,
    deviceId: '',
    modelName: '测试模型',
    func: 'chat',
    model: 'Doubao-lite-32k',
    modelPrefix: '你是AIHA后台助手，帮助用户解决各种问题',
    maxTokens: '2000',
    temperature: '0.5',
    historyCnt: '3'
  },

  onLoad(options) {
    const deviceId = options.deviceId || ''

    this.setData({
      deviceId
    })
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset

    this.setData({
      [field]: event.detail.value
    })
  },

  clearField(event) {
    const { field } = event.currentTarget.dataset

    this.setData({
      [field]: ''
    })
  },

  submitForm() {
    const {
      deviceId,
      modelName,
      func,
      model,
      modelPrefix,
      maxTokens,
      temperature,
      historyCnt
    } = this.data

    if (!deviceId) {
      showToast('缺少设备ID')
      return
    }

    if (!modelName || !func || !model || !modelPrefix) {
      showToast('请填写完整信息')
      return
    }

    if (this.data.submitting) {
      return
    }

    this.setData({
      submitting: true
    })

    request({
      url: CREATE_AGENT_URL,
      method: 'POST',
      withAuth: true,
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        deviceId,
        modelName,
        func,
        model,
        modelPrefix,
        maxTokens: normalizeNumber(maxTokens, 2000),
        temperature: normalizeNumber(temperature, 0.5),
        historyCnt: normalizeNumber(historyCnt, 3)
      },
      success: (response, responseData) => {
        console.log('create agent response:', response)

        this.setData({
          submitting: false
        })

        if (responseData.resultCode !== 0) {
          showToast(responseData.resultMsg || '创建失败')
          return
        }

        showToast('创建成功', 'success')
        wx.navigateBack()
      },
      fail: (error) => {
        console.error('create agent failed:', error)

        this.setData({
          submitting: false
        })

        showToast(error && error.message ? error.message : '创建失败')
      }
    })
  }
})