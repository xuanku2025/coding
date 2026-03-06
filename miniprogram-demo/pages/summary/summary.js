// pages/summary/summary.js
Page({
    data: {
        summary: {
            type: 'run',
            distance: '0.00',
            duration: '00:00:00',
            pace: '0\'00"',
            kcal: 0,
            date: ''
        },
        splits: []
    },

    onLoad(options) {
        if (options.id) {
            // Load history by ID
            this.loadHistoryMock(options.id);
        } else {
            // Load latest from storage
            const lastWorkout = wx.getStorageSync('lastWorkout');
            if (lastWorkout) {
                this.setData({ summary: lastWorkout });
                this.generateMockSplits(lastWorkout);
            }
        }
    },

    loadHistoryMock(id) {
        // Mock data for history view
        const mockRun = {
            type: 'run', distance: '5.02', duration: '30:15', pace: '6\'01"/km', kcal: 320, date: '2026/03/04'
        };
        const mockRide = {
            type: 'ride', distance: '20.5', duration: '01:10:00', pace: '18km/h', kcal: 500, date: '2026/03/02'
        };

        const data = id === '1' ? mockRun : mockRide;
        this.setData({ summary: data });
        this.generateMockSplits(data);
    },

    generateMockSplits(data) {
        const distInt = Math.floor(parseFloat(data.distance)) || 1;
        const splits = [];

        for (let i = 1; i <= distInt; i++) {
            // Just mocking up varying lengths of bars
            let paceStr = data.type === 'run' ? `5'${(40 + Math.random() * 20).toFixed(0)}"` : `${(15 + Math.random() * 5).toFixed(1)}km/h`;
            splits.push({
                km: i,
                percent: 60 + Math.random() * 40,
                pace: paceStr
            });
        }

        // Optional fractional km split
        if (parseFloat(data.distance) > distInt) {
            splits.push({
                km: (parseFloat(data.distance) - distInt).toFixed(2),
                percent: 40,
                pace: data.type === 'run' ? '6\'10"' : '17.0km/h'
            });
        }

        this.setData({ splits });
    },

    goHome() {
        wx.switchTab({
            url: '/pages/index/index'
        });
    },

    generatePoster() {
        wx.showLoading({ title: '生成中...' });

        // In a real implementation:
        // 1. MapContext.takeSnapshot() to get map image
        // 2. wx.createCanvasContext() to draw map + white bg + text + logo
        // 3. wx.canvasToTempFilePath()
        // 4. wx.saveImageToPhotosAlbum()

        setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
                title: '已保存到相册',
                icon: 'success'
            });
        }, 1500);
    },

    onShareAppMessage() {
        return {
            title: `我刚刚完成了一次${this.data.summary.distance}km的${this.data.summary.type === 'run' ? '跑步' : '骑行'}，快来挑战！`,
            path: '/pages/index/index'
        };
    }
});
