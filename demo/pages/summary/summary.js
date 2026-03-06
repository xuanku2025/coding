// pages/summary/summary.js
Page({
  data: {
    sportType: 'running',
    timeSeconds: 0
  },

  onLoad(options) {
    if (options.type) {
      this.setData({ sportType: options.type });
    }
    if (options.time) {
      this.setData({ timeSeconds: parseInt(options.time) });
    }
  },

  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
})
