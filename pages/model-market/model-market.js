const { request } = require('../../utils/http')

const MODEL_MARKET_URL = 'http://penholderoneos.llm.aiha.cloud:8099/gptmodel/list'
const BIND_MODEL_BASE_URL = 'http://penholderoneos.llm.aiha.cloud:8099/gptmodel/bindDevice'
const DEFAULT_QUERY = ''
const PAGE_SIZE = 10

function normalizeModel(item) {
  return {
    id: item.id || item.modelId || item.model || item.modelName,
    name: item.modelName || item.name || '未命名模型',
    model: item.model || '未配置',
    desc: item.modelTips || item.modelPrefix || item.prompt || '暂无描述',
    func: item.func || '通用',
    maxTokens: item.maxTokens || 0
  }
}

Page({
  data: {
    query: DEFAULT_QUERY,
    loading: true,
    loadingMore: false,
    errorMessage: '',
    models: [],
    total: 0,
    activeIndex: 0,
    pageNum: 1,
    hasMore: false,
    deviceId: '',
    bindingModelId: ''
  },

  onLoad(options) {
    const query = options.query || DEFAULT_QUERY
    const deviceId = options.deviceId || ''

    this.setData({ query, deviceId })
    this.fetchModels({ query, pageNum: 1, append: false })
  },

  fetchModels({ query, pageNum, append }) {
    this.setData({
      loading: append ? this.data.loading : true,
      loadingMore: append,
      errorMessage: ''
    })

    request({
      url: `${MODEL_MARKET_URL}?pageNum=${pageNum}&pageSize=${PAGE_SIZE}&query=${encodeURIComponent(query)}`,
      method: 'GET',
      withAuth: true,
      success: (response, responseData) => {
        console.log('model market response:', response)

        if (responseData.resultCode !== 0 || !responseData.data) {
          this.setData({
            loading: false,
            loadingMore: false,
            errorMessage: responseData.resultMsg || '获取模型列表失败'
          })
          return
        }

        const list = Array.isArray(responseData.data.list) ? responseData.data.list : []
        const nextModels = append
          ? this.data.models.concat(list.map(normalizeModel))
          : list.map(normalizeModel)
        const total = responseData.data.total || 0

        this.setData({
          loading: false,
          loadingMore: false,
          models: nextModels,
          total,
          activeIndex: append ? this.data.activeIndex : 0,
          pageNum,
          hasMore: nextModels.length < total
        })
      },
      fail: (error) => {
        console.error('model market failed:', error)

        this.setData({
          loading: false,
          loadingMore: false,
          errorMessage: error && error.message ? error.message : '获取模型列表失败'
        })
      }
    })
  },

  handleQueryInput(event) {
    this.setData({
      query: event.detail.value
    })
  },

  handleSearch() {
    const query = (this.data.query || '').trim()

    this.fetchModels({ query, pageNum: 1, append: false })
  },

  handleSwiperChange(event) {
    const activeIndex = event.detail.current

    this.setData({ activeIndex })

    if (!this.data.hasMore || this.data.loadingMore) {
      return
    }

    if (activeIndex >= this.data.models.length - 1) {
      this.fetchModels({
        query: this.data.query,
        pageNum: this.data.pageNum + 1,
        append: true
      })
    }
  },

  bindModel(event) {
    const { modelId } = event.currentTarget.dataset
    const { deviceId, bindingModelId } = this.data

    if (!deviceId) {
      wx.showToast({
        title: '缺少设备ID',
        icon: 'none'
      })
      return
    }

    if (!modelId || bindingModelId) {
      return
    }

    this.setData({
      bindingModelId: String(modelId)
    })

    request({
      url: `${BIND_MODEL_BASE_URL}/${encodeURIComponent(modelId)}/${encodeURIComponent(deviceId)}`,
      method: 'POST',
      withAuth: true,
      success: (response, responseData) => {
        console.log('bind model response:', response)

        this.setData({
          bindingModelId: ''
        })

        if (responseData.resultCode !== 0) {
          wx.showToast({
            title: responseData.resultMsg || '绑定失败',
            icon: 'none'
          })
          return
        }

        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        })
      },
      fail: (error) => {
        console.error('bind model failed:', error)

        this.setData({
          bindingModelId: ''
        })

        wx.showToast({
          title: error && error.message ? error.message : '绑定失败',
          icon: 'none'
        })
      }
    })
  }
})