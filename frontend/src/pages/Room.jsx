import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import CustomVideoPlayer from '../components/VideoPlayer';
import RoomHeader from '../components/Room/RoomHeader';
import VideoUploadArea from '../components/Room/VideoUploadArea';
import ChatSidebar from '../components/Room/ChatSidebar';

let socket;

const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  // Chat & room state
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [participants, setParticipants] = useState([]);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hostUsername, setHostUsername] = useState('');

  // Video streaming & upload state
  const [videoUrl, setVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Layout resize state
  const [chatWidth, setChatWidth] = useState(320);
  const [isLg, setIsLg] = useState(window.innerWidth >= 1024);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  // Handle responsive resize
  useEffect(() => {
    const handleResize = () => setIsLg(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize socket & fetch room data
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
            fetch(`http://localhost:5000/api/rooms/${roomCode}/video-url`)
              .then(res => res.json())
              .then(vdata => {
                if (vdata.url) setVideoUrl(vdata.url);
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
      .catch(err => console.error('Error fetching room messages:', err));

    socket.on('user-joined', ({ username: joinedUser }) => {
      setParticipants(prev => (prev.includes(joinedUser) ? prev : [...prev, joinedUser]));
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

  // Scroll chat to bottom on new messages
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
      await completeRes.json();

      const streamRes = await fetch(`http://localhost:5000/api/rooms/${roomCode}/video-url`);
      const { url: presignedUrl } = await streamRes.json();
      setVideoUrl(presignedUrl);
      socket.emit('video-uploaded', { roomCode });
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
      console.error('Error leaving room:', err);
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

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const othersTyping = typingUsers.filter(u => u !== username);
  const hostUser = participants.find(p => p === hostUsername);
  const otherParticipants = participants.filter(p => p !== hostUsername);
  const displayParticipants = hostUser ? [hostUser, ...otherParticipants] : participants;

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full bg-[var(--color-bg-base)] text-[var(--color-text-main)] overflow-y-auto no-scrollbar lg:overflow-hidden">
      <div className="flex-1 flex flex-col p-0 lg:p-6 border-b-2 lg:border-b-0 relative bg-black min-w-0 lg:h-full overflow-y-visible lg:overflow-y-auto no-scrollbar lg:custom-scrollbar">
        <RoomHeader
          roomCode={roomCode}
          onNavigateHome={() => navigate('/home')}
          onLeaveRoom={handleLeaveRoom}
        />

        <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
          <div className="bg-black lg:border-2 border-[var(--color-surface-border)] w-full h-full relative overflow-hidden shrink-0 flex items-center justify-center">
            {videoUrl ? (
              <CustomVideoPlayer
                src={videoUrl}
                socket={socket}
                roomCode={roomCode}
                isHost={username === hostUsername}
              />
            ) : (
              <VideoUploadArea
                isHost={username === hostUsername}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
                onFileUpload={handleFileUpload}
                onRetry={handleRetry}
              />
            )}
          </div>
        </div>
      </div>

      <div
        className="w-1.5 hover:w-2 cursor-col-resize bg-[var(--color-surface-border)] hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)] transition-all z-40 lg:block hidden"
        onMouseDown={handleMouseDown}
      />

      <ChatSidebar
        chatWidth={chatWidth}
        isLg={isLg}
        participants={displayParticipants}
        hostUsername={hostUsername}
        currentUsername={username}
        offlineUsers={offlineUsers}
        onKickUser={handleKickUser}
        messages={messages}
        userId={userId}
        othersTyping={othersTyping}
        messagesEndRef={messagesEndRef}
        messageText={messageText}
        onTyping={handleTyping}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default Room;
