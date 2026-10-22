import React from 'react';
import { Video, Hash, Plus } from 'lucide-react';

const CreateRoomCard = ({ createCode, setCreateCode, createError, onSubmit }) => {
  return (
    <div className="bg-[var(--color-surface)] p-6 md:p-8 border-2 border-[var(--color-surface-border)] hover:border-[var(--color-info)] transition-colors flex flex-col group">
      <h2 className="text-2xl font-black uppercase mb-2 flex items-center gap-3">
        <Video className="text-[var(--color-accent)]" />
        Host a Room
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] font-medium mb-6 uppercase tracking-wide">
        Create a new room with your own code
      </p>

      {createError && (
        <div className="bg-red-950/50 border-l-4 border-[var(--color-accent)] text-red-200 px-4 py-3 mb-4 text-sm font-medium">
          {createError}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-auto">
        <div className="flex items-center gap-3 custom-input px-4 py-3 focus-within:border-[var(--color-accent)] focus-within:shadow-[4px_4px_0_0_rgba(255,42,77,0.3)]">
          <Hash size={18} className="text-[var(--color-text-muted)] shrink-0" />
          <input
            type="text"
            required
            className="bg-transparent border-none outline-none w-full uppercase font-bold tracking-widest placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 placeholder:normal-case"
            placeholder="e.g. MOVIE-NIGHT"
            value={createCode}
            onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
          />
        </div>
        <button
          type="submit"
          className="gradient-btn w-full py-4 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={18} /> Create Room
        </button>
      </form>
    </div>
  );
};

export default CreateRoomCard;
