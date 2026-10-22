import React from 'react';
import { motion } from 'framer-motion';

const AuthErrorBanner = ({ error }) => {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="bg-red-950/50 border-l-4 border-[var(--color-accent)] text-red-200 px-4 py-4 mb-8 font-medium"
    >
      {error}
    </motion.div>
  );
};

export default AuthErrorBanner;
