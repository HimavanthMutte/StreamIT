import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, LogOut, Crown, X, Camera, CameraOff, Mic, MicOff, UploadCloud, Loader2 } from 'lucide-react';
import io from 'socket.io-client';
import CustomVideoPlayer from '../components/VideoPlayer';

const MessageList = memo(({ messages, userId }) => {
  return (
    <>
      {messages.length === 0 && (
        <p className="text-center text-[var(--color-text-muted)] font-medium mt-10 uppercase text-xs tracking-wider">No messages</p>
      )}
      {messages.map((msg, index) => {
        const isMe = msg.sender?._id === userId || msg.sender === userId;
        const msgUsername = msg.sender?.username || 'Unknown';
        return (
          <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">{isMe ? 'YOU' : msgUsername}</span>
            <div className={`px-4 py-3 max-w-[85%] ${isMe ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-base)] border-2 border-[var(--color-surface-border)]'}`}>
              <p className="font-medium leading-snug text-sm">{msg.text}</p>
            </div>
          </div>
        );
      })}
    </>
  );
});

let socket;

const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [participants, setParticipants] = useState([]);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hostUsername, setHostUsername] = useState('');

  const [videoUrl, setVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');


  const [chatWidth, setChatWidth] = useState(320);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  const [isLg, setIsLg] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsLg(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    socket = io('http://localhost:5000');
    socket.emit('join-room', { roomCode, username });

    fetch(`http://localhost:5000/api/rooms/${roomCode}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.room) {
          setHostUsername(data.room.creator?.username || '');
          if (data.room.videoUrl) {
            // Fetch presigned GET URL for streaming with range support
            fetch(`http://localhost:5000/api/rooms/${roomCode}/video-url`)
              .then(res => res.json())
              .then(vdata => {
                if (vdata.url) {
                  setVideoUrl(vdata.url);
                }
              })
              .catch(err => console.error('Error fetching presigned streaming URL', err));
          }
        }
        const msgs = data.messages || [];
        setMessages(msgs);

        const seen = new Set();
        const initial = [];
        msgs.forEach(msg => {
          const name = msg.sender?.username;
          if (name && !seen.has(name)) {
            seen.add(name);
            initial.push(name);
          }
        });
        if (!seen.has(username)) {
          initial.push(username);
        }
        if (data.room && data.room.creator?.username && !initial.includes(data.room.creator.username)) {
          initial.push(data.room.creator.username);
        }
        setParticipants(initial);
      })
      .catch(err => console.error(err));

    socket.on('user-joined', ({ username: joinedUser }) => {
      setParticipants(prev =>
        prev.includes(joinedUser) ? prev : [...prev, joinedUser]
      );
      setOfflineUsers(prev => prev.filter(u => u !== joinedUser));
    });

    socket.on('user-left', ({ username: leftUser }) => {
      setParticipants(prev => prev.filter(p => p !== leftUser));
      setTypingUsers(prev => prev.filter(u => u !== leftUser));
      setOfflineUsers(prev => prev.filter(u => u !== leftUser));
    });

    socket.on('user-disconnected', ({ username: disconnectedUser }) => {
      setOfflineUsers(prev =>
        prev.includes(disconnectedUser) ? prev : [...prev, disconnectedUser]
      );
      setTypingUsers(prev => prev.filter(u => u !== disconnectedUser));
    });

    socket.on('receive-message', (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });

    socket.on('user-kicked', ({ username: kickedUser }) => {
      if (kickedUser === username) {
        alert('You have been kicked from the room by the host.');
        handleLeaveRoom();
      } else {
        setParticipants(prev => prev.filter(p => p !== kickedUser));
        setTypingUsers(prev => prev.filter(u => u !== kickedUser));
        setOfflineUsers(prev => prev.filter(u => u !== kickedUser));
      }
    });

    socket.on('video-uploaded', () => {
      fetch(`http://localhost:5000/api/rooms/${roomCode}/video-url`)
        .then(res => res.json())
        .then(vdata => {
          if (vdata.url) setVideoUrl(vdata.url);
        })
        .catch(err => console.error('Error fetching streaming URL after upload:', err));
    });

    socket.on('user-typing', ({ username: typingUser, isTyping }) => {
      setTypingUsers(prev =>
        isTyping
          ? prev.includes(typingUser) ? prev : [...prev, typingUser]
          : prev.filter(u => u !== typingUser)
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode, userId, username, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = useCallback((e) => {
    setMessageText(e.target.value);
    socket.emit('user-typing', { roomCode, username, isTyping: true });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user-typing', { roomCode, username, isTyping: false });
    }, 1500);
  }, [roomCode, username]);

  const handleRetry = () => {
    setUploadError('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const startRes = await fetch(`http://localhost:5000/api/rooms/${roomCode}/upload/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type })
      });
      const { uploadId, key } = await startRes.json();

      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
      const numChunks = Math.ceil(file.size / CHUNK_SIZE);

      const presignRes = await fetch(`http://localhost:5000/api/rooms/${roomCode}/upload/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId, parts: numChunks })
      });
      const { urls } = await presignRes.json();

      let uploadedBytes = 0;

      const uploadPromises = urls.map(async ({ partNumber, url }, index) => {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url, true);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const eTag = xhr.getResponseHeader('ETag');
              uploadedBytes += chunk.size;
              setUploadProgress(Math.round((uploadedBytes / file.size) * 100));
              resolve({ ETag: eTag, PartNumber: partNumber });
            } else {
              reject(new Error(`Upload failed for part ${partNumber}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Upload failed for part ${partNumber}`));
          xhr.send(chunk);
        });
      });

      const parts = await Promise.all(uploadPromises);

      const completeRes = await fetch(`http://localhost:5000/api/rooms/${roomCode}/upload/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId, parts })
      });
      const { videoUrl: rawUrl } = await completeRes.json();
      // Fetch a presigned GET URL for streaming (range requests)
      const streamRes = await fetch(`http://localhost:5000/api/rooms/${roomCode}/video-url`);
      const { url: presignedUrl } = await streamRes.json();
      setVideoUrl(presignedUrl);
      socket.emit('video-uploaded', { roomCode }); // participants will each fetch their own streaming URL
      setIsUploading(false);
      setUploadProgress(100);
      setUploadError('');

    } catch (err) {
      console.error('Upload failed:', err);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadError(err.message || 'Upload failed');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    clearTimeout(typingTimeoutRef.current);
    socket.emit('user-typing', { roomCode, username, isTyping: false });

    socket.emit('send-message', {
      roomCode,
      senderId: userId,
      username,
      text: messageText
    });
    setMessageText('');
  };

  const handleLeaveRoom = async () => {
    socket.emit('leave-room', { roomCode, username });
    socket.disconnect();

    try {
      await fetch('http://localhost:5000/api/rooms/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, userId })
      });
    } catch (err) {
      console.error(err);
    }

    navigate('/home');
  };

  const handleKickUser = (targetUsername) => {
    if (username === hostUsername && targetUsername !== hostUsername) {
      if (window.confirm(`Are you sure you want to kick ${targetUsername}?`)) {
        socket.emit('kick-user', { roomCode, targetUsername });
      }
    }
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const newWidth = document.body.clientWidth - e.clientX;
    if (newWidth >= 350 && newWidth <= document.body.clientWidth * 0.5) {
      setChatWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const othersTyping = typingUsers.filter(u => u !== username);
  const hostUser = participants.find(p => p === hostUsername);
  const otherParticipants = participants.filter(p => p !== hostUsername);
  const displayParticipants = hostUser ? [hostUser, ...otherParticipants] : participants;

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full bg-[var(--color-bg-base)] text-[var(--color-text-main)] overflow-y-auto no-scrollbar lg:overflow-hidden">
      <div className="flex-1 flex flex-col p-0 lg:p-6 border-b-2 lg:border-b-0 relative bg-black min-w-0 lg:h-full overflow-y-visible lg:overflow-y-auto no-scrollbar lg:custom-scrollbar">
        <div className="relative w-full p-4 lg:p-0 flex items-center justify-between mb-0 lg:mb-4 z-30 pointer-events-auto shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="flex lg:hidden items-center gap-2 text-[var(--color-text-muted)] font-bold hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} /> Home
            </button>
            <h2 className="hidden lg:block text-2xl font-black uppercase tracking-tighter">ROOM: <span className="text-[var(--color-accent)]">{roomCode}</span></h2>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-accent)] text-[var(--color-accent)] font-bold uppercase text-sm hover:bg-[var(--color-accent)] hover:text-white transition-all cursor-pointer"
          >
            <LogOut size={16} /> Leave Room
          </button>
        </div>

        <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
          <div className="bg-black lg:border-2 border-[var(--color-surface-border)] w-full lg:w-auto lg:h-full max-w-full max-h-full aspect-video relative overflow-hidden shrink-0 flex items-center justify-center">
            {videoUrl ? (
              <CustomVideoPlayer src={videoUrl} socket={socket} roomCode={roomCode} isHost={username === hostUsername} />
            ) : username === hostUsername ? (
              <div className="flex flex-col items-center justify-center text-[var(--color-text-main)] w-full max-w-md p-6 border-2 border-dashed border-[var(--color-surface-border)] bg-[var(--color-surface)]">
                <UploadCloud size={48} className="mb-4 text-[var(--color-accent)]" />
                <h3 className="text-lg font-bold mb-2 uppercase tracking-wide">Upload Video</h3>
                <p className="text-xs text-[var(--color-text-muted)] text-center mb-6">Select a video file to play for the room.</p>

                {isUploading ? (
                  <div className="w-full flex flex-col items-center">
                    <Loader2 size={24} className="animate-spin text-[var(--color-accent)] mb-2" />
                    <div className="w-full bg-[var(--color-bg-base)] h-2 border border-[var(--color-surface-border)] mt-2">
                      <div className="bg-[var(--color-accent)] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <span className="text-xs font-bold mt-2 tracking-wider">
                      {uploadProgress === 100 ? 'PROCESSING VIDEO...' : `${uploadProgress}% UPLOADED`}
                    </span>
                  </div>
                ) : (
                  <div className="upload-controls">
                    <label className="gradient-btn px-6 py-2 cursor-pointer uppercase text-xs font-bold tracking-wider">
                      Select File
                      <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                    {uploadError && (
                      <div className="w-full flex flex-col items-center mt-2">
                        <p className="text-sm text-[var(--color-warning)] mb-2">{uploadError}</p>
                        <button onClick={handleRetry} className="gradient-btn px-4 py-2">
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)] p-8 text-center">
                <Loader2 size={40} className="animate-spin mb-4 opacity-50" />
                <h3 className="text-lg font-bold uppercase tracking-widest text-[var(--color-text-main)] mb-2">Waiting for Host</h3>
                <p className="text-sm font-medium">The host is uploading a video. Please wait...</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 shrink-0 h-56 flex flex-col px-4 lg:px-0 pb-6 lg:pb-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold uppercase text-xs text-[var(--color-text-muted)] tracking-widest">
              <span className="text-[var(--color-accent)] mr-2">•</span> VIDEO CALL — {participants.length} PARTICIPANTS
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCamOn(!camOn)}
                className={`flex items-center justify-center gap-2 w-32 py-1.5 border-2 ${camOn ? 'border-green-500 text-green-500' : 'border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:text-white hover:border-white'} text-xs font-bold uppercase transition-colors cursor-pointer`}
              >
                {camOn ? <Camera size={14} /> : <CameraOff size={14} />}
                {camOn ? 'CAM ON' : 'CAM OFF'}
              </button>
              <button
                onClick={() => setMicOn(!micOn)}
                className={`flex items-center justify-center gap-2 w-32 py-1.5 border-2 ${micOn ? 'border-green-500 text-green-500' : 'border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:text-white hover:border-white'} text-xs font-bold uppercase transition-colors cursor-pointer`}
              >
                {micOn ? <Mic size={14} /> : <MicOff size={14} />}
                {micOn ? 'MIC ON' : 'MIC OFF'}
              </button>
            </div>
          </div>

          <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
            {displayParticipants.map((p, idx) => (
              <div key={idx} className="h-full aspect-video min-w-[300px] bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] flex flex-col justify-end relative">
                {(!camOn || p !== username) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                    <CameraOff size={24} className="mb-2 opacity-50" />
                    <span className="text-[10px] font-bold">CAM OFF</span>
                  </div>
                ) : null}
                <div className="bg-[var(--color-surface-hover)] p-2 text-[10px] font-bold uppercase truncate z-10 w-full border-t border-[var(--color-surface-border)]">
                  {p.length > 15 ? p.substring(0, 15) + '...' : p} {p === username ? '(YOU)' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="w-1.5 hover:w-2 cursor-col-resize bg-[var(--color-surface-border)] hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)] transition-all z-40 lg:block hidden"
        onMouseDown={handleMouseDown}
      />

      <div
        className="flex flex-col bg-[var(--color-surface)] min-h-[400px] h-[500px] lg:h-full shrink-0 border-l-2 border-[var(--color-surface-border)] relative"
        style={{ width: isLg ? chatWidth : '100%', minWidth: isLg ? '350px' : '100%' }}
      >
        <div className="p-4 border-b-2 border-[var(--color-surface-border)] bg-[var(--color-surface-hover)]">
          <h3 className="font-bold uppercase text-xs text-[var(--color-text-muted)] mb-3 tracking-widest">Participants ({participants.length})</h3>
          <div className="flex gap-4 overflow-x-auto pt-4 pb-2 px-2">
            {displayParticipants.map((p, idx) => {
              const isHost = p === hostUsername;
              const isOffline = offlineUsers.includes(p);
              const displayName = p.length > 8 ? p.substring(0, 8) + '...' : p;

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-1 min-w-[60px] transition-opacity duration-300 ${isOffline ? 'opacity-40 grayscale' : 'opacity-100'} group/avatar`}
                  title={isOffline ? `${p} (Offline)` : p}
                >
                  <div className={`relative w-10 h-10 bg-[var(--color-bg-base)] border-2 ${isHost ? 'border-yellow-500' : 'border-[var(--color-accent)]'} flex items-center justify-center text-[var(--color-text-main)]`}>
                    <User size={18} className={isHost ? 'text-yellow-500' : 'text-[var(--color-accent)]'} />
                    {isHost && (
                      <div className="absolute -top-3 -right-3 bg-[var(--color-bg-base)] rounded-full p-1 border-2 border-yellow-500" title="Host">
                        <Crown size={10} className="text-yellow-500" />
                      </div>
                    )}
                    {username === hostUsername && !isHost && (
                      <button
                        onClick={() => handleKickUser(p)}
                        className="absolute -top-3 -right-3 bg-[var(--color-bg-base)] rounded-full p-1 border-2 border-[var(--color-accent)] hover:bg-[var(--color-accent)] transition-colors opacity-0 group-hover/avatar:opacity-100 hidden md:block cursor-pointer"
                        title="Kick User"
                      >
                        <X size={10} className="text-[var(--color-accent)] hover:text-white" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase truncate w-full text-center leading-tight">
                    {displayName}
                  </span>
                  {isOffline && (
                    <span className="text-[8px] font-bold text-[var(--color-warning)] uppercase mt-0.5 tracking-wide">Offline</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar" style={{ transform: 'translateZ(0)' }}>
          <MessageList messages={messages} userId={userId} />
          {othersTyping.length > 0 && (
            <div className="flex flex-col items-start animate-pulse">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">{othersTyping.join(', ')} {othersTyping.length === 1 ? 'is' : 'are'} typing</span>
              <div className="px-4 py-3 bg-[var(--color-bg-base)] border-2 border-[var(--color-surface-border)]">
                <p className="font-bold tracking-widest text-[var(--color-text-muted)]">...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t-2 border-[var(--color-surface-border)] bg-[var(--color-surface-hover)]">
          <form onSubmit={handleSendMessage} className="flex gap-3 items-stretch">
            <input
              type="text"
              value={messageText}
              onChange={handleTyping}
              placeholder="Send a message..."
              className="custom-input flex-1 px-4 py-3 rounded-none text-sm"
            />
            <button type="submit" className="gradient-btn px-6 flex items-center justify-center cursor-pointer h-auto">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Room;
