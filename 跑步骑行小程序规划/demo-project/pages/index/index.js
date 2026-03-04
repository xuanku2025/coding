Page({
  data: {
    latitude: 39.9042,
    longitude: 116.4074,
    sportType: 'run' // run or ride
  },
  onLoad() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ latitude: res.latitude, longitude: res.longitude })
      }
    })
  },
  switchType(e) {
    this.setData({ sportType: e.currentTarget.dataset.type })
  },
  startWorkout() {
    wx.navigateTo({ url: `/pages/workout/workout?type=${this.data.sportType}` })
  }
})
