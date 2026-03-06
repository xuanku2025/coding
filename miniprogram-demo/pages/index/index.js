// pages/index/index.js
Page({
    data: {
        latitude: 39.90469, // Default to Beijing or user's loc
        longitude: 116.40717,
        gpsStrength: 'good',
        gpsText: '良好',
        activityType: 'run', // 'run' or 'ride'
        showCountdown: false,
        countdownText: '3'
    },

    onLoad() {
        this.locateUser();
    },

    locateUser() {
        wx.getLocation({
            type: 'gcj02',
            success: (res) => {
                this.setData({
                    latitude: res.latitude,
                    longitude: res.longitude
                });
            },
            fail: (err) => {
                console.warn('GPS location failed', err);
                this.setData({
                    gpsStrength: 'lost',
                    gpsText: '无信号'
                });
            }
        });
    },

    switchMode(e) {
        const mode = e.currentTarget.dataset.mode;
        this.setData({ activityType: mode });
    },

    onStartTap() {
        // 1. Check Location Permission Authorization
        wx.getSetting({
            success: (res) => {
                if (!res.authSetting['scope.userLocation']) {
                    wx.authorize({
                        scope: 'scope.userLocation',
                        success: () => {
                            this.startCountdown();
                        },
                        fail: () => {
                            wx.showModal({
                                title: '需要定位权限',
                                content: '请在设置中开启定位权限，以便记录您的运动轨迹。',
                                confirmText: '去设置',
                                success: (modalRes) => {
                                    if (modalRes.confirm) wx.openSetting();
                                }
                            });
                        }
                    });
                } else {
                    this.startCountdown();
                }
            }
        });
    },

    startCountdown() {
        this.setData({ showCountdown: true, countdownText: '3' });
        let count = 3;
        let timer = setInterval(() => {
            count--;
            if (count > 0) {
                this.setData({ countdownText: count.toString() });
            } else if (count === 0) {
                this.setData({ countdownText: 'GO!' });
            } else {
                clearInterval(timer);
                this.setData({ showCountdown: false });

                // Navigate to workout page
                wx.navigateTo({
                    url: `/pages/workout/workout?type=${this.data.activityType}`
                });
            }
        }, 1000);
    }
});
