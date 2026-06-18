import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import './index.css';

// ─── Stable top-level component — MUST live outside CustomVideoPlayer ──────────
// If defined inside the parent, React treats it as a new component type on every
// render (which happens every animation frame via onTimeUpdate), causing it to
// unmount/remount on each frame → visible flicker while the video plays.
const VolumeControls = ({ isMuted, volume, onToggleMute, onVolumeChange }) => (
  <div className="vp-volume-container">
    <button onClick={onToggleMute} className="vp-btn vp-volume-btn" aria-label={isMuted ? 'Unmute' : 'Mute'}>
      {isMuted || volume === 0 ? (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      )}
    </button>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={isMuted ? 0 : volume}
      onChange={onVolumeChange}
      className="vp-volume-slider"
      style={{ '--volume': `${(isMuted ? 0 : volume) * 100}%` }}
    />
  </div>
);

const CustomVideoPlayer = ({ src, poster, socket, roomCode, isHost }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const controlsTimeoutRef = useRef(null); // FIX: use ref so clearTimeout works across renders

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayBlocked, setIsPlayBlocked] = useState(false); // true when browser blocks autoplay
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Plays the video and shows a "click to play" overlay if the browser blocks it
  const safePlay = useCallback((video) => {
    video.play().then(() => {
      setIsPlayBlocked(false);
    }).catch(err => {
      if (err.name === 'NotAllowedError') {
        // Browser autoplay policy blocked the play() call.
        // Show an overlay so the participant can click once to satisfy the gesture requirement.
        setIsPlayBlocked(true);
      } else {
        console.warn('video.play() failed:', err);
      }
    });
  }, []);

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // ─── Host-only controls ────────────────────────────────────────────────────

  const togglePlay = () => {
    if (!isHost) return;
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      if (socket && roomCode) socket.emit('video-pause', { roomCode, time: video.currentTime });
    } else {
      video.play().catch(e => console.log('Play prevented:', e));
      if (socket && roomCode) socket.emit('video-play', { roomCode, time: video.currentTime });
    }
    // Don't set isPlaying here — let the play/pause events drive the state (FIX)
  };

  const handleSeek = (e) => {
    if (!isHost) return;
    const seekTo = (e.target.value / 100) * videoRef.current.duration;
    videoRef.current.currentTime = seekTo;
    setProgress(e.target.value);
    if (socket && roomCode) socket.emit('video-seek', { roomCode, time: seekTo });
  };

  // ─── Local-only volume / mute (works for both host AND participants) ────────

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (newVolume > 0) videoRef.current.muted = false;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const mutedState = !isMuted;
    video.muted = mutedState;
    setIsMuted(mutedState);
    if (mutedState) {
      // Don't change the volume slider — just mute the element so unmuting restores level
    } else {
      // If volume was 0, restore to a sensible default
      if (video.volume === 0) {
        video.volume = 1;
        setVolume(1);
      }
    }
  };

  // ─── Progress tracking ────────────────────────────────────────────────────

  const handleProgress = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    if (!isNaN(total) && total > 0) {
      setProgress((current / total) * 100);
    }
    setCurrentTime(formatTime(current));
  };

  const handleLoadedData = () => {
    if (videoRef.current) {
      setDuration(formatTime(videoRef.current.duration));
    }
  };

  const handleCanPlay = () => setIsVideoLoading(false);
  const handleWaiting = () => setIsVideoLoading(true);
  const handlePlaying = () => setIsVideoLoading(false);

  // ─── Fullscreen ───────────────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => {
        console.error(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ─── Sync play/pause state from native video events (FIX) ─────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  // ─── Socket listeners for participants ────────────────────────────────────

  useEffect(() => {
    if (!socket || isHost) return;

    const handleVideoPlay = ({ time }) => {
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - time) > 0.5) {
        video.currentTime = time;
      }
      safePlay(video);
    };

    const handleVideoPause = ({ time }) => {
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - time) > 0.5) {
        video.currentTime = time;
      }
      video.pause();
    };

    const handleVideoSeek = ({ time }) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    };

    socket.on('video-play', handleVideoPlay);
    socket.on('video-pause', handleVideoPause);
    socket.on('video-seek', handleVideoSeek);

    return () => {
      socket.off('video-play', handleVideoPlay);
      socket.off('video-pause', handleVideoPause);
      socket.off('video-seek', handleVideoSeek);
    };
  }, [socket, isHost, safePlay]);

  // ─── Load new src ─────────────────────────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Reset state when a new source is loaded
    setProgress(0);
    setCurrentTime('00:00');
    setDuration('00:00');
    setIsPlaying(false);
    setIsVideoLoading(true);

    video.load();

    // Both host AND participants auto-play when a new src loads.
    // - Host: they are the one who uploaded, so they start playing immediately.
    // - Participants: by the time their video finishes loading, the host is
    //   already playing. Auto-playing here syncs them up. From this point on
    //   the host's socket events (video-play/pause/seek) keep everyone in sync.
    const tryPlay = () => safePlay(video);
    video.addEventListener('loadedmetadata', tryPlay, { once: true });
    return () => video.removeEventListener('loadedmetadata', tryPlay);
  }, [src, isHost]);

  // ─── Controls auto-hide ───────────────────────────────────────────────────

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(prev => {
        // Only hide if video is playing (read from the ref, not closure)
        return videoRef.current && !videoRef.current.paused ? false : prev;
      });
    }, 2500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      setShowControls(false);
    }
  }, []);


  return (
    <div
      className={`vp-container ${isFullscreen ? 'vp-fullscreen' : ''}`}
      ref={playerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {isVideoLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 pointer-events-none">
          <Loader2 size={48} className="animate-spin text-[#ff0033]" />
          <p className="text-[#ff0033] text-xs font-bold mt-4 tracking-widest uppercase">Buffering...</p>
        </div>
      )}
      <video
        ref={videoRef}
        className="vp-video"
        src={src || 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'}
        poster={poster}
        controls={false}
        style={{ width: '100%', height: '100%' }}
        onClick={togglePlay}
        onTimeUpdate={handleProgress}
        onLoadedData={handleLoadedData}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
      />

      {/* ── HOST controls (full: play/pause, seek, volume, fullscreen) ── */}
      {isHost && (
        <div className={`vp-controls ${showControls ? 'vp-controls-visible' : 'vp-controls-hidden'}`}>
          <div className="vp-progress-container">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="vp-progress-bar"
              style={{ '--progress': `${progress}%` }}
            />
          </div>

          <div className="vp-controls-bottom">
            <div className="vp-controls-left">
              <button onClick={togglePlay} className="vp-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>

              <VolumeControls
                isMuted={isMuted}
                volume={volume}
                onToggleMute={toggleMute}
                onVolumeChange={handleVolumeChange}
              />

              <span className="vp-time">{currentTime} / {duration}</span>
            </div>

            <div className="vp-controls-right">
              <button onClick={toggleFullscreen} className="vp-btn" aria-label="Fullscreen">
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PARTICIPANT controls (mute/volume only — purely local, no socket) ── */}
      {!isHost && (
        <div className={`vp-controls vp-participant-controls ${showControls ? 'vp-controls-visible' : 'vp-controls-hidden'}`}>
          <div className="vp-controls-bottom">
            <div className="vp-controls-left">
              <VolumeControls
                isMuted={isMuted}
                volume={volume}
                onToggleMute={toggleMute}
                onVolumeChange={handleVolumeChange}
              />
            </div>
            <div className="vp-controls-right">
              <button onClick={toggleFullscreen} className="vp-btn" aria-label="Fullscreen">
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomVideoPlayer;
