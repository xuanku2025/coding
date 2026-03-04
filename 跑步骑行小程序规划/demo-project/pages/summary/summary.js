Page({
  data: {
    distance: '5.02',
    timeStr: '30:15',
    pace: '0.0',
    type: 'run',
    latitude: 39.9042,
    longitude: 116.4074
  },
  onLoad(options) {
    if(options.dist) {
      this.setData({
        distance: options.dist,
        timeStr: options.time,
        type: options.type,
        pace: options.type === 'run' ? '6\'01"' : '20.5'
      })
    }
  },
  onShareAppMessage() {
    return {
      title: `我刚刚完成了 ${this.data.distance} 公里运动，快来挑战！`,
      path: '/pages/index/index'
    }
  },
  generatePoster() {
    wx.showToast({ title: '生成海报中...', icon: 'loading' })
    // 模拟生成过程
    setTimeout(() => { wx.showToast({ title: '已保存到相册', icon: 'success' }) }, 1500)
  }
})
