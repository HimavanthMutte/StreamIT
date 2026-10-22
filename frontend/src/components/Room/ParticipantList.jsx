import React from 'react';
import { User, Crown, X } from 'lucide-react';

const ParticipantList = ({
  participants,
  hostUsername,
  currentUsername,
  offlineUsers,
  onKickUser,
}) => {
  return (
    <div className="p-4 border-b-2 border-[var(--color-surface-border)] bg-[var(--color-surface-hover)]">
      <h3 className="font-bold uppercase text-xs text-[var(--color-text-muted)] mb-3 tracking-widest">
        Participants ({participants.length})
      </h3>
      <div className="flex gap-4 overflow-x-auto pt-4 pb-2 px-2">
        {participants.map((p, idx) => {
          const isHost = p === hostUsername;
          const isOffline = offlineUsers.includes(p);
          const displayName = p.length > 8 ? p.substring(0, 8) + '...' : p;

          return (
            <div
              key={idx}
              className={`flex flex-col items-center gap-1 min-w-[60px] transition-opacity duration-300 ${
                isOffline ? 'opacity-40 grayscale' : 'opacity-100'
              } group/avatar`}
              title={isOffline ? `${p} (Offline)` : p}
            >
              <div
                className={`relative w-10 h-10 bg-[var(--color-bg-base)] border-2 ${
                  isHost ? 'border-yellow-500' : 'border-[var(--color-accent)]'
                } flex items-center justify-center text-[var(--color-text-main)]`}
              >
                <User
                  size={18}
                  className={isHost ? 'text-yellow-500' : 'text-[var(--color-accent)]'}
                />
                {isHost && (
                  <div
                    className="absolute -top-3 -right-3 bg-[var(--color-bg-base)] rounded-full p-1 border-2 border-yellow-500"
                    title="Host"
                  >
                    <Crown size={10} className="text-yellow-500" />
                  </div>
                )}
                {currentUsername === hostUsername && !isHost && (
                  <button
                    onClick={() => onKickUser(p)}
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
                <span className="text-[8px] font-bold text-[var(--color-warning)] uppercase mt-0.5 tracking-wide">
                  Offline
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantList;
