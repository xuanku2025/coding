// pages/profile/profile.js
Page({
  data: {},

  onLoad() {
    console.log('Profile page loaded');
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  }
})
