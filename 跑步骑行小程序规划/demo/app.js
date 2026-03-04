App({
  onLaunch() {
    console.log('极简运动记录 App Launched')
  },
  globalData: {
    systemInfo: wx.getSystemInfoSync()
  }
})
