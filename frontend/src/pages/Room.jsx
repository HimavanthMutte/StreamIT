import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, PlayCircle, User, LogOut, Crown, X } from 'lucide-react';
import io from 'socket.io-client';

const MessageList = memo(({ messages, userId }) => {
  return (
    <>
      {messages.length === 0 && (
        <p className="text-center text-[var(--color-text-muted)] font-medium mt-10 uppercase text-xs tracking-wider">No messages yet. Say hello!</p>
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
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

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

  const othersTyping = typingUsers.filter(u => u !== username);
  const hostUser = participants.find(p => p === hostUsername);
  const otherParticipants = participants.filter(p => p !== hostUsername);
  const displayParticipants = hostUser ? [hostUser, ...otherParticipants] : participants;

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full bg-[var(--color-bg-base)] text-[var(--color-text-main)] overflow-hidden">
      <div className="lg:flex-[2] flex-none aspect-video lg:aspect-auto lg:h-auto flex flex-col p-0 lg:p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--color-surface-border)] relative bg-black">
        <div className="absolute top-0 left-0 w-full p-4 lg:relative lg:p-0 flex items-center justify-between mb-0 lg:mb-6 z-30 pointer-events-auto">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-[var(--color-text-muted)] font-bold hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} /> Home
          </button>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-accent)] text-[var(--color-accent)] font-bold uppercase text-sm hover:bg-[var(--color-accent)] hover:text-white transition-all cursor-pointer"
          >
            <LogOut size={16} /> Leave Room
          </button>
        </div>

        <h2 className="hidden lg:block text-3xl font-black uppercase mb-4 tracking-tighter z-30">ROOM: {roomCode}</h2>

        <div className="flex-1 bg-black lg:border-2 border-[var(--color-surface-border)] relative flex items-center justify-center group overflow-hidden w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
          <PlayCircle size={80} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-all scale-95 group-hover:scale-110 cursor-pointer z-20" />
          <p className="absolute bottom-6 left-6 font-bold text-xl z-20">Awaiting Video Stream...</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[var(--color-surface)] min-w-0 min-h-0">
        <div className="p-4 border-b-2 border-[var(--color-surface-border)] bg-[var(--color-surface-hover)]">
          <h3 className="font-bold uppercase text-xs text-[var(--color-text-muted)] mb-3 tracking-widest">Participants ({participants.length})</h3>
          <div className="flex gap-4 overflow-x-auto pt-4 pb-2 px-2">
            {displayParticipants.map((p, idx) => {
              const isHost = p === hostUsername;
              const isOffline = offlineUsers.includes(p);

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
                    {p}
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
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={handleTyping}
              placeholder="Send a message..."
              className="custom-input flex-1 px-4 py-3 rounded-none text-sm"
            />
            <button type="submit" className="gradient-btn px-5 flex items-center justify-center cursor-pointer">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Room;
