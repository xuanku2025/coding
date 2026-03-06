// pages/workout/workout.js
Page({
  data: {
    sportType: 'running',
    formattedTime: '00:00:00',
    isPaused: false,
    timer: null,
    seconds: 0
  },

  onLoad(options) {
    if (options.type) {
      this.setData({ sportType: options.type });
    }
    this.startTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  startTimer() {
    const timer = setInterval(() => {
      this.data.seconds++;
      this.setData({
        formattedTime: this.formatTime(this.data.seconds)
      });
    }, 1000);
    this.setData({ timer });
  },

  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    // 如果超过一小时，显示时:分:秒
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    // 不超过则只显示分:秒，更符合运动记录直觉
    return `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  togglePause() {
    const isPaused = !this.data.isPaused;
    this.setData({ isPaused });

    if (isPaused) {
      this.stopTimer();
      wx.vibrateShort({ type: 'medium' }); // 震动反馈
    } else {
      this.startTimer();
      wx.vibrateShort({ type: 'light' });
    }
  },

  finishWorkout() {
    wx.vibrateLong();
    this.stopTimer();

    wx.showToast({
      title: '已结束记录',
      icon: 'success',
      duration: 1000
    });

    // 跳转到总结页
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/summary/summary?type=${this.data.sportType}&time=${this.data.seconds}`,
      });
    }, 1000);
  }
})
