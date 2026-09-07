document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video-player');
    const loadBtn = document.getElementById('load-btn');
    const urlInput = document.getElementById('vod-url');
    const errorMsg = document.getElementById('error-msg');
    
    // Live UI elements
    const liveIndicator = document.getElementById('live-indicator');
    const hlsUrlContainer = document.getElementById('hls-url-container');
    const hlsUrlInput = document.getElementById('hls-url-input');
    const copyHlsBtn = document.getElementById('copy-hls-btn');
    
    // VOD UI elements
    const vodSkipBack = document.getElementById('vod-skip-back-container');
    const vodSkipFwd = document.getElementById('vod-skip-fwd-container');
    const vodTimestamp = document.getElementById('vod-timestamp-container');
    const vodSettings = document.getElementById('vod-settings-panel');
    
    // Time display
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    
    // Controls
    const playPauseBtn = document.getElementById('play-pause');
    const goBtn = document.getElementById('go-btn');
    const watchAgainBtn = document.getElementById('watch-again-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    
    // Timestamp inputs
    const tsH = document.getElementById('ts-h');
    const tsM = document.getElementById('ts-m');
    const tsS = document.getElementById('ts-s');
    
    let isLiveMode = false;
    let currentVodId = null;
    let currentVideoTitle = null;
    let hls = null;
    let ytPlayer = null;
    let ytPlayerReady = false;
    let activePlatform = 'twitch'; // 'twitch' | 'youtube'
    
    window.onYouTubeIframeAPIReady = () => {
        ytPlayerReady = true;
    };
    
    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    
    // Skip intervals
    let skipIntervals = {
        backward: [30, 15, 5],
        forward: [5, 15, 30]
    };
    
    try {
        const saved = localStorage.getItem('witchSkipSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.backward && parsed.forward) {
                skipIntervals = parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to load settings from localStorage', e);
    }
    
    const updateSkipLabels = () => {
        document.querySelector('.sb3-val').textContent = skipIntervals.backward[0];
        document.querySelector('.sb2-val').textContent = skipIntervals.backward[1];
        document.querySelector('.sb1-val').textContent = skipIntervals.backward[2];
        
        document.querySelector('.sf1-val').textContent = skipIntervals.forward[0];
        document.querySelector('.sf2-val').textContent = skipIntervals.forward[1];
        document.querySelector('.sf3-val').textContent = skipIntervals.forward[2];
        
        document.getElementById('sb3-input').value = skipIntervals.backward[0];
        document.getElementById('sb2-input').value = skipIntervals.backward[1];
        document.getElementById('sb1-input').value = skipIntervals.backward[2];
        
        document.getElementById('sf1-input').value = skipIntervals.forward[0];
        document.getElementById('sf2-input').value = skipIntervals.forward[1];
        document.getElementById('sf3-input').value = skipIntervals.forward[2];
    };
    
    updateSkipLabels();
    
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const sb3 = parseInt(document.getElementById('sb3-input').value) || 30;
        const sb2 = parseInt(document.getElementById('sb2-input').value) || 15;
        const sb1 = parseInt(document.getElementById('sb1-input').value) || 5;
        
        const sf1 = parseInt(document.getElementById('sf1-input').value) || 5;
        const sf2 = parseInt(document.getElementById('sf2-input').value) || 15;
        const sf3 = parseInt(document.getElementById('sf3-input').value) || 30;
        
        skipIntervals = {
            backward: [sb3, sb2, sb1],
            forward: [sf1, sf2, sf3]
        };
        
        localStorage.setItem('witchSkipSettings', JSON.stringify(skipIntervals));
        updateSkipLabels();
    });
    
    const historyList = document.getElementById('watch-history-list');
    
    const loadHistoryList = async () => {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            historyList.innerHTML = '';
            
            const entries = Object.entries(data);
            if (entries.length === 0) {
                historyList.innerHTML = '<li class="history-item"><span class="history-meta">No recent videos</span></li>';
                return;
            }
            
            entries.reverse().forEach(([id, info]) => {
                const li = document.createElement('li');
                li.className = 'history-item ' + (info.type || 'vod');
                
                let titleHtml = info.title || id;
                let platform = info.type === 'youtube' ? 'YouTube' : 'Twitch VOD';
                let timeStr = formatTime(info.timestamp);
                
                li.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span class="history-title" title="${titleHtml}">${titleHtml}</span>
                        <span class="history-meta">${platform} &bull; Resumes at ${timeStr}</span>
                    </div>
                    <button class="history-play-btn" title="Play">▶</button>
                `;
                
                li.addEventListener('click', () => {
                    let url = '';
                    if (info.type === 'youtube') {
                        url = `https://www.youtube.com/watch?v=${id}`;
                    } else {
                        url = `https://www.twitch.tv/videos/${id}`;
                    }
                    urlInput.value = url;
                    loadBtn.click();
                });
                
                historyList.appendChild(li);
            });
        } catch (e) {
            console.warn("Failed to load history list", e);
        }
    };
    
    // Initial load
    loadHistoryList();

    clearCacheBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to clear your entire watch history?")) {
            try {
                await fetch('/api/history', { method: 'DELETE' });
                alert("Watch history cleared successfully.");
                loadHistoryList();
            } catch (e) {
                console.error("Failed to clear history", e);
                alert("Failed to clear watch history.");
            }
        }
    });
    
    const getDuration = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getDuration) return ytPlayer.getDuration() || 0;
        return video.duration || 0;
    };
    
    const getCurrentTime = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getCurrentTime) return ytPlayer.getCurrentTime() || 0;
        return video.currentTime || 0;
    };
    
    const seekTo = (time) => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.seekTo) {
            ytPlayer.seekTo(time, true);
        } else {
            video.currentTime = time;
        }
    };
    
    const playVideo = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
        else video.play();
    };
    
    const pauseVideo = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        else video.pause();
    };
    
    const isPaused = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getPlayerState) {
            return ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING;
        }
        return video.paused;
    };
    
    const skip = (amount) => {
        if (isLiveMode) return;
        const duration = getDuration();
        if (!duration) return;
        let newTime = getCurrentTime() + amount;
        if (newTime < 0) newTime = 0;
        if (newTime > duration) newTime = duration;
        seekTo(newTime);
    };
    
    document.getElementById('skip-back-3').addEventListener('click', () => skip(-skipIntervals.backward[0]));
    document.getElementById('skip-back-2').addEventListener('click', () => skip(-skipIntervals.backward[1]));
    document.getElementById('skip-back-1').addEventListener('click', () => skip(-skipIntervals.backward[2]));
    
    document.getElementById('skip-fwd-1').addEventListener('click', () => skip(skipIntervals.forward[0]));
    document.getElementById('skip-fwd-2').addEventListener('click', () => skip(skipIntervals.forward[1]));
    document.getElementById('skip-fwd-3').addEventListener('click', () => skip(skipIntervals.forward[2]));
    
    playPauseBtn.addEventListener('click', () => {
        if (isPaused()) playVideo();
        else pauseVideo();
    });
    
    goBtn.addEventListener('click', () => {
        if (isLiveMode) return;
        const duration = getDuration();
        if (!duration) return;
        const h = parseInt(tsH.value) || 0;
        const m = parseInt(tsM.value) || 0;
        const s = parseInt(tsS.value) || 0;
        
        if (m > 59 || s > 59 || h < 0 || m < 0 || s < 0) {
            showError("Invalid timestamp.");
            return;
        }
        
        let targetTime = (h * 3600) + (m * 60) + s;
        if (targetTime > duration) {
            showError("Timestamp exceeds video duration.");
            return;
        }
        
        seekTo(targetTime);
        hideError();
    });
    
    watchAgainBtn.addEventListener('click', () => {
        if (isLiveMode) return;
        seekTo(0);
        playVideo();
        watchAgainBtn.classList.add('hidden');
    });
    
    const saveHistory = async (timestamp) => {
        if (isLiveMode || !currentVodId) return;
        
        let payload = { timestamp, type: activePlatform };
        
        // Dynamic YouTube Title Fetching on save, if it's not set
        if (activePlatform === 'youtube' && !currentVideoTitle && ytPlayer && ytPlayer.getVideoData) {
            const ytData = ytPlayer.getVideoData();
            if (ytData && ytData.title) {
                currentVideoTitle = ytData.title;
            }
        }
        
        if (currentVideoTitle) {
            payload.title = currentVideoTitle;
        }

        try {
            await fetch(`/api/history/${currentVodId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("Failed to save watch history", e);
        }
    };
    
    setInterval(() => {
        if (!isLiveMode && currentVodId && !isPaused() && getDuration()) {
            saveHistory(getCurrentTime());
        }
    }, 15000);
    
    // YouTube time update emulation
    setInterval(() => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getPlayerState) {
            if (!isLiveMode) {
                const cur = getCurrentTime();
                const dur = getDuration();
                currentTimeEl.textContent = formatTime(cur);
                totalTimeEl.textContent = formatTime(dur);
                
                if (dur > 0 && cur >= dur - 1) {
                    watchAgainBtn.classList.remove('hidden');
                } else {
                    watchAgainBtn.classList.add('hidden');
                }
            }
        }
    }, 500);
    
    video.addEventListener('pause', () => {
        if (activePlatform === 'twitch' && !isLiveMode && currentVodId && video.duration) {
            saveHistory(video.currentTime);
        }
    });
    
    window.addEventListener('beforeunload', () => {
        if (!isLiveMode && currentVodId && getDuration() && !isPaused()) {
            navigator.sendBeacon(`/api/history/${currentVodId}`, JSON.stringify({ timestamp: getCurrentTime() }));
        }
    });
    

    
    video.addEventListener('timeupdate', () => {
        if (activePlatform !== 'twitch') return;
        if (isLiveMode) {
            currentTimeEl.textContent = "LIVE";
            totalTimeEl.textContent = "LIVE";
        } else {
            currentTimeEl.textContent = formatTime(video.currentTime);
            if (video.duration && video.currentTime >= video.duration - 1) {
                watchAgainBtn.classList.remove('hidden');
            } else {
                watchAgainBtn.classList.add('hidden');
            }
        }
    });
    
    video.addEventListener('loadedmetadata', () => {
        if (activePlatform !== 'twitch') return;
        if (!isLiveMode) {
            totalTimeEl.textContent = formatTime(video.duration);
            if (video.dataset.startTs) {
                const startTs = parseFloat(video.dataset.startTs);
                if (startTs > 0) video.currentTime = startTs;
                video.dataset.startTs = '';
            }
        }
    });
    
    copyHlsBtn.addEventListener('click', () => {
        hlsUrlInput.select();
        document.execCommand('copy');
        const oldText = copyHlsBtn.textContent;
        copyHlsBtn.textContent = "Copied!";
        setTimeout(() => copyHlsBtn.textContent = oldText, 2000);
    });
    
    const showError = (msg) => {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    };
    
    const hideError = () => {
        errorMsg.classList.add('hidden');
    };
    
    const setLiveMode = (isLive) => {
        isLiveMode = isLive;
        if (isLive) {
            liveIndicator.classList.remove('hidden');
            hlsUrlContainer.classList.remove('hidden');
            vodSkipBack.classList.add('hidden');
            vodSkipFwd.classList.add('hidden');
            vodTimestamp.classList.add('hidden');
            vodSettings.classList.add('hidden');
            watchAgainBtn.classList.add('hidden');
            currentTimeEl.textContent = "LIVE";
            totalTimeEl.textContent = "LIVE";
        } else {
            liveIndicator.classList.add('hidden');
            hlsUrlContainer.classList.add('hidden');
            vodSkipBack.classList.remove('hidden');
            vodSkipFwd.classList.remove('hidden');
            vodTimestamp.classList.remove('hidden');
            vodSettings.classList.remove('hidden');
            watchAgainBtn.classList.add('hidden');
            currentTimeEl.textContent = "00:00:00";
            totalTimeEl.textContent = "00:00:00";
        }
    };
    
    loadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showError("Please enter a Video URL.");
            return;
        }
        
        hideError();
        loadBtn.disabled = true;
        loadBtn.textContent = "Loading...";
        
        try {
            const res = await fetch('/api/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                showError(data.error || "Unable to resolve this stream.");
                loadBtn.disabled = false;
                loadBtn.textContent = "Load";
                return;
            }
            
            const type = data.type; // 'live', 'vod', or 'youtube'
            currentVodId = data.id_val;
            currentVideoTitle = data.title || null;
            let startTs = data.start_time || 0;
            
            // Fetch watch history if applicable
            if (type !== 'live') {
                try {
                    const histRes = await fetch(`/api/history/${currentVodId}`);
                    if (histRes.ok) {
                        const histData = await histRes.json();
                        if (histData.timestamp) {
                            startTs = histData.timestamp;
                        }
                    }
                } catch (e) {
                    console.warn("Could not load history", e);
                }
            }

            if (type === 'youtube') {
                activePlatform = 'youtube';
                video.classList.add('hidden');
                video.pause();
                if (hls) { hls.destroy(); hls = null; }
                const ytIframe = document.getElementById('youtube-player');
                if (ytIframe) ytIframe.classList.remove('hidden');
                
                setLiveMode(false);
                
                const initYt = () => {
                    if (ytPlayer) {
                        ytPlayer.loadVideoById({videoId: data.id_val, startSeconds: startTs});
                    } else {
                        ytPlayer = new YT.Player('youtube-player', {
                            videoId: data.id_val,
                            playerVars: { 'autoplay': 1, 'start': Math.floor(startTs), 'playsinline': 1 },
                            events: {
                                'onReady': (e) => {
                                    e.target.playVideo();
                                },
                                'onStateChange': (e) => {
                                    const videoData = e.target.getVideoData();
                                    if (videoData && videoData.isLive) {
                                        showError("YouTube Live streams are not supported in Witch.");
                                        e.target.stopVideo();
                                    } else if (e.data === YT.PlayerState.PAUSED) {
                                        saveHistory(getCurrentTime());
                                    }
                                }
                            }
                        });
                    }
                };
                
                if (ytPlayerReady) initYt();
                else {
                    const check = setInterval(() => {
                        if (ytPlayerReady) { clearInterval(check); initYt(); }
                    }, 100);
                }
                
            } else {
                activePlatform = 'twitch';
                const ytIframe = document.getElementById('youtube-player');
                if (ytIframe) ytIframe.classList.add('hidden');
                if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
                video.classList.remove('hidden');
                
                setLiveMode(type === 'live');
                const m3u8_url = data.m3u8_url;
                
                if (type === 'live') {
                    hlsUrlInput.value = data.raw_url || m3u8_url;
                } else {
                    video.dataset.startTs = startTs;
                }
                
                if (hls) { hls.destroy(); }
                
                if (Hls.isSupported()) {
                    hls = new Hls({
                        liveSyncDurationCount: 3,
                        liveMaxLatencyDurationCount: 10,
                    });
                    hls.loadSource(m3u8_url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        video.play();
                    });
                    hls.on(Hls.Events.ERROR, (event, errData) => {
                        if (errData.fatal) {
                            showError("The stream was found, but playback could not be started or has ended.");
                            loadBtn.disabled = false;
                            loadBtn.textContent = "Reload";
                        }
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = m3u8_url;
                    video.addEventListener('loadedmetadata', () => {
                        video.play();
                    });
                    video.addEventListener('error', () => {
                        showError("The stream was found, but playback could not be started or has ended.");
                        loadBtn.disabled = false;
                        loadBtn.textContent = "Reload";
                    });
                } else {
                    showError("Your browser does not support HLS playback.");
                }
            }
            
        } catch (e) {
            showError("Unable to contact the resolver.");
            console.error(e);
        }
        
        loadBtn.disabled = false;
        loadBtn.textContent = "Load";
    });
});
