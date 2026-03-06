// pages/index/index.js
const app = getApp()

Page({
  data: {
    sportType: 'running' // running | cycling
  },

  onLoad() {
    // 页面加载逻辑
    console.log('Index page loaded');
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },

  switchSport(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      sportType: type
    });
    app.globalData.sportType = type;
  },

  startWorkout() {
    // 点击开始按钮，跳转到运动记录页
    wx.navigateTo({
      url: `/pages/workout/workout?type=${this.data.sportType}`,
    })
  }
})
