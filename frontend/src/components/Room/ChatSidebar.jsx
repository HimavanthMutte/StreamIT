import React from 'react';
import { Send } from 'lucide-react';
import ParticipantList from './ParticipantList';
import MessageList from './MessageList';

const ChatSidebar = ({
  chatWidth,
  isLg,
  participants,
  hostUsername,
  currentUsername,
  offlineUsers,
  onKickUser,
  messages,
  userId,
  othersTyping,
  messagesEndRef,
  messageText,
  onTyping,
  onSendMessage,
}) => {
  return (
    <div
      className="flex flex-col bg-[var(--color-surface)] min-h-[400px] h-[500px] lg:h-full shrink-0 border-l-2 border-[var(--color-surface-border)] relative"
      style={{ width: isLg ? chatWidth : '100%', minWidth: isLg ? '350px' : '100%' }}
    >
      <ParticipantList
        participants={participants}
        hostUsername={hostUsername}
        currentUsername={currentUsername}
        offlineUsers={offlineUsers}
        onKickUser={onKickUser}
      />

      <div
        className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar"
        style={{ transform: 'translateZ(0)' }}
      >
        <MessageList messages={messages} userId={userId} />

        {othersTyping.length > 0 && (
          <div className="flex flex-col items-start animate-pulse">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">
              {othersTyping.join(', ')} {othersTyping.length === 1 ? 'is' : 'are'} typing
            </span>
            <div className="px-4 py-3 bg-[var(--color-bg-base)] border-2 border-[var(--color-surface-border)]">
              <p className="font-bold tracking-widest text-[var(--color-text-muted)]">...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t-2 border-[var(--color-surface-border)] bg-[var(--color-surface-hover)]">
        <form onSubmit={onSendMessage} className="flex gap-3 items-stretch">
          <input
            type="text"
            value={messageText}
            onChange={onTyping}
            placeholder="Send a message..."
            className="custom-input flex-1 px-4 py-3 rounded-none text-sm"
          />
          <button
            type="submit"
            className="gradient-btn px-6 flex items-center justify-center cursor-pointer h-auto"
            title="Send"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSidebar;
