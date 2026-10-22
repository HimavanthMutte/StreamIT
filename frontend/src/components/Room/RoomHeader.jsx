import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';

const RoomHeader = ({ roomCode, onNavigateHome, onLeaveRoom }) => {
  return (
    <div className="relative w-full p-4 lg:p-0 flex items-center justify-between mb-0 lg:mb-4 z-30 pointer-events-auto shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onNavigateHome}
          className="flex lg:hidden items-center gap-2 text-[var(--color-text-muted)] font-bold hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} /> Home
        </button>
        <h2 className="hidden lg:block text-2xl font-black uppercase tracking-tighter">
          ROOM: <span className="text-[var(--color-accent)]">{roomCode}</span>
        </h2>
      </div>
      <button
        onClick={onLeaveRoom}
        className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-accent)] text-[var(--color-accent)] font-bold uppercase text-sm hover:bg-[var(--color-accent)] hover:text-white transition-all cursor-pointer"
      >
        <LogOut size={16} /> Leave Room
      </button>
    </div>
  );
};

export default RoomHeader;
