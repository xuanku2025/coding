App({
  onLaunch() {
    // Check if there are uncompleted workout records in cache
    const pendingRecord = wx.getStorageSync('pending_workout');
    if (pendingRecord) {
      wx.showModal({
        title: '恢复运动记录',
        content: '检测到异常中断的运动记录，是否恢复？',
        success(res) {
          if (res.confirm) {
            // Navigate to workout page and restore data
            // In a real implementation we would pass the data or store a flag
            console.log('User chose to restore.');
          } else if (res.cancel) {
            wx.removeStorageSync('pending_workout');
          }
        }
      })
    }
  },
  globalData: {
    userInfo: null,
    hasLocationPermission: false
  }
})
