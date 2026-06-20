const { buildApiUrl, request } = require('../../utils/http')
const { normalizeDeviceId } = require('../../utils/device-id')

const CREATE_AGENT_URL = buildApiUrl('/user_bot')
const LLM_MODEL_PAGE_URL = buildApiUrl('/llm_model/page')

function getStringValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeModelOption(item, index) {
  const modelName = getStringValue(item.modelName) || `模型${index + 1}`
  const provider = getStringValue(item.provider)

  return {
    id: item.id || item.modelId || `model-${index}`,
    modelName,
    label: provider ? `${modelName} (${provider})` : modelName
  }
}

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
    loadingModels: false,
    modelOptions: [],
    modelOptionLabels: [],
    modelIndex: -1,
    deviceId: '',
    modelName: '测试模型',
    func: 'chat',
    model: '',
    modelPrefix: '你是AIHA后台助手，帮助用户解决各种问题',
    maxTokens: '2000',
    temperature: '0.5',
    historyCnt: '3'
  },

  onLoad(options) {
    const deviceId = normalizeDeviceId(options.deviceId || '')

    this.setData({
      deviceId
    })

    this.fetchModelOptions()
  },

  fetchModelOptions() {
    this.setData({
      loadingModels: true
    })

    request({
      url: `${LLM_MODEL_PAGE_URL}?pageNum=1&pageSize=12`,
      method: 'GET',
      withAuth: true,
      success: (response, responseData) => {
        console.log('llm model list response:', response)

        if (responseData.resultCode !== 0 || !responseData.data) {
          this.setData({
            loadingModels: false,
            modelOptions: [],
            modelOptionLabels: [],
            modelIndex: -1,
            model: ''
          })
          showToast(responseData.resultMsg || '获取模型列表失败')
          return
        }

        const list = Array.isArray(responseData.data.list) ? responseData.data.list : []
        const modelOptions = list
          .map(normalizeModelOption)
          .filter((item) => item.modelName)
        const modelOptionLabels = modelOptions.map((item) => item.label)
        const modelIndex = modelOptions.length ? 0 : -1
        const currentModel = modelIndex >= 0 ? modelOptions[modelIndex].modelName : ''

        this.setData({
          loadingModels: false,
          modelOptions,
          modelOptionLabels,
          modelIndex,
          model: currentModel
        })
      },
      fail: (error) => {
        console.error('llm model list failed:', error)

        this.setData({
          loadingModels: false,
          modelOptions: [],
          modelOptionLabels: [],
          modelIndex: -1,
          model: ''
        })

        showToast(error && error.message ? error.message : '获取模型列表失败')
      }
    })
  },

  handleModelChange(event) {
    const modelIndex = Number(event.detail.value)
    const modelOptions = this.data.modelOptions || []
    const selectedModel = modelOptions[modelIndex]

    if (!selectedModel) {
      return
    }

    this.setData({
      modelIndex,
      model: selectedModel.modelName
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

        const pages = getCurrentPages()
        const previousPage = pages[pages.length - 2]

        if (previousPage && typeof previousPage.fetchDeviceDetail === 'function') {
          previousPage.shouldRefreshOnShow = true
        }

        wx.navigateBack({
          delta: 1
        })
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