import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Plus, Users, ArrowRight, Video, Hash } from 'lucide-react';

const Home = () => {
  const [createCode, setCreateCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  const fetchJoinedRooms = () => {
    fetch(`http://localhost:5000/api/rooms/joined?userId=${userId}`)
      .then(res => res.json())
      .then(data => setJoinedRooms(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    fetchJoinedRooms();
  }, [userId, navigate]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createCode.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: createCode, userId })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/room/${createCode}`);
      } else {
        setCreateError(data.message);
      }
    } catch (err) {
      setCreateError('Could not reach server.');
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: joinCode, userId })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/room/${joinCode}`);
      } else {
        setJoinError(data.message);
      }
    } catch (err) {
      setJoinError('Could not reach server.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-main)] p-8">
      <header className="flex justify-between items-center mb-12 border-b border-[var(--color-surface-border)] pb-6">
        <h1 className="text-3xl font-black text-[var(--color-accent)] uppercase tracking-tighter">Stream It.</h1>
        <div className="flex items-center gap-6">
          <span className="font-bold text-[var(--color-text-muted)]">HELLO, {username?.toUpperCase()}</span>
          <button onClick={handleLogout} className="text-[var(--color-accent)] hover:text-white transition-colors">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <motion.div
        className="max-w-5xl mx-auto space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-[var(--color-surface)] p-6 md:p-8 border-2 border-[var(--color-surface-border)] hover:border-[var(--color-info)] transition-colors flex flex-col group">
            <h2 className="text-2xl font-black uppercase mb-2 flex items-center gap-3">
              <Video className="text-[var(--color-accent)]" />
              Host a Room
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] font-medium mb-6 uppercase tracking-wide">Create a new room with your own code</p>

            {createError && (
              <div className="bg-red-950/50 border-l-4 border-[var(--color-accent)] text-red-200 px-4 py-3 mb-4 text-sm font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4 mt-auto">
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
              <button type="submit" className="gradient-btn w-full py-4 flex items-center justify-center gap-2">
                <Plus size={18} /> Create Room
              </button>
            </form>
          </div>

          <div className="bg-[var(--color-surface)] p-6 md:p-8 border-2 border-[var(--color-surface-border)] hover:border-[var(--color-success)] transition-colors flex flex-col group">
            <h2 className="text-2xl font-black uppercase mb-2 flex items-center gap-3">
              <Users className="text-[var(--color-accent)]" />
              Join a Room
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] font-medium mb-6 uppercase tracking-wide">Enter a room code shared with you</p>

            {joinError && (
              <div className="bg-red-950/50 border-l-4 border-[var(--color-accent)] text-red-200 px-4 py-3 mb-4 text-sm font-medium">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4 mt-auto">
              <div className="flex items-center gap-3 custom-input px-4 py-3 focus-within:border-[var(--color-accent)] focus-within:shadow-[4px_4px_0_0_rgba(255,42,77,0.3)]">
                <Hash size={18} className="text-[var(--color-text-muted)] shrink-0" />
                <input
                  type="text"
                  required
                  className="bg-transparent border-none outline-none w-full uppercase font-bold tracking-widest placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 placeholder:normal-case"
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
              </div>
              <button type="submit" className="gradient-btn w-full py-4 flex items-center justify-center gap-2">
                <ArrowRight size={18} /> Join Room
              </button>
            </form>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
            <Users size={18} /> Your Rooms
          </h3>
          {joinedRooms.length === 0 ? (
            <p className="text-[var(--color-text-muted)] font-medium py-6 border-2 border-dashed border-[var(--color-surface-border)] text-center uppercase text-sm tracking-wider">
              No rooms yet. Create or join one above.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {joinedRooms.map(room => (
                <div
                  key={room._id}
                  onClick={() => navigate(`/room/${room.roomCode}`)}
                  className="bg-[var(--color-surface)] border-2 border-[var(--color-surface-border)] p-5 flex justify-between items-center cursor-pointer hover:border-[var(--color-accent)] transition-all duration-200 group hover:-translate-y-1"
                >
                  <div>
                    <span className="font-black text-lg tracking-tight block">{room.roomCode}</span>
                    <span className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">{new Date(room.createdAt).toLocaleDateString()}</span>
                  </div>
                  <ArrowRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;
