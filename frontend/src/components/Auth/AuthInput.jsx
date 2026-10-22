import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  required = true,
  variants,
  extraLabelRight,
  allowPasswordToggle = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = allowPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <motion.div className="space-y-3" variants={variants}>
      <div className="flex justify-between items-center">
        <label
          htmlFor={id}
          className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider block"
        >
          {label}
        </label>
        {extraLabelRight}
      </div>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          required={required}
          className={`custom-input w-full px-5 py-4 rounded-none ${
            allowPasswordToggle ? 'pr-12' : ''
          }`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />

        {allowPasswordToggle && (
          <div
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white cursor-pointer transition-colors"
            onMouseEnter={() => setShowPassword(true)}
            onMouseLeave={() => setShowPassword(false)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AuthInput;
