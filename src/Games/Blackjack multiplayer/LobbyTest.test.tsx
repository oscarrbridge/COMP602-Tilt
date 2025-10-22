import { vi } from 'vitest';

// 1) declare mocks FIRST (before importing the component under test)
vi.mock('../../../Backend/lobby_functions', () => ({
  createGameLobby: vi.fn(async () => 'GAME1'),
  joinGameLobby: vi.fn(async () => {}),
  updatePlayerData: vi.fn(),
  setNextTurn: vi.fn(),
  updateGameState: vi.fn(),
}));

// If you’re using the Firestore in-memory mock file we wrote:
vi.mock('firebase/firestore');

// 2) now import the component (and test utils)
import LobbyTest from './lobbytest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

void LobbyTest;
void render;
void screen;
void userEvent;
