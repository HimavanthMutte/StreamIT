import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthInput from '../components/Auth/AuthInput';
import AuthErrorBanner from '../components/Auth/AuthErrorBanner';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
        navigate('/home');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (_err) {
      setError('An error occurred. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1,
      },
    },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div
      className="flex min-h-screen w-full flex-col lg:flex-row-reverse"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="flex-1 flex flex-col justify-center p-8 lg:p-24 bg-[var(--color-accent)] border-b lg:border-b-0 lg:border-l border-[var(--color-surface-border)] relative overflow-hidden">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          className="absolute bottom-0 right-0 w-full h-8 bg-black/50 origin-right"
        />

        <motion.h1
          variants={itemVariants}
          className="text-hero font-black text-black uppercase mb-6 tracking-tighter"
        >
          JOIN NOW
        </motion.h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <motion.div className="w-full max-w-md" variants={itemVariants}>
          <h2 className="text-3xl font-bold tracking-tight mb-8">Create Account</h2>

          <AuthErrorBanner error={error} />

          <form onSubmit={handleSubmit} className="space-y-6">
            <AuthInput
              id="usernameInput"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              disabled={isLoading}
              variants={itemVariants}
            />

            <AuthInput
              id="emailSignupInput"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              variants={itemVariants}
            />

            <AuthInput
              id="passwordSignupInput"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              variants={itemVariants}
              allowPasswordToggle={true}
            />

            <motion.div variants={itemVariants} className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="gradient-btn w-full py-5 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Registering
                  </>
                ) : (
                  <>
                    Sign Up
                    <ArrowRight
                      size={20}
                      className="group-hover:translate-x-2 transition-transform duration-300"
                    />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          <motion.div
            variants={itemVariants}
            className="mt-12 pt-8 border-t border-[var(--color-surface-border)]"
          >
            <p className="text-sm text-[var(--color-text-muted)] font-medium">
              ALREADY REGISTERED?{' '}
              <Link
                to="/login"
                className="text-[var(--color-accent)] hover:text-white font-bold transition-colors uppercase tracking-wider ml-2 border-b-2 border-transparent hover:border-[var(--color-accent)] pb-1"
              >
                Log In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Signup;
