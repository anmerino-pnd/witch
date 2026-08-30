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
    
    // Timestamp inputs
    const tsH = document.getElementById('ts-h');
    const tsM = document.getElementById('ts-m');
    const tsS = document.getElementById('ts-s');
    
    let isLiveMode = false;
    let hls = null;
    
    // Skip intervals
    let skipIntervals = {
        backward: [30, 15, 5],
        forward: [5, 15, 30]
    };
    
    // Load settings from localStorage
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
    
    // Save settings
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
    
    // Skip buttons
    const skip = (amount) => {
        if (isLiveMode) return; // Prevent seeking in live mode
        if (!video.duration) return;
        let newTime = video.currentTime + amount;
        if (newTime < 0) newTime = 0;
        if (newTime > video.duration) newTime = video.duration;
        video.currentTime = newTime;
    };
    
    document.getElementById('skip-back-3').addEventListener('click', () => skip(-skipIntervals.backward[0]));
    document.getElementById('skip-back-2').addEventListener('click', () => skip(-skipIntervals.backward[1]));
    document.getElementById('skip-back-1').addEventListener('click', () => skip(-skipIntervals.backward[2]));
    
    document.getElementById('skip-fwd-1').addEventListener('click', () => skip(skipIntervals.forward[0]));
    document.getElementById('skip-fwd-2').addEventListener('click', () => skip(skipIntervals.forward[1]));
    document.getElementById('skip-fwd-3').addEventListener('click', () => skip(skipIntervals.forward[2]));
    
    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    });
    
    // Timestamp Go
    goBtn.addEventListener('click', () => {
        if (isLiveMode) return;
        if (!video.duration) return;
        const h = parseInt(tsH.value) || 0;
        const m = parseInt(tsM.value) || 0;
        const s = parseInt(tsS.value) || 0;
        
        if (m > 59 || s > 59 || h < 0 || m < 0 || s < 0) {
            showError("Invalid timestamp.");
            return;
        }
        
        let targetTime = (h * 3600) + (m * 60) + s;
        if (targetTime > video.duration) {
            showError("Timestamp exceeds video duration.");
            return;
        }
        
        video.currentTime = targetTime;
        hideError();
    });
    
    // Time formatting
    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds)) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    
    video.addEventListener('timeupdate', () => {
        if (isLiveMode) {
            currentTimeEl.textContent = "LIVE";
            totalTimeEl.textContent = "LIVE";
        } else {
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
    });
    
    video.addEventListener('loadedmetadata', () => {
        if (!isLiveMode) {
            totalTimeEl.textContent = formatTime(video.duration);
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
            currentTimeEl.textContent = "LIVE";
            totalTimeEl.textContent = "LIVE";
        } else {
            liveIndicator.classList.add('hidden');
            hlsUrlContainer.classList.add('hidden');
            vodSkipBack.classList.remove('hidden');
            vodSkipFwd.classList.remove('hidden');
            vodTimestamp.classList.remove('hidden');
            vodSettings.classList.remove('hidden');
            currentTimeEl.textContent = "00:00:00";
            totalTimeEl.textContent = "00:00:00";
        }
    };
    
    loadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showError("Please enter a Twitch URL.");
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
                showError(data.error || "Unable to resolve this Twitch stream.");
                loadBtn.disabled = false;
                loadBtn.textContent = "Load";
                return;
            }
            
            if (hls) {
                hls.destroy();
            }
            
            const type = data.type; // 'live' or 'vod'
            const m3u8_url = data.m3u8_url;
            
            setLiveMode(type === 'live');
            
            if (type === 'live') {
                hlsUrlInput.value = data.raw_url || m3u8_url;
            }
            
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
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
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
            
        } catch (e) {
            showError("Unable to contact the resolver.");
            console.error(e);
        }
        
        loadBtn.disabled = false;
        loadBtn.textContent = "Load";
    });
});
