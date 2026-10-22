import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeHeader from '../components/Home/HomeHeader';
import CreateRoomCard from '../components/Home/CreateRoomCard';
import JoinRoomCard from '../components/Home/JoinRoomCard';
import RoomList from '../components/Home/RoomList';

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
      .catch(err => console.error('Error fetching rooms:', err));
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
        setCreateError(data.message || 'Failed to create room');
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
        setJoinError(data.message || 'Failed to join room');
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
      <HomeHeader username={username} onLogout={handleLogout} />

      <motion.div
        className="max-w-5xl mx-auto space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <CreateRoomCard
            createCode={createCode}
            setCreateCode={setCreateCode}
            createError={createError}
            onSubmit={handleCreateRoom}
          />
          <JoinRoomCard
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            joinError={joinError}
            onSubmit={handleJoinRoom}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <RoomList
            rooms={joinedRooms}
            onRoomClick={(code) => navigate(`/room/${code}`)}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;
