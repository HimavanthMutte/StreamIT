import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../pages/Signup';

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Signup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderSignup = () => {
    return render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
  };

  it('renders all form elements, branding, and links properly', () => {
    renderSignup();

    // Branding / Hero
    expect(screen.getByRole('heading', { level: 1, name: /join now/i })).toBeInTheDocument();

    // Form title
    expect(screen.getByRole('heading', { level: 2, name: /create account/i })).toBeInTheDocument();

    // Inputs & Labels
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/johndoe/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();

    // Navigation Link to Login
    const loginLink = screen.getByRole('link', { name: /log in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('allows user to type into username, email, and password inputs', async () => {
    const user = userEvent.setup();
    renderSignup();

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, 'newstreamer');
    await user.type(emailInput, 'new@example.com');
    await user.type(passwordInput, 'securePass123');

    expect(usernameInput).toHaveValue('newstreamer');
    expect(emailInput).toHaveValue('new@example.com');
    expect(passwordInput).toHaveValue('securePass123');
  });

  it('toggles password visibility when hovering over the eye icon', async () => {
    renderSignup();

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the toggle container div
    const toggleContainer = passwordInput.parentElement.querySelector('div');
    expect(toggleContainer).toBeInTheDocument();

    // Mouse enter reveals password
    fireEvent.mouseEnter(toggleContainer);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Mouse leave hides password
    fireEvent.mouseLeave(toggleContainer);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles successful signup, saves user data to localStorage, and navigates to /home', async () => {
    const user = userEvent.setup();
    const fakeUserData = {
      token: 'jwt-signup-token-456',
      user: {
        id: 'new-user-id-789',
        username: 'cinephile99'
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeUserData
    });

    renderSignup();

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign up/i });

    await user.type(usernameInput, 'cinephile99');
    await user.type(emailInput, 'cinephile99@example.com');
    await user.type(passwordInput, 'supersecret');
    await user.click(submitBtn);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'cinephile99',
        email: 'cinephile99@example.com',
        password: 'supersecret'
      })
    });

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-signup-token-456');
      expect(localStorage.getItem('userId')).toBe('new-user-id-789');
      expect(localStorage.getItem('username')).toBe('cinephile99');
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  it('displays error message when signup fails on the server', async () => {
    const user = userEvent.setup();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'User already exists' })
    });

    renderSignup();

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign up/i });

    await user.type(usernameInput, 'existinguser');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('User already exists')).toBeInTheDocument();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays default error message when server response fails without a message', async () => {
    const user = userEvent.setup();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({})
    });

    renderSignup();

    await user.type(screen.getByLabelText(/username/i), 'user');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText('Signup failed')).toBeInTheDocument();
    });
  });

  it('displays network error message when backend server is unreachable', async () => {
    const user = userEvent.setup();

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderSignup();

    await user.type(screen.getByLabelText(/username/i), 'user');
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText('An error occurred. Is the backend running?')).toBeInTheDocument();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows loading state while registration is in progress', async () => {
    const user = userEvent.setup();

    let resolveSignup;
    const signupPromise = new Promise((resolve) => {
      resolveSignup = resolve;
    });

    global.fetch.mockReturnValueOnce(signupPromise);

    renderSignup();

    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign up/i });

    await user.type(usernameInput, 'user');
    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitBtn);

    // Verify loading state
    expect(screen.getByText(/registering/i)).toBeInTheDocument();
    expect(usernameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitBtn).toBeDisabled();

    // Resolve signup
    resolveSignup({
      ok: true,
      json: async () => ({
        token: 'new-token-123',
        user: { id: '99', username: 'user' }
      })
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });
});
