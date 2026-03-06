// pages/workout/workout.js
Page({
    data: {
        type: 'run',
        latitude: 39.90469,
        longitude: 116.40717,
        polyline: [],

        // Stats
        timeSeconds: 0,
        formattedTime: '00:00:00',
        distance: '0.00', // km
        pace: '0\'00"',

        // UI state
        isPaused: false,
        panelVisible: true
    },

    timer: null,
    locationTimer: null,
    points: [],

    onLoad(options) {
        if (options.type) {
            this.setData({ type: options.type });
        }
        this.initMap();
        this.startTracking();
    },

    onUnload() {
        this.stopTracking();
    },

    initMap() {
        this.mapCtx = wx.createMapContext('trackMap');
        wx.getLocation({
            type: 'gcj02',
            isHighAccuracy: true,
            success: (res) => {
                this.setData({
                    latitude: res.latitude,
                    longitude: res.longitude
                });
                this.points.push({ latitude: res.latitude, longitude: res.longitude });
            }
        });
    },

    startTracking() {
        // 1. Start the UI Timer
        this.timer = setInterval(() => {
            this.data.timeSeconds++;
            this.setData({
                formattedTime: this.formatTime(this.data.timeSeconds)
            });
            // Mock some data updates continuously
            this.mockDataUpdate();
        }, 1000);

        // 2. Ideally use wx.onLocationChange for real tracking
        // For demo purposes, we will mock location changes every 3 seconds to draw a line
        this.locationTimer = setInterval(() => {
            this.mockLocationUpdate();
        }, 3000);

        // In a real app we would call:
        /* wx.startLocationUpdateBackground({
          success: (res) => {
            wx.onLocationChange(this.handleLocationChange);
          }
        }); */
    },

    stopTracking() {
        if (this.timer) clearInterval(this.timer);
        if (this.locationTimer) clearInterval(this.locationTimer);
        // wx.stopLocationUpdate();
    },

    mockDataUpdate() {
        // Simple mock to fake increasing distance and steady pace
        const currentDist = parseFloat(this.data.distance);
        const addition = this.data.type === 'run' ? 0.003 : 0.008;
        const newDist = (currentDist + addition).toFixed(2);

        let simulatedPace = '0\'00"';
        if (newDist > 0) {
            if (this.data.type === 'run') {
                const paceSeconds = Math.floor(this.data.timeSeconds / parseFloat(newDist));
                const pMin = Math.floor(paceSeconds / 60);
                const pSec = paceSeconds % 60;
                simulatedPace = `${pMin}'${pSec.toString().padStart(2, '0')}"`;
            } else {
                const speed = (parseFloat(newDist) / (this.data.timeSeconds / 3600)).toFixed(1);
                simulatedPace = `${speed}`;
            }
        }

        this.setData({
            distance: newDist,
            pace: simulatedPace
        });
    },

    mockLocationUpdate() {
        if (this.points.length === 0) return;
        const lastPoint = this.points[this.points.length - 1];

        // Move slightly north-east
        const newPoint = {
            latitude: lastPoint.latitude + 0.0001,
            longitude: lastPoint.longitude + 0.0001
        };

        this.points.push(newPoint);

        // Update polyline on map
        const color = this.data.type === 'run' ? '#ff6b00' : '#007aff';
        const pl = [{
            points: this.points,
            color: color,
            width: 6,
            arrowLine: true
        }];

        this.setData({
            latitude: newPoint.latitude,
            longitude: newPoint.longitude,
            polyline: pl
        });
    },

    formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    },

    togglePause() {
        if (this.data.isPaused) {
            // Resume
            this.startTracking();
        } else {
            // Pause
            this.stopTracking();
        }
        this.setData({ isPaused: !this.data.isPaused });
    },

    onEndTap() {
        // Show a quick toast to hint long press
        wx.showToast({
            title: '请长按结束',
            icon: 'none'
        });
    },

    onEndLongPress() {
        wx.vibrateShort(); // Haptic feedback
        this.stopTracking();

        if (parseFloat(this.data.distance) < 0.1) {
            wx.showModal({
                title: '提示',
                content: '距离过短，是否放弃保存本次记录？',
                cancelText: '放弃',
                confirmText: '保存',
                success: (res) => {
                    if (res.cancel) {
                        wx.navigateBack();
                    } else {
                        this.finishWorkout();
                    }
                }
            });
        } else {
            this.finishWorkout();
        }
    },

    finishWorkout() {
        // Construct summary data
        const summaryData = {
            type: this.data.type,
            distance: this.data.distance,
            duration: this.data.formattedTime,
            pace: this.data.pace,
            date: new Date().toLocaleDateString()
        };

        // Save to global or storage for summary page
        wx.setStorageSync('lastWorkout', summaryData);

        wx.redirectTo({
            url: '/pages/summary/summary'
        });
    },

    togglePanel() {
        this.setData({ panelVisible: !this.data.panelVisible });
    }
});
