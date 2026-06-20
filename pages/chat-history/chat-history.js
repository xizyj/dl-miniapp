const { buildApiUrl, encodeApiDeviceId, request } = require('../../utils/http')
const { normalizeDeviceId } = require('../../utils/device-id')

const CHAT_HISTORY_URL = buildApiUrl('/chatLog/page')
const DEFAULT_CREATE_USER = 'DL-00011C00D5AD'
const PAGE_SIZE = 10

function getStringValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getTimestamp(record) {
  return record.createTime || record.gmtCreate || record.createdAt || record.time || record.timestamp || ''
}

function formatMessageTime(value) {
  if (!value) {
    return ''
  }

  const normalizedValue = typeof value === 'string' ? value.replace(/-/g, '/') : value
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeRole(role) {
  return getStringValue(role).toLowerCase()
}

function resolveMessageText(record, candidates) {
  for (let index = 0; index < candidates.length; index += 1) {
    const text = getStringValue(record[candidates[index]])

    if (text) {
      return text
    }
  }

  return ''
}

function normalizeRecord(record, recordIndex, pageNum) {
  const role = normalizeRole(record.role || record.messageRole || record.senderRole || record.type)
  const content = resolveMessageText(record, ['content', 'message', 'text', 'msg'])
  const time = formatMessageTime(getTimestamp(record))
  const baseId = record.id || record.chatId || record.logId || `page-${pageNum}-record-${recordIndex}`

  function createMessage({ suffix, align, text }) {
    const isAssistant = align === 'left'

    return {
      id: `${baseId}-${suffix}`,
      align,
      text: text || '暂无内容',
      time,
      avatarText: isAssistant ? '答' : '问',
      roleText: isAssistant ? 'Response' : 'Prompt'
    }
  }

  if (role) {
    return [createMessage({
      suffix: role,
      align: role.includes('assistant') || role.includes('bot') || role.includes('ai') || role.includes('system') ? 'left' : 'right',
      text: content
    })]
  }

  const userText = resolveMessageText(record, ['question', 'userContent', 'userMessage', 'ask', 'reqContent', 'promt'])
  const assistantText = resolveMessageText(record, ['answer', 'assistantContent', 'assistantMessage', 'reply', 'response', 'resContent', 'result'])
  const messages = []

  if (userText) {
    messages.push(createMessage({
      suffix: 'user',
      align: 'right',
      text: userText
    }))
  }

  if (assistantText) {
    messages.push(createMessage({
      suffix: 'assistant',
      align: 'left',
      text: assistantText
    }))
  }

  if (!messages.length && content) {
    messages.push(createMessage({
      suffix: 'content',
      align: 'left',
      text: content
    }))
  }

  return messages
}

function normalizeMessages(list, pageNum) {
  return list.reduce((result, record, recordIndex) => result.concat(normalizeRecord(record, recordIndex, pageNum)), [])
}

Page({
  data: {
    deviceId: '',
    loading: true,
    loadingMore: false,
    errorMessage: '',
    messages: [],
    pageNum: 1,
    loadedRecordCount: 0,
    total: 0,
    hasMore: false
  },

  onLoad(options) {
    this.setData({
      deviceId: normalizeDeviceId(options.deviceId || DEFAULT_CREATE_USER)
    })

    this.fetchChatLogs({ pageNum: 1, append: false })
  },

  fetchChatLogs({ pageNum, append }) {
    const createUser = this.data.deviceId || DEFAULT_CREATE_USER

    this.setData({
      loading: append ? this.data.loading : true,
      loadingMore: append,
      errorMessage: ''
    })

    request({
      url: `${CHAT_HISTORY_URL}?createUser=${encodeApiDeviceId(createUser)}&pageNum=${pageNum}&pageSize=${PAGE_SIZE}`,
      method: 'GET',
      withAuth: true,
      success: (response, responseData) => {
        console.log('chat history response:', response)

        if (responseData.resultCode !== 0 || !responseData.data) {
          this.setData({
            loading: false,
            loadingMore: false,
            errorMessage: responseData.resultMsg || '获取历史对话失败'
          })
          return
        }

        const list = Array.isArray(responseData.data.list) ? responseData.data.list : []
        const nextMessages = append
          ? this.data.messages.concat(normalizeMessages(list, pageNum))
          : normalizeMessages(list, pageNum)
        const total = responseData.data.total || 0
        const loadedRecordCount = append ? this.data.loadedRecordCount + list.length : list.length

        this.setData({
          loading: false,
          loadingMore: false,
          messages: nextMessages,
          pageNum,
          loadedRecordCount,
          total,
          hasMore: loadedRecordCount < total
        })
      },
      fail: (error) => {
        console.error('chat history failed:', error)

        this.setData({
          loading: false,
          loadingMore: false,
          errorMessage: error && error.message ? error.message : '获取历史对话失败'
        })
      }
    })
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) {
      return
    }

    this.fetchChatLogs({
      pageNum: this.data.pageNum + 1,
      append: true
    })
  }
})