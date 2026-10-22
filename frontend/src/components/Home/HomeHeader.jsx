import React from 'react';
import { LogOut } from 'lucide-react';

const HomeHeader = ({ username, onLogout }) => {
  return (
    <header className="flex justify-between items-center mb-12 border-b border-[var(--color-surface-border)] pb-6">
      <h1 className="text-3xl font-black text-[var(--color-accent)] uppercase tracking-tighter">
        Stream It.
      </h1>
      <div className="flex items-center gap-6">
        <span className="font-bold text-[var(--color-text-muted)]">
          HELLO, {username?.toUpperCase()}
        </span>
        <button
          onClick={onLogout}
          className="text-[var(--color-accent)] hover:text-white transition-colors cursor-pointer"
          title="Log out"
        >
          <LogOut size={24} />
        </button>
      </div>
    </header>
  );
};

export default HomeHeader;
