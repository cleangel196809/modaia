import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'provider' | 'customer';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

function loadInitialState(): AuthState {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, refreshToken: null };
  }
  try {
    const raw = window.localStorage.getItem('modaia_auth');
    return raw ? JSON.parse(raw) : { user: null, accessToken: null, refreshToken: null };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function persist(state: AuthState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('modaia_auth', JSON.stringify(state));
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string; refreshToken: string }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persist(state);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      persist(state);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
