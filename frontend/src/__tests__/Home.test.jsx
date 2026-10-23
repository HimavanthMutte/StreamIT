import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Home Component', () => {
  const mockUserId = 'user-abc-123';
  const mockUsername = 'moviefan';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupAuthenticatedUser = () => {
    localStorage.setItem('userId', mockUserId);
    localStorage.setItem('username', mockUsername);
  };

  const renderHome = () => {
    return render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  };

  it('redirects to /login if user is not authenticated', () => {
    renderHome();

    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches joined rooms and renders header, action cards, and empty rooms state', async () => {
    setupAuthenticatedUser();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderHome();

    // Check fetch was called for joined rooms
    expect(global.fetch).toHaveBeenCalledWith(`/api/rooms/joined?userId=${mockUserId}`);

    // Header verification
    expect(screen.getByRole('heading', { level: 1, name: /stream it\./i })).toBeInTheDocument();
    expect(screen.getByText(`HELLO, ${mockUsername.toUpperCase()}`)).toBeInTheDocument();
    expect(screen.getByTitle(/log out/i)).toBeInTheDocument();

    // Host & Join card titles
    expect(screen.getByRole('heading', { level: 2, name: /host a room/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /join a room/i })).toBeInTheDocument();

    // Inputs & Placeholders
    expect(screen.getByPlaceholderText(/e\.g\. movie-night/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter room code/i)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();

    // Empty room list state
    await waitFor(() => {
      expect(screen.getByText(/no rooms yet\. create or join one above\./i)).toBeInTheDocument();
    });
  });

  it('renders joined rooms list and navigates to room on click', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    const mockRooms = [
      { _id: '1', roomCode: 'CINEMA-CLUB', createdAt: '2026-03-01T12:00:00.000Z' },
      { _id: '2', roomCode: 'RETRO-WATCH', createdAt: '2026-03-02T15:30:00.000Z' },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRooms,
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('CINEMA-CLUB')).toBeInTheDocument();
      expect(screen.getByText('RETRO-WATCH')).toBeInTheDocument();
    });

    // Click on a room card
    const roomCard = screen.getByText('CINEMA-CLUB');
    await user.click(roomCard);

    expect(mockNavigate).toHaveBeenCalledWith('/room/CINEMA-CLUB');
  });

  it('handles user logout properly', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderHome();

    const logoutBtn = screen.getByTitle(/log out/i);
    await user.click(logoutBtn);

    expect(localStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles successful room creation and navigates to the new room', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    // Initial fetch for rooms
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Create room fetch response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Room created successfully', roomCode: 'MARVEL-NIGHT' }),
    });

    renderHome();

    const createInput = screen.getByPlaceholderText(/e\.g\. movie-night/i);
    const createBtn = screen.getByRole('button', { name: /create room/i });

    await user.type(createInput, 'marvel-night');
    expect(createInput).toHaveValue('MARVEL-NIGHT');

    await user.click(createBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: 'MARVEL-NIGHT', userId: mockUserId }),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/room/MARVEL-NIGHT');
    });
  });

  it('displays error message when room creation fails on server', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    // Initial fetch for rooms
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Create room error response
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Room code already exists' }),
    });

    renderHome();

    const createInput = screen.getByPlaceholderText(/e\.g\. movie-night/i);
    const createBtn = screen.getByRole('button', { name: /create room/i });

    await user.type(createInput, 'EXISTING-ROOM');
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Room code already exists')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/room/EXISTING-ROOM');
  });

  it('displays error message when room creation encounters a network error', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    // Initial fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Network error on create
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderHome();

    const createInput = screen.getByPlaceholderText(/e\.g\. movie-night/i);
    const createBtn = screen.getByRole('button', { name: /create room/i });

    await user.type(createInput, 'NEW-ROOM');
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Could not reach server.')).toBeInTheDocument();
    });
  });

  it('handles successful room join and navigates to the joined room', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    // Initial fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Join room success
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Joined successfully' }),
    });

    renderHome();

    const joinInput = screen.getByPlaceholderText(/enter room code/i);
    const joinBtn = screen.getByRole('button', { name: /join room/i });

    await user.type(joinInput, 'party-101');
    expect(joinInput).toHaveValue('PARTY-101');

    await user.click(joinBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: 'PARTY-101', userId: mockUserId }),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/room/PARTY-101');
    });
  });

  it('displays error message when joining a non-existent room', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    // Initial fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Join room error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Room not found' }),
    });

    renderHome();

    const joinInput = screen.getByPlaceholderText(/enter room code/i);
    const joinBtn = screen.getByRole('button', { name: /join room/i });

    await user.type(joinInput, 'INVALID-ROOM');
    await user.click(joinBtn);

    await waitFor(() => {
      expect(screen.getByText('Room not found')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/room/INVALID-ROOM');
  });

  it('displays network error message when joining room encounters network failure', async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();

    // Initial fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Network failure on join
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));

    renderHome();

    const joinInput = screen.getByPlaceholderText(/enter room code/i);
    const joinBtn = screen.getByRole('button', { name: /join room/i });

    await user.type(joinInput, 'ANY-ROOM');
    await user.click(joinBtn);

    await waitFor(() => {
      expect(screen.getByText('Could not reach server.')).toBeInTheDocument();
    });
  });
});
