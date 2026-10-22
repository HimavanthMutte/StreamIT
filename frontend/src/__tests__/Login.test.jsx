import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderLogin = () => {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  };

  it('renders all form elements, branding, and links properly', () => {
    renderLogin();

    // Branding / Hero
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/STREAM\s*IT\./i);
    expect(screen.getByText(/the definitive cinematic experience/i)).toBeInTheDocument();

    // Form title
    expect(screen.getByRole('heading', { level: 2, name: /welcome back/i })).toBeInTheDocument();

    // Inputs & Labels
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole('button', { name: /access account/i })).toBeInTheDocument();

    // Navigation Links
    expect(screen.getByRole('link', { name: /forgot\?/i })).toBeInTheDocument();
    const signupLink = screen.getByRole('link', { name: /create one/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('allows user to type into email and password inputs', async () => {
    const user = userEvent.setup();
    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'secretpassword');

    expect(emailInput).toHaveValue('user@example.com');
    expect(passwordInput).toHaveValue('secretpassword');
  });

  it('handles successful login, saves user data to localStorage, and navigates to /home', async () => {
    const user = userEvent.setup();
    const fakeUserData = {
      token: 'jwt-mock-token-xyz',
      user: {
        id: 'user-12345',
        username: 'cinephile',
      },
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeUserData,
    });

    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /access account/i });

    await user.type(emailInput, 'cinephile@example.com');
    await user.type(passwordInput, 'mypassword123');
    await user.click(submitBtn);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cinephile@example.com',
        password: 'mypassword123',
      }),
    });

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-mock-token-xyz');
      expect(localStorage.getItem('userId')).toBe('user-12345');
      expect(localStorage.getItem('username')).toBe('cinephile');
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  it('displays error message when login fails with invalid credentials', async () => {
    const user = userEvent.setup();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /access account/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays default error message when server response fails without a message', async () => {
    const user = userEvent.setup();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /access account/i }));

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('displays network error message when backend server is unreachable', async () => {
    const user = userEvent.setup();

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderLogin();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /access account/i }));

    await waitFor(() => {
      expect(screen.getByText('An error occurred. Is the backend running?')).toBeInTheDocument();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows loading state while authentication is in progress', async () => {
    const user = userEvent.setup();

    // Create a promise that stays pending until we resolve it
    let resolveLogin;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    global.fetch.mockReturnValueOnce(loginPromise);

    renderLogin();

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /access account/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitBtn);

    // Verify loading state
    expect(screen.getByText(/authenticating/i)).toBeInTheDocument();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitBtn).toBeDisabled();

    // Resolve login
    resolveLogin({
      ok: true,
      json: async () => ({
        token: 'token-123',
        user: { id: '1', username: 'user1' },
      }),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });
});
