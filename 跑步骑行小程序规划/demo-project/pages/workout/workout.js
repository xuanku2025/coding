Page({
  data: {
    sportType: 'run',
    timeStr: '00:00:00',
    distance: '0.00',
    pace: '0\'00"',
    latitude: 39.9042,
    longitude: 116.4074,
    isPaused: false,
    timer: null,
    seconds: 0,
    polyline: [] // 路线数组
  },
  onLoad(options) {
    this.setData({ sportType: options.type || 'run' })
    if (options.type === 'ride') { this.setData({ pace: '0.0' }) }
    this.startTimer()
    // 模拟位置更新
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ latitude: res.latitude, longitude: res.longitude })
        this.data.polyline.push({
           points: [{latitude: res.latitude, longitude: res.longitude}],
           color: '#FF0000DD', width: 6 
        })
      }
    })
  },
  onUnload() { clearInterval(this.data.timer) },
  startTimer() {
    this.data.timer = setInterval(() => {
      this.data.seconds++
      const h = String(Math.floor(this.data.seconds / 3600)).padStart(2, '0')
      const m = String(Math.floor((this.data.seconds % 3600) / 60)).padStart(2, '0')
      const s = String(this.data.seconds % 60).padStart(2, '0')
      this.setData({ timeStr: `${h}:${m}:${s}` })
    }, 1000)
  },
  pauseWorkout() {
    if (this.data.isPaused) {
      this.startTimer()
    } else {
      clearInterval(this.data.timer)
    }
    this.setData({ isPaused: !this.data.isPaused })
  },
  endWorkout() {
    clearInterval(this.data.timer)
    wx.showModal({
      title: '结束运动',
      content: '是否结束并生成记录？',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({ 
            url: `/pages/summary/summary?dist=${this.data.distance}&time=${this.data.timeStr}&type=${this.data.sportType}` 
          })
        } else {
          this.startTimer()
        }
      }
    })
  }
})
