import React from 'react';
import { Users, ArrowRight } from 'lucide-react';

const RoomList = ({ rooms, onRoomClick }) => {
  return (
    <div>
      <h3 className="text-lg font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
        <Users size={18} /> Your Rooms
      </h3>
      {rooms.length === 0 ? (
        <p className="text-[var(--color-text-muted)] font-medium py-6 border-2 border-dashed border-[var(--color-surface-border)] text-center uppercase text-sm tracking-wider">
          No rooms yet. Create or join one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room._id}
              onClick={() => onRoomClick(room.roomCode)}
              className="bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] p-5 flex justify-between items-center cursor-pointer hover:border-[var(--color-accent)] transition-all duration-200 group hover:-translate-y-1"
            >
              <div>
                <span className="font-black text-lg tracking-tight block">{room.roomCode}</span>
                <span className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
                  {new Date(room.createdAt).toLocaleDateString()}
                </span>
              </div>
              <ArrowRight
                size={18}
                className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
