// pages/profile/profile.js
Page({
    data: {
        userInfo: {},
        hasUserInfo: false,
        stats: {
            days: 12,
            runKm: '45.5',
            rideKm: '120.2'
        },
        keepScreenOn: false,
        historyList: [
            {
                id: '1',
                type: 'run',
                date: '3月4日',
                title: '傍晚跑',
                distance: '5.02',
                duration: '30:15',
                pace: '6\'01"/km'
            },
            {
                id: '2',
                type: 'ride',
                date: '3月2日',
                title: '周末骑行',
                distance: '20.5',
                duration: '1:10:00',
                pace: '18km/h'
            }
        ]
    },

    onLoad() {
        // Attempt to load cached info if needed
    },

    onChooseAvatar(e) {
        const { avatarUrl } = e.detail;
        this.setData({
            'userInfo.avatarUrl': avatarUrl,
            hasUserInfo: true
        });
    },

    goToSummary(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/summary/summary?id=${id}`
        });
    },

    toggleScreenOn(e) {
        const isOn = e.detail.value;
        wx.setKeepScreenOn({
            keepScreenOn: isOn
        });
        this.setData({ keepScreenOn: isOn });
    },

    clearCache() {
        wx.showModal({
            title: '提示',
            content: '确认清除所有本地缓存？',
            success(res) {
                if (res.confirm) {
                    wx.clearStorageSync();
                    wx.showToast({ title: '已清除', icon: 'success' });
                }
            }
        });
    }
});
