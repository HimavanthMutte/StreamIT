import React, { memo } from 'react';

const MessageList = memo(({ messages, userId }) => {
  return (
    <>
      {messages.length === 0 && (
        <p className="text-center text-[var(--color-text-muted)] font-medium mt-10 uppercase text-xs tracking-wider">
          No messages
        </p>
      )}
      {messages.map((msg, index) => {
        const isMe = msg.sender?._id === userId || msg.sender === userId;
        const msgUsername = msg.sender?.username || 'Unknown';
        return (
          <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">
              {isMe ? 'YOU' : msgUsername}
            </span>
            <div
              className={`px-4 py-3 max-w-[85%] ${
                isMe
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-base)] border-2 border-[var(--color-surface-border)]'
              }`}
            >
              <p className="font-medium leading-snug text-sm">{msg.text}</p>
            </div>
          </div>
        );
      })}
    </>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;
