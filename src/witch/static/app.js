document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video-player');
    const playerWrapper = document.getElementById('player-wrapper') || document.querySelector('.player-wrapper');
    const playerPlaceholder = document.getElementById('player-placeholder');
    const loadBtn = document.getElementById('load-btn');
    const urlInput = document.getElementById('vod-url');
    const clearUrlBtn = document.getElementById('clear-url-btn');
    const errorMsg = document.getElementById('error-msg');

    // Stream Info & Live UI elements
    const streamInfoBar = document.getElementById('stream-info-bar');
    const streamAvatar = document.getElementById('stream-avatar');
    const platformBadge = document.getElementById('platform-badge');
    const streamTitleDisplay = document.getElementById('stream-title-display');
    const streamChannelDisplay = document.getElementById('stream-channel-display');
    const streamGameDisplay = document.getElementById('stream-game-display');
    const streamQualityBadge = document.getElementById('stream-quality-badge');
    const streamViewersDisplay = document.getElementById('stream-viewers-display');

    const liveIndicator = document.getElementById('live-indicator');
    const liveEdgeBtn = document.getElementById('live-edge-btn');
    const liveEdgeLabel = document.getElementById('live-edge-label');
    const liveBehindBadge = document.getElementById('live-behind-badge');
    const timelineLiveBtn = document.getElementById('timeline-live-btn');
    const timelineLiveText = document.getElementById('timeline-live-text');

    const hlsToggleBtn = document.getElementById('hls-toggle-btn');
    const hlsUrlContainer = document.getElementById('hls-url-container');
    const hlsUrlInput = document.getElementById('hls-url-input');
    const copyHlsBtn = document.getElementById('copy-hls-btn');

    // Timeline Scrubber elements
    const timelineBarWrap = document.getElementById('timeline-bar-wrap');
    const timelineBuffer = document.getElementById('timeline-buffer');
    const timelineProgress = document.getElementById('timeline-progress');
    const timelineThumb = document.getElementById('timeline-thumb');
    const timelineTooltip = document.getElementById('timeline-tooltip');

    // VOD & Transport UI elements
    const vodSkipBack = document.getElementById('vod-skip-back-container');
    const vodSkipFwd = document.getElementById('vod-skip-fwd-container');
    const vodTimestamp = document.getElementById('vod-timestamp-container');
    const vodSettings = document.getElementById('vod-settings-panel');
    const toggleSettingsBtn = document.getElementById('toggle-settings-btn');

    // Time display
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');

    // Controls
    const playPauseBtn = document.getElementById('play-pause');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const muteBtn = document.getElementById('mute-btn');
    const volIconHigh = document.getElementById('vol-icon-high');
    const volIconMuted = document.getElementById('vol-icon-muted');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeLabel = document.getElementById('volume-label');
    const speedSelect = document.getElementById('speed-select');
    const qualitySelectWrap = document.getElementById('quality-select-wrap');
    const qualitySelect = document.getElementById('quality-select');
    const pipBtn = document.getElementById('pip-btn');
    const theaterBtn = document.getElementById('theater-btn');
    const theaterBtnText = document.getElementById('theater-btn-text');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fsEnterIcon = document.getElementById('fs-enter-icon');
    const fsExitIcon = document.getElementById('fs-exit-icon');

    const goBtn = document.getElementById('go-btn');
    const watchAgainBtn = document.getElementById('watch-again-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');

    // Shortcuts Modal & OSD
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const closeShortcutsBtn = document.getElementById('close-shortcuts-btn');
    const playerOsd = document.getElementById('player-osd');
    const osdIcon = document.getElementById('osd-icon');
    const osdText = document.getElementById('osd-text');
    const toastContainer = document.getElementById('toast-container');

    // Timestamp inputs
    const tsH = document.getElementById('ts-h');
    const tsM = document.getElementById('ts-m');
    const tsS = document.getElementById('ts-s');

    // Player State
    let isLiveMode = false;
    let liveStreamUrl = null;
    let liveDvrUrl = null;
    let isUsingDvrSource = false;
    let currentVodId = null;
    let currentVideoTitle = null;
    let currentChannelName = null;
    let hls = null;
    let ytPlayer = null;
    let ytPlayerReady = false;
    let activePlatform = 'twitch'; // 'twitch' | 'youtube'
    let hasLoadedMedia = false;
    let isDraggingTimeline = false;
    let osdTimeout = null;
    let lastFullscreenElement = null;

    const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    window.onYouTubeIframeAPIReady = () => {
        ytPlayerReady = true;
    };

    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    };

    const showToast = (message) => {
        if (!toastContainer) return;
        const el = document.createElement('div');
        el.className = 'toast-item';
        el.textContent = message;
        toastContainer.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(8px)';
            el.style.transition = 'all 0.2s ease';
            setTimeout(() => el.remove(), 220);
        }, 2600);
    };

    const showOsd = (text, svgPath = null) => {
        if (!playerOsd || !osdText) return;
        osdText.textContent = text;
        if (osdIcon) {
            if (svgPath) {
                osdIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`;
                osdIcon.classList.remove('hidden');
            } else {
                osdIcon.innerHTML = '';
                osdIcon.classList.add('hidden');
            }
        }
        playerOsd.classList.remove('hidden');
        requestAnimationFrame(() => playerOsd.classList.add('visible'));
        if (osdTimeout) clearTimeout(osdTimeout);
        osdTimeout = setTimeout(() => {
            playerOsd.classList.remove('visible');
            setTimeout(() => playerOsd.classList.add('hidden'), 200);
        }, 850);
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatShortTime = (seconds) => {
        if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Normalize user URL input (allows typing "ibai" or "twitch.tv/ibai" directly)
    const normalizeInputUrl = (raw) => {
        const trimmed = raw.trim();
        if (!trimmed) return '';
        if (/^[a-zA-Z0-9_]{3,25}$/.test(trimmed)) {
            return `https://www.twitch.tv/${trimmed}`;
        }
        if (/^(www\.|m\.)?(twitch\.tv|youtube\.com|youtu\.be)\//i.test(trimmed)) {
            return `https://${trimmed}`;
        }
        return trimmed;
    };

    if (urlInput && clearUrlBtn) {
        const toggleClearBtn = () => {
            if (urlInput.value.trim().length > 0) clearUrlBtn.classList.remove('hidden');
            else clearUrlBtn.classList.add('hidden');
        };
        urlInput.addEventListener('input', toggleClearBtn);
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadBtn.click();
                urlInput.blur();
            }
        });
        clearUrlBtn.addEventListener('click', () => {
            urlInput.value = '';
            toggleClearBtn();
            urlInput.focus();
        });
    }

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

    if (toggleSettingsBtn && vodSettings) {
        toggleSettingsBtn.addEventListener('click', () => {
            vodSettings.classList.toggle('hidden');
        });
    }

    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const sb3 = Math.max(1, parseInt(document.getElementById('sb3-input').value) || 30);
        const sb2 = Math.max(1, parseInt(document.getElementById('sb2-input').value) || 15);
        const sb1 = Math.max(1, parseInt(document.getElementById('sb1-input').value) || 5);

        const sf1 = Math.max(1, parseInt(document.getElementById('sf1-input').value) || 5);
        const sf2 = Math.max(1, parseInt(document.getElementById('sf2-input').value) || 15);
        const sf3 = Math.max(1, parseInt(document.getElementById('sf3-input').value) || 30);

        skipIntervals = {
            backward: [sb3, sb2, sb1],
            forward: [sf1, sf2, sf3]
        };

        localStorage.setItem('witchSkipSettings', JSON.stringify(skipIntervals));
        updateSkipLabels();
        showToast('Intervalos de salto guardados');
    });

    // Watch History Management
    const historyList = document.getElementById('watch-history-list');

    const timeAgo = (unixTs) => {
        if (!unixTs || unixTs === 0) return "hace tiempo";
        const diff = (Date.now() / 1000) - unixTs;
        if (diff < 60) return "ahora mismo";
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        return `hace ${Math.floor(diff / 86400)} d`;
    };

    const loadHistoryList = async () => {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            historyList.innerHTML = '';

            const entries = Object.entries(data);
            if (entries.length === 0) {
                historyList.innerHTML = '<li class="history-item"><span class="history-meta">Sin videos recientes</span></li>';
                return;
            }

            entries.sort((a, b) => (b[1].last_watched || 0) - (a[1].last_watched || 0));

            entries.forEach(([id, info]) => {
                const li = document.createElement('li');
                li.className = 'history-item ' + (info.type || 'vod');

                const safeTitle = escapeHtml(info.title || id);
                const platform = info.type === 'youtube' ? 'YouTube' : 'Twitch VOD';
                const timeStr = formatTime(info.timestamp);
                const lastWatchedStr = timeAgo(info.last_watched);
                const progressPct = (info.duration && info.duration > 0)
                    ? Math.min(100, Math.max(2, (info.timestamp / info.duration) * 100))
                    : 0;

                li.innerHTML = `
                    <div class="history-item-body">
                        <span class="history-title" title="${safeTitle}">${safeTitle}</span>
                        <span class="history-meta">${platform} &bull; ${timeStr} &bull; ${lastWatchedStr}</span>
                    </div>
                    <div class="history-item-actions">
                        <button class="history-delete-btn" title="Eliminar del historial" aria-label="Eliminar">&times;</button>
                    </div>
                    ${progressPct > 0 ? `<div class="history-progress-bar"><div class="history-progress-fill" style="width:${progressPct}%"></div></div>` : ''}
                `;

                const deleteBtn = li.querySelector('.history-delete-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (ev) => {
                        ev.stopPropagation();
                        try {
                            await fetch(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
                            loadHistoryList();
                            showToast('Eliminado del historial');
                        } catch (err) {
                            console.warn('Error deleting history item', err);
                        }
                    });
                }

                li.addEventListener('click', () => {
                    const url = info.type === 'youtube'
                        ? `https://www.youtube.com/watch?v=${id}`
                        : `https://www.twitch.tv/videos/${id}`;
                    urlInput.value = url;
                    if (clearUrlBtn) clearUrlBtn.classList.remove('hidden');
                    loadBtn.click();
                });

                historyList.appendChild(li);
            });
        } catch (e) {
            console.warn("Failed to load history list", e);
        }
    };

    loadHistoryList();

    // Theater Mode
    if (theaterBtn) {
        theaterBtn.addEventListener('click', () => {
            document.body.classList.toggle('theater-mode');
            const isTheater = document.body.classList.contains('theater-mode');
            if (theaterBtnText) theaterBtnText.textContent = isTheater ? 'Salir Cine' : 'Cine';
            showOsd(isTheater ? 'Modo Cine' : 'Vista Normal');
            window.dispatchEvent(new Event('resize'));
        });
    }

    // Unified Fullscreen Logic — Fixes the stacked fullscreen conflict between .player-wrapper and <video>
    const getFullscreenElement = () => {
        return document.fullscreenElement || document.webkitFullscreenElement || null;
    };

    const syncFullscreenUI = () => {
        const fsEl = getFullscreenElement();
        const isFs = Boolean(fsEl);
        if (fsEnterIcon && fsExitIcon) {
            fsEnterIcon.classList.toggle('hidden', isFs);
            fsExitIcon.classList.toggle('hidden', !isFs);
        }
    };

    const toggleFullscreen = async () => {
        const currentFs = getFullscreenElement();
        if (currentFs) {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            } catch (err) {
                console.warn('Error exiting fullscreen:', err);
            }
            return;
        }

        // Request fullscreen on the actual active media element so native video controls
        // and custom controls share the exact same fullscreen root.
        let targetEl = playerWrapper;
        if (activePlatform === 'twitch' && !video.classList.contains('hidden')) {
            targetEl = video;
        }

        try {
            if (targetEl.requestFullscreen) {
                await targetEl.requestFullscreen();
            } else if (targetEl.webkitRequestFullscreen) {
                targetEl.webkitRequestFullscreen();
            }
        } catch (err) {
            console.warn('Error entering fullscreen:', err);
        }
    };

    document.addEventListener('fullscreenchange', () => {
        const currentFs = getFullscreenElement();
        // Guard against nested fullscreen stack (if playerWrapper was fullscreen and user clicked native video fullscreen button)
        if (lastFullscreenElement === playerWrapper && currentFs === video) {
            lastFullscreenElement = null;
            document.exitFullscreen().catch(() => {});
            return;
        }
        lastFullscreenElement = currentFs;
        syncFullscreenUI();
    });

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => toggleFullscreen());
    }

    // Picture-in-Picture
    const togglePiP = async () => {
        if (activePlatform !== 'twitch' || video.classList.contains('hidden')) {
            showToast('Picture-in-Picture disponible en streams de Twitch');
            return;
        }
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                showOsd('Salir de PiP');
            } else if (video.requestPictureInPicture) {
                await video.requestPictureInPicture();
                showOsd('Picture-in-Picture');
            }
        } catch (err) {
            console.warn('PiP error:', err);
        }
    };

    if (pipBtn) {
        pipBtn.addEventListener('click', () => togglePiP());
    }

    // Audio / Volume Controls
    const getVolume = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getVolume) {
            return (ytPlayer.getVolume() || 0) / 100;
        }
        return video.volume;
    };

    const isMuted = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.isMuted) {
            return ytPlayer.isMuted();
        }
        return video.muted;
    };

    const syncVolumeUI = () => {
        const muted = isMuted();
        const volPct = muted ? 0 : Math.round(getVolume() * 100);
        if (volumeSlider) volumeSlider.value = volPct;
        if (volumeLabel) volumeLabel.textContent = `${volPct}%`;
        if (volIconHigh && volIconMuted) {
            volIconHigh.classList.toggle('hidden', muted || volPct === 0);
            volIconMuted.classList.toggle('hidden', !(muted || volPct === 0));
        }
    };

    const setVolume = (val, showHud = true) => {
        const clamped = Math.max(0, Math.min(1, val));
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.setVolume) {
            if (clamped > 0 && ytPlayer.isMuted && ytPlayer.isMuted()) ytPlayer.unMute();
            ytPlayer.setVolume(Math.round(clamped * 100));
        } else {
            video.volume = clamped;
            if (clamped > 0 && video.muted) video.muted = false;
        }
        localStorage.setItem('witchVolume', clamped.toString());
        syncVolumeUI();
        if (showHud) {
            showOsd(
                `Volumen ${Math.round(clamped * 100)}%`,
                '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
            );
        }
    };

    const toggleMute = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.isMuted) {
            if (ytPlayer.isMuted()) {
                ytPlayer.unMute();
                showOsd('Sonido activado', '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>');
            } else {
                ytPlayer.mute();
                showOsd('Silenciado', '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>');
            }
        } else {
            video.muted = !video.muted;
            showOsd(
                video.muted ? 'Silenciado' : `Volumen ${Math.round(video.volume * 100)}%`,
                video.muted
                    ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
                    : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
            );
        }
        syncVolumeUI();
    };

    // Restore saved volume
    const savedVol = parseFloat(localStorage.getItem('witchVolume'));
    if (!isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) {
        video.volume = savedVol;
        syncVolumeUI();
    }

    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            setVolume(parseInt(e.target.value, 10) / 100, false);
        });
    }
    video.addEventListener('volumechange', syncVolumeUI);

    // Playback Speed Control
    const setPlaybackSpeed = (rate, showHud = true) => {
        const clampedRate = Math.max(0.25, Math.min(2, rate));
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.setPlaybackRate) {
            ytPlayer.setPlaybackRate(clampedRate);
        } else {
            video.playbackRate = clampedRate;
        }
        if (speedSelect) speedSelect.value = clampedRate.toString();
        if (showHud) showOsd(`Velocidad ${clampedRate}x`);
    };

    const stepPlaybackSpeed = (dir) => {
        const current = activePlatform === 'youtube' && ytPlayer && ytPlayer.getPlaybackRate
            ? ytPlayer.getPlaybackRate()
            : video.playbackRate || 1;
        let idx = SPEED_STEPS.indexOf(current);
        if (idx === -1) idx = SPEED_STEPS.indexOf(1);
        const nextIdx = Math.max(0, Math.min(SPEED_STEPS.length - 1, idx + dir));
        setPlaybackSpeed(SPEED_STEPS[nextIdx], true);
    };

    if (speedSelect) {
        speedSelect.addEventListener('change', (e) => {
            setPlaybackSpeed(parseFloat(e.target.value) || 1, true);
        });
    }

    // Core Player Getters & Actions
    const getSeekableRange = () => {
        if (activePlatform === 'youtube') {
            const dur = ytPlayer && ytPlayer.getDuration ? ytPlayer.getDuration() || 0 : 0;
            return { start: 0, end: dur };
        }
        if (isLiveMode) {
            if (video.seekable && video.seekable.length > 0) {
                return {
                    start: video.seekable.start(0),
                    end: video.seekable.end(video.seekable.length - 1)
                };
            }
            const dur = isFinite(video.duration) ? video.duration : 0;
            return { start: 0, end: dur };
        }
        const dur = isFinite(video.duration) ? video.duration : 0;
        return { start: 0, end: dur };
    };

    const getDuration = () => {
        const range = getSeekableRange();
        return Math.max(0, range.end - range.start);
    };

    const getCurrentTime = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getCurrentTime) {
            return ytPlayer.getCurrentTime() || 0;
        }
        return video.currentTime || 0;
    };

    const seekTo = (time) => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.seekTo) {
            ytPlayer.seekTo(time, true);
        } else {
            video.currentTime = time;
        }
    };

    const syncPlayPauseIcons = (paused) => {
        if (iconPlay && iconPause) {
            iconPlay.classList.toggle('hidden', !paused);
            iconPause.classList.toggle('hidden', paused);
        }
    };

    const playVideo = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.playVideo) {
            ytPlayer.playVideo();
        } else {
            video.play().catch(() => {});
        }
        syncPlayPauseIcons(false);
    };

    const pauseVideo = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.pauseVideo) {
            ytPlayer.pauseVideo();
        } else {
            video.pause();
        }
        syncPlayPauseIcons(true);
    };

    const isPaused = () => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getPlayerState) {
            return ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING;
        }
        return video.paused;
    };

    const togglePlayPause = (showHud = true) => {
        if (isPaused()) {
            playVideo();
            if (showHud) showOsd('Reproducir', '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor"/>');
        } else {
            pauseVideo();
            if (showHud) showOsd('Pausa', '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>');
        }
    };

    video.addEventListener('play', () => syncPlayPauseIcons(false));
    video.addEventListener('pause', () => {
        syncPlayPauseIcons(true);
        if (isLiveMode) updateLiveStatusUI();
    });

    // Helper to pick the absolute best HLS quality level (Source / max resolution / max FPS / max bitrate)
    const selectBestHlsLevel = (levels) => {
        if (!levels || levels.length === 0) return -1;
        let bestIdx = levels.length - 1;
        let bestScore = -1;

        levels.forEach((lvl, idx) => {
            const videoAttr = (lvl.attrs && lvl.attrs.VIDEO) ? String(lvl.attrs.VIDEO).toLowerCase() : '';
            const lvlName = (lvl.name || '').toLowerCase();
            const isSource = (videoAttr === 'chunked' || lvlName.includes('source') || lvlName.includes('chunked')) ? 1 : 0;
            const pixels = (lvl.width || 0) * (lvl.height || 0) || ((lvl.height || 0) * (lvl.height || 0));
            const fps = lvl.frameRate || 30;
            const bitrate = lvl.bitrate || 0;

            // Prioritize Source ("chunked"), then resolution, then frameRate, then bitrate
            const score = (isSource * 1e15) + (pixels * 1e7) + (fps * 1e5) + (bitrate / 100);
            if (score >= bestScore) {
                bestScore = score;
                bestIdx = idx;
            }
        });

        return bestIdx;
    };

    // YouTube-Style Live DVR Rewind & "Jump to Live Edge" ("Ir a lo último")
    const attachHlsSource = (sourceUrl, onReadyCallback = null) => {
        if (hls) {
            hls.destroy();
            hls = null;
        }
        if (Hls.isSupported()) {
            hls = new Hls({
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
                backBufferLength: 7200, // Keep up to 2 hours of live buffer in memory for instant rewind
                capLevelToPlayerSize: false, // Never limit quality to window size
                abrEwmaDefaultEstimate: 50000000, // Assume 50 Mbps from segment 0 so it starts directly at max quality
            });
            hls.loadSource(sourceUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                // Always lock onto the highest available quality for both Live and VODs
                if (data.levels && data.levels.length > 0) {
                    const bestLevel = selectBestHlsLevel(data.levels);
                    if (bestLevel >= 0) {
                        hls.startLevel = bestLevel;
                        hls.currentLevel = bestLevel;
                        hls.nextLevel = bestLevel;
                        hls.loadLevel = bestLevel;

                        const chosen = data.levels[bestLevel];
                        if (streamQualityBadge && chosen) {
                            const hLabel = chosen.height ? `${chosen.height}p` : 'Source';
                            const fpsLabel = chosen.frameRate && chosen.frameRate > 30 ? `${Math.round(chosen.frameRate)}` : '';
                            streamQualityBadge.textContent = `${hLabel}${fpsLabel} • Max`;
                            streamQualityBadge.classList.remove('hidden');
                        }
                    }
                }
                if (onReadyCallback) onReadyCallback();
                else video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (event, errData) => {
                if (errData.fatal) {
                    if (errData.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    } else {
                        showError("El stream se encontró, pero la reproducción se interrumpió o ha finalizado.");
                        loadBtn.disabled = false;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = sourceUrl;
            video.addEventListener('loadedmetadata', () => {
                if (onReadyCallback) onReadyCallback();
                else video.play().catch(() => {});
            }, { once: true });
        } else {
            showError("Tu navegador no soporta reproducción HLS.");
        }
    };

    // Switch transparently to Twitch's active broadcast DVR archive when rewinding before the live buffer start
    const switchToLiveDvr = (secondsBehindLive) => {
        if (!liveDvrUrl || isUsingDvrSource) return false;
        isUsingDvrSource = true;
        showOsd('Rebobinando directo (DVR)...');
        attachHlsSource(liveDvrUrl, () => {
            const applySeek = () => {
                const range = getSeekableRange();
                const target = Math.max(range.start, range.end - secondsBehindLive);
                video.currentTime = target;
                video.play().catch(() => {});
                updateLiveStatusUI();
            };
            if (video.readyState >= 1) applySeek();
            else video.addEventListener('loadedmetadata', applySeek, { once: true });
        });
        return true;
    };

    // Jump right back to the Live Edge ("Ir al último")
    const jumpToLiveEdge = () => {
        if (!isLiveMode) return;
        setPlaybackSpeed(1, false);
        if (isUsingDvrSource && liveStreamUrl) {
            isUsingDvrSource = false;
            showOsd('EN VIVO • Al último');
            attachHlsSource(liveStreamUrl, () => {
                video.play().catch(() => {});
                updateLiveStatusUI();
            });
            return;
        }
        const range = getSeekableRange();
        const liveSync = (hls && hls.liveSyncPosition) ? hls.liveSyncPosition : Math.max(range.start, range.end - 1.5);
        seekTo(liveSync);
        playVideo();
        showOsd('EN VIVO • Al último');
        updateLiveStatusUI();
    };

    if (liveEdgeBtn) liveEdgeBtn.addEventListener('click', jumpToLiveEdge);
    if (timelineLiveBtn) timelineLiveBtn.addEventListener('click', jumpToLiveEdge);

    const updateLiveStatusUI = () => {
        if (!isLiveMode) return;
        const range = getSeekableRange();
        const cur = getCurrentTime();
        const rawBehind = Math.max(0, range.end - cur);
        const behindSeconds = isUsingDvrSource ? Math.max(12, rawBehind) : rawBehind;
        const atLiveEdge = !isUsingDvrSource && !video.paused && behindSeconds <= 7.5;

        if (liveEdgeBtn) {
            liveEdgeBtn.classList.toggle('at-live', atLiveEdge);
            liveEdgeBtn.classList.toggle('behind-live', !atLiveEdge);
        }
        if (timelineLiveBtn) {
            timelineLiveBtn.classList.toggle('at-live', atLiveEdge);
            timelineLiveBtn.classList.toggle('behind-live', !atLiveEdge);
        }

        if (atLiveEdge) {
            if (liveEdgeLabel) liveEdgeLabel.textContent = 'EN VIVO';
            if (liveBehindBadge) liveBehindBadge.classList.add('hidden');
            if (timelineLiveText) timelineLiveText.textContent = 'EN VIVO • AL DÍA';
            currentTimeEl.textContent = formatTime(Math.max(0, cur - range.start));
            totalTimeEl.textContent = 'EN VIVO';
        } else {
            const behindFormatted = formatShortTime(behindSeconds);
            if (liveEdgeLabel) liveEdgeLabel.textContent = `-${behindFormatted}`;
            if (liveBehindBadge) liveBehindBadge.classList.remove('hidden');
            if (timelineLiveText) timelineLiveText.textContent = `-${behindFormatted} • IR AL ÚLTIMO ⏭`;
            currentTimeEl.textContent = formatTime(Math.max(0, cur - range.start));
            totalTimeEl.textContent = `-${behindFormatted} del directo`;
        }
    };

    // Unified Skip Function (works seamlessly in both VOD and Live!)
    const skip = (amount) => {
        if (!hasLoadedMedia) return;
        const range = getSeekableRange();
        const span = range.end - range.start;

        if (isLiveMode) {
            const cur = getCurrentTime();
            const target = cur + amount;

            // If rewinding before the start of the current live buffer, seamlessly switch to DVR archive if available!
            if (amount < 0 && target < range.start + 1 && !isUsingDvrSource && liveDvrUrl) {
                const currentBehind = Math.max(0, range.end - cur);
                switchToLiveDvr(currentBehind + Math.abs(amount));
                return;
            }

            // If skipping forward reaches the live edge while on DVR, snap back to real-time live stream
            if (amount > 0 && target >= range.end - 2) {
                jumpToLiveEdge();
                return;
            }

            const clamped = Math.max(range.start, Math.min(range.end - 0.5, target));
            seekTo(clamped);
            showOsd(`${amount > 0 ? '+' : ''}${amount}s`);
            updateLiveStatusUI();
            return;
        }

        if (span <= 0) return;
        let newTime = getCurrentTime() + amount;
        if (newTime < range.start) newTime = range.start;
        if (newTime > range.end) newTime = range.end;
        seekTo(newTime);
        showOsd(`${amount > 0 ? '+' : ''}${amount}s`);
    };

    document.getElementById('skip-back-3').addEventListener('click', () => skip(-skipIntervals.backward[0]));
    document.getElementById('skip-back-2').addEventListener('click', () => skip(-skipIntervals.backward[1]));
    document.getElementById('skip-back-1').addEventListener('click', () => skip(-skipIntervals.backward[2]));

    document.getElementById('skip-fwd-1').addEventListener('click', () => skip(skipIntervals.forward[0]));
    document.getElementById('skip-fwd-2').addEventListener('click', () => skip(skipIntervals.forward[1]));
    document.getElementById('skip-fwd-3').addEventListener('click', () => skip(skipIntervals.forward[2]));

    playPauseBtn.addEventListener('click', () => togglePlayPause(true));

    // Interactive Timeline Scrubber Logic
    const updateTimelineUI = () => {
        if (!timelineProgress || !timelineThumb) return;
        const range = getSeekableRange();
        const span = range.end - range.start;
        const cur = getCurrentTime();

        timelineProgress.classList.toggle('live-edge-mode', isLiveMode);

        if (span <= 0) {
            timelineProgress.style.width = isLiveMode ? '100%' : '0%';
            timelineThumb.style.left = isLiveMode ? '100%' : '0%';
            return;
        }

        const pct = Math.max(0, Math.min(100, ((cur - range.start) / span) * 100));
        timelineProgress.style.width = `${pct}%`;
        timelineThumb.style.left = `${pct}%`;

        if (timelineBuffer && activePlatform === 'twitch' && video.buffered && video.buffered.length > 0) {
            const bufEnd = video.buffered.end(video.buffered.length - 1);
            const bufPct = Math.max(0, Math.min(100, ((bufEnd - range.start) / span) * 100));
            timelineBuffer.style.width = `${bufPct}%`;
        }
    };

    if (timelineBarWrap) {
        const getFractionFromEvent = (ev) => {
            const rect = timelineBarWrap.getBoundingClientRect();
            const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
            return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        };

        const previewTimeline = (ev) => {
            const frac = getFractionFromEvent(ev);
            const range = getSeekableRange();
            const span = range.end - range.start;
            if (timelineTooltip && span > 0) {
                timelineTooltip.classList.remove('hidden');
                timelineTooltip.style.left = `${frac * 100}%`;
                if (isLiveMode) {
                    const behind = Math.round((1 - frac) * span);
                    timelineTooltip.textContent = behind <= 3 ? 'EN VIVO' : `-${formatShortTime(behind)}`;
                } else {
                    timelineTooltip.textContent = formatTime(range.start + frac * span);
                }
            }
        };

        const commitTimelineSeek = (ev) => {
            if (!hasLoadedMedia) return;
            const frac = getFractionFromEvent(ev);
            const range = getSeekableRange();
            const span = range.end - range.start;

            // If user clicks near the start of a newly-opened Live stream with DVR available, switch to full DVR
            if (isLiveMode && !isUsingDvrSource && liveDvrUrl && span < 120 && frac < 0.85) {
                const targetBehind = Math.max(15, Math.round((1 - frac) * 300));
                switchToLiveDvr(targetBehind);
                return;
            }

            if (span <= 0) return;
            if (isLiveMode && frac >= 0.985) {
                jumpToLiveEdge();
                return;
            }
            const targetTime = range.start + frac * span;
            seekTo(targetTime);
            if (isLiveMode) updateLiveStatusUI();
            updateTimelineUI();
        };

        timelineBarWrap.addEventListener('mousemove', (ev) => {
            previewTimeline(ev);
            if (isDraggingTimeline) commitTimelineSeek(ev);
        });
        timelineBarWrap.addEventListener('mouseleave', () => {
            if (timelineTooltip && !isDraggingTimeline) timelineTooltip.classList.add('hidden');
        });
        timelineBarWrap.addEventListener('mousedown', (ev) => {
            isDraggingTimeline = true;
            commitTimelineSeek(ev);
        });
        window.addEventListener('mouseup', () => {
            if (isDraggingTimeline) {
                isDraggingTimeline = false;
                if (timelineTooltip) timelineTooltip.classList.add('hidden');
            }
        });
    }

    // Shortcuts Modal
    const toggleShortcutsModal = (forceState = null) => {
        if (!shortcutsModal) return;
        const shouldShow = forceState !== null ? forceState : shortcutsModal.classList.contains('hidden');
        shortcutsModal.classList.toggle('hidden', !shouldShow);
    };

    if (shortcutsBtn) shortcutsBtn.addEventListener('click', () => toggleShortcutsModal());
    if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', () => toggleShortcutsModal(false));
    if (shortcutsModal) {
        shortcutsModal.addEventListener('click', (e) => {
            if (e.target === shortcutsModal) toggleShortcutsModal(false);
        });
    }

    // Comprehensive Standard Video Player Keyboard Bindings
    window.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
            if (e.key === 'Escape') e.target.blur();
            return;
        }
        // Never hijack browser shortcuts with Ctrl, Alt, or Meta
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        const key = e.key;
        const lower = key.toLowerCase();

        // Allow key repeat ONLY for continuous actions (seeking & volume)
        const repeatableKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ',', '.'];
        if (e.repeat && !repeatableKeys.includes(key)) return;

        if (key === 'Escape') {
            if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
                e.preventDefault();
                toggleShortcutsModal(false);
                return;
            }
            if (document.body.classList.contains('theater-mode') && !getFullscreenElement()) {
                e.preventDefault();
                theaterBtn.click();
                return;
            }
            return;
        }

        if (key === '?') {
            e.preventDefault();
            toggleShortcutsModal();
            return;
        }

        if (key === '/') {
            e.preventDefault();
            if (urlInput) {
                urlInput.focus();
                urlInput.select();
            }
            return;
        }

        if (key === ' ' || e.code === 'Space' || lower === 'k') {
            e.preventDefault();
            togglePlayPause(true);
        } else if (key === 'ArrowLeft') {
            e.preventDefault();
            const amount = e.shiftKey ? skipIntervals.backward[0] : skipIntervals.backward[2];
            skip(-amount);
        } else if (key === 'ArrowRight') {
            e.preventDefault();
            const amount = e.shiftKey ? skipIntervals.forward[2] : skipIntervals.forward[0];
            skip(amount);
        } else if (lower === 'j') {
            e.preventDefault();
            skip(-skipIntervals.backward[1]);
        } else if (lower === 'l') {
            e.preventDefault();
            if (e.shiftKey && isLiveMode) {
                jumpToLiveEdge();
            } else {
                skip(skipIntervals.forward[1]);
            }
        } else if (key === 'ArrowUp') {
            e.preventDefault();
            setVolume(getVolume() + 0.05, true);
        } else if (key === 'ArrowDown') {
            e.preventDefault();
            setVolume(getVolume() - 0.05, true);
        } else if (lower === 'm') {
            e.preventDefault();
            toggleMute();
        } else if (lower === 'f') {
            e.preventDefault();
            toggleFullscreen();
        } else if (lower === 't') {
            e.preventDefault();
            if (theaterBtn) theaterBtn.click();
        } else if (lower === 'p' || lower === 'i') {
            e.preventDefault();
            togglePiP();
        } else if (key === 'Home') {
            e.preventDefault();
            const range = getSeekableRange();
            seekTo(range.start);
            showOsd('Inicio (00:00)');
        } else if (key === 'End') {
            e.preventDefault();
            if (isLiveMode) {
                jumpToLiveEdge();
            } else {
                const range = getSeekableRange();
                if (range.end > 0) seekTo(Math.max(0, range.end - 1));
            }
        } else if (key === '<' || key === '[') {
            e.preventDefault();
            stepPlaybackSpeed(-1);
        } else if (key === '>' || key === ']') {
            e.preventDefault();
            stepPlaybackSpeed(1);
        } else if ((key === ',' || key === '.') && isPaused()) {
            e.preventDefault();
            const frameStep = key === '.' ? (1 / 30) : -(1 / 30);
            seekTo(Math.max(0, getCurrentTime() + frameStep));
            showOsd(key === '.' ? '+1 frame' : '-1 frame');
        } else if (/^[0-9]$/.test(key) && !e.shiftKey) {
            e.preventDefault();
            const pct = parseInt(key, 10) * 10;
            const range = getSeekableRange();
            const span = range.end - range.start;
            if (span > 0) {
                // If in newly opened Live stream and user presses 0-8, switch to DVR if available
                if (isLiveMode && !isUsingDvrSource && liveDvrUrl && span < 120 && pct < 90) {
                    switchToLiveDvr(Math.round(((100 - pct) / 100) * 300));
                    return;
                }
                seekTo(range.start + (span * (pct / 100)));
                showOsd(`${pct}%`);
            }
        }
    }, true);

    clearCacheBtn.addEventListener('click', async () => {
        if (confirm("¿Seguro que deseas borrar todo el historial de reproducción?")) {
            try {
                await fetch('/api/history', { method: 'DELETE' });
                showToast("Historial borrado correctamente");
                loadHistoryList();
            } catch (e) {
                console.error("Failed to clear history", e);
                showError("No se pudo borrar el historial.");
            }
        }
    });

    // Direct Timestamp Jump (works in VOD and Live DVR)
    goBtn.addEventListener('click', () => {
        const range = getSeekableRange();
        const span = range.end - range.start;
        if (span <= 0 && !liveDvrUrl) return;

        const h = parseInt(tsH.value, 10) || 0;
        const m = parseInt(tsM.value, 10) || 0;
        const s = parseInt(tsS.value, 10) || 0;

        if (m > 59 || s > 59 || h < 0 || m < 0 || s < 0) {
            showError("Formato de tiempo inválido.");
            return;
        }

        const targetTime = (h * 3600) + (m * 60) + s;
        if (isLiveMode) {
            if (!isUsingDvrSource && liveDvrUrl && targetTime < range.start) {
                isUsingDvrSource = true;
                attachHlsSource(liveDvrUrl, () => {
                    video.currentTime = targetTime;
                    video.play().catch(() => {});
                });
                hideError();
                return;
            }
            seekTo(Math.min(range.end, range.start + targetTime));
            hideError();
            return;
        }

        if (targetTime > range.end) {
            showError("El tiempo supera la duración del video.");
            return;
        }

        seekTo(targetTime);
        showOsd(formatTime(targetTime));
        hideError();
    });

    watchAgainBtn.addEventListener('click', () => {
        const range = getSeekableRange();
        seekTo(range.start);
        playVideo();
        watchAgainBtn.classList.add('hidden');
    });

    // Save Watch History
    const saveHistory = async (timestamp) => {
        if (isLiveMode || !currentVodId) return;

        const payload = {
            timestamp,
            type: activePlatform,
            duration: getDuration() || undefined,
            channel: currentChannelName || undefined,
        };

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
            await fetch(`/api/history/${encodeURIComponent(currentVodId)}`, {
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

    // YouTube time & timeline update loop
    setInterval(() => {
        if (activePlatform === 'youtube' && ytPlayer && ytPlayer.getPlayerState) {
            const state = ytPlayer.getPlayerState();
            syncPlayPauseIcons(state !== YT.PlayerState.PLAYING);
            if (!isLiveMode) {
                const cur = getCurrentTime();
                const dur = getDuration();
                currentTimeEl.textContent = formatTime(cur);
                totalTimeEl.textContent = formatTime(dur);
                updateTimelineUI();

                if (dur > 0 && cur >= dur - 1) {
                    watchAgainBtn.classList.remove('hidden');
                } else {
                    watchAgainBtn.classList.add('hidden');
                }
            }
        }
    }, 250);

    video.addEventListener('pause', () => {
        if (activePlatform === 'twitch' && !isLiveMode && currentVodId && video.duration) {
            saveHistory(video.currentTime);
            loadHistoryList();
        }
    });

    window.addEventListener('beforeunload', () => {
        if (!isLiveMode && currentVodId && getDuration() && !isPaused()) {
            const blob = new Blob(
                [JSON.stringify({ timestamp: getCurrentTime(), title: currentVideoTitle, type: activePlatform, duration: getDuration() })],
                { type: 'application/json' }
            );
            navigator.sendBeacon(`/api/history/${encodeURIComponent(currentVodId)}`, blob);
        }
    });

    video.addEventListener('timeupdate', () => {
        if (activePlatform !== 'twitch') return;
        updateTimelineUI();
        if (isLiveMode) {
            updateLiveStatusUI();
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
        } else {
            updateLiveStatusUI();
        }
        updateTimelineUI();
    });

    if (hlsToggleBtn && hlsUrlContainer) {
        hlsToggleBtn.addEventListener('click', () => {
            hlsUrlContainer.classList.toggle('hidden');
        });
    }

    copyHlsBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(hlsUrlInput.value);
        } catch {
            hlsUrlInput.select();
            document.execCommand('copy');
        }
        showToast('URL HLS copiada al portapapeles');
    });

    const showError = (msg) => {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    };

    const hideError = () => {
        errorMsg.classList.add('hidden');
    };

    const updateStreamMetadataBar = (type, idVal, title, meta = {}) => {
        if (!streamInfoBar) return;
        streamInfoBar.classList.remove('hidden');

        if (platformBadge) {
            platformBadge.classList.toggle('youtube', type === 'youtube');
            platformBadge.textContent = type === 'live' ? 'Twitch Live' : (type === 'youtube' ? 'YouTube' : 'Twitch VOD');
        }

        if (streamTitleDisplay) {
            streamTitleDisplay.textContent = title || (type === 'live' ? `Directo de ${idVal}` : `Video ${idVal}`);
        }

        currentChannelName = meta.channel || (type === 'live' ? idVal : null);
        if (streamChannelDisplay) {
            streamChannelDisplay.textContent = currentChannelName || '';
        }

        if (streamAvatar) {
            if (meta.avatar) {
                streamAvatar.src = meta.avatar;
                streamAvatar.classList.remove('hidden');
            } else {
                streamAvatar.classList.add('hidden');
            }
        }

        if (streamGameDisplay) {
            if (meta.game) {
                streamGameDisplay.textContent = meta.game;
                streamGameDisplay.classList.remove('hidden');
            } else {
                streamGameDisplay.classList.add('hidden');
            }
        }

        if (streamViewersDisplay) {
            if (type === 'live' && typeof meta.viewers === 'number') {
                streamViewersDisplay.textContent = `● ${meta.viewers.toLocaleString()} espectadores`;
                streamViewersDisplay.classList.remove('hidden');
            } else {
                streamViewersDisplay.classList.add('hidden');
            }
        }
    };

    const setLiveMode = (isLive) => {
        isLiveMode = isLive;
        // Keep skip buttons & timeline ALWAYS visible in both Live and VOD (YouTube Live behavior!)
        vodSkipBack.classList.remove('hidden');
        vodSkipFwd.classList.remove('hidden');
        vodTimestamp.classList.remove('hidden');

        if (isLive) {
            liveIndicator.classList.remove('hidden');
            if (timelineLiveBtn) timelineLiveBtn.classList.remove('hidden');
            if (hlsToggleBtn) hlsToggleBtn.classList.remove('hidden');
            watchAgainBtn.classList.add('hidden');
            currentTimeEl.textContent = "00:00:00";
            totalTimeEl.textContent = "EN VIVO";
        } else {
            liveIndicator.classList.add('hidden');
            if (timelineLiveBtn) timelineLiveBtn.classList.add('hidden');
            if (hlsToggleBtn) hlsToggleBtn.classList.add('hidden');
            hlsUrlContainer.classList.add('hidden');
            watchAgainBtn.classList.add('hidden');
            currentTimeEl.textContent = "00:00:00";
            totalTimeEl.textContent = "00:00:00";
        }
    };

    loadBtn.addEventListener('click', async () => {
        const rawInput = urlInput.value.trim();
        if (!rawInput) {
            showError("Por favor, introduce una URL de Twitch o YouTube.");
            return;
        }

        const url = normalizeInputUrl(rawInput);
        urlInput.value = url;

        hideError();
        loadBtn.disabled = true;
        const loadSpan = loadBtn.querySelector('span');
        if (loadSpan) loadSpan.textContent = "Cargando...";
        else loadBtn.textContent = "Cargando...";

        try {
            const res = await fetch('/api/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || "No se pudo resolver este stream o video.");
                loadBtn.disabled = false;
                if (loadSpan) loadSpan.textContent = "Cargar";
                else loadBtn.textContent = "Cargar";
                return;
            }

            hasLoadedMedia = true;
            if (playerPlaceholder) playerPlaceholder.classList.add('hidden');

            const type = data.type; // 'live', 'vod', or 'youtube'
            currentVodId = data.id_val;
            currentVideoTitle = data.title || null;
            const meta = data.meta || {};
            let startTs = data.start_time || 0;

            updateStreamMetadataBar(type, data.id_val, currentVideoTitle, meta);

            // Fetch saved watch history if VOD/YouTube and no explicit ?t= param was given
            if (type !== 'live' && !startTs) {
                try {
                    const histRes = await fetch(`/api/history/${encodeURIComponent(currentVodId)}`);
                    if (histRes.ok) {
                        const histData = await histRes.json();
                        if (histData.timestamp) {
                            startTs = histData.timestamp;
                            showToast(`Reanudando desde ${formatTime(startTs)}`);
                        }
                    }
                } catch (e) {
                    console.warn("Could not load history", e);
                }
            }

            if (type === 'youtube') {
                activePlatform = 'youtube';
                isUsingDvrSource = false;
                liveStreamUrl = null;
                liveDvrUrl = null;
                if (streamQualityBadge) {
                    streamQualityBadge.textContent = 'HD • Max';
                    streamQualityBadge.classList.remove('hidden');
                }

                video.classList.add('hidden');
                video.pause();
                if (hls) { hls.destroy(); hls = null; }
                const ytIframe = document.getElementById('youtube-player');
                if (ytIframe) ytIframe.classList.remove('hidden');

                setLiveMode(false);

                const forceYtMaxQuality = (playerInstance) => {
                    if (!playerInstance) return;
                    try {
                        if (playerInstance.getAvailableQualityLevels) {
                            const levels = playerInstance.getAvailableQualityLevels();
                            if (levels && levels.length > 0 && playerInstance.setPlaybackQuality) {
                                playerInstance.setPlaybackQuality(levels[0]);
                            }
                        } else if (playerInstance.setPlaybackQuality) {
                            playerInstance.setPlaybackQuality('highres');
                        }
                    } catch {}
                };

                const initYt = () => {
                    if (ytPlayer && ytPlayer.loadVideoById) {
                        ytPlayer.loadVideoById({ videoId: data.id_val, startSeconds: startTs, suggestedQuality: 'highres' });
                        forceYtMaxQuality(ytPlayer);
                    } else {
                        ytPlayer = new YT.Player('youtube-player', {
                            videoId: data.id_val,
                            playerVars: { autoplay: 1, start: Math.floor(startTs), playsinline: 1, rel: 0 },
                            events: {
                                onReady: (e) => {
                                    forceYtMaxQuality(e.target);
                                    e.target.playVideo();
                                    syncVolumeUI();
                                },
                                onStateChange: (e) => {
                                    if (e.data === YT.PlayerState.BUFFERING || e.data === YT.PlayerState.PLAYING) {
                                        forceYtMaxQuality(e.target);
                                    }
                                    const videoData = e.target.getVideoData ? e.target.getVideoData() : null;
                                    if (videoData && videoData.title && !currentVideoTitle) {
                                        currentVideoTitle = videoData.title;
                                        if (streamTitleDisplay) streamTitleDisplay.textContent = currentVideoTitle;
                                    }
                                    if (videoData && videoData.isLive) {
                                        showError("YouTube Live streams are not supported in Witch.");
                                        e.target.stopVideo();
                                    } else if (e.data === YT.PlayerState.PAUSED) {
                                        saveHistory(getCurrentTime());
                                        loadHistoryList();
                                    }
                                },
                                onError: () => {
                                    showError("Este video de YouTube no está disponible o no permite inserción.");
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

                isUsingDvrSource = false;
                liveStreamUrl = type === 'live' ? data.m3u8_url : null;
                liveDvrUrl = type === 'live' ? (data.dvr_m3u8_url || null) : null;

                setLiveMode(type === 'live');
                const m3u8_url = data.m3u8_url;

                if (type === 'live') {
                    hlsUrlInput.value = data.raw_url || m3u8_url;
                } else {
                    video.dataset.startTs = startTs;
                }

                attachHlsSource(m3u8_url, () => {
                    if (type !== 'live' && startTs > 0) {
                        video.currentTime = startTs;
                    }
                    video.play().catch(() => {});
                    if (type !== 'live') {
                        saveHistory(startTs || 0);
                        loadHistoryList();
                    }
                });
            }
        } catch (e) {
            showError("No se pudo conectar con el servidor local de Witch.");
            console.error(e);
        }

        loadBtn.disabled = false;
        if (loadSpan) loadSpan.textContent = "Cargar";
        else loadBtn.textContent = "Cargar";
    });
});
