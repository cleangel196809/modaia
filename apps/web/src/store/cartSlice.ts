import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  image?: string;
  size: string;
  color: string;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
}

function loadInitialState(): CartState {
  if (typeof window === 'undefined') {
    return { items: [] };
  }
  try {
    const raw = window.localStorage.getItem('modaia_cart');
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function persist(state: CartState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('modaia_cart', JSON.stringify(state));
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: loadInitialState(),
  reducers: {
    addItem: (state, action: PayloadAction<Omit<CartItem, 'quantity'> & { quantity?: number }>) => {
      const quantity = action.payload.quantity ?? 1;
      const existing = state.items.find(
        (item) =>
          item.productId === action.payload.productId &&
          item.size === action.payload.size &&
          item.color === action.payload.color,
      );
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, existing.stock);
      } else {
        state.items.push({ ...action.payload, quantity: Math.min(quantity, action.payload.stock) });
      }
      persist(state);
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string; size: string; color: string; quantity: number }>) => {
      const item = state.items.find(
        (i) => i.productId === action.payload.productId && i.size === action.payload.size && i.color === action.payload.color,
      );
      if (item) {
        item.quantity = Math.max(1, Math.min(action.payload.quantity, item.stock));
      }
      persist(state);
    },
    removeItem: (state, action: PayloadAction<{ productId: string; size: string; color: string }>) => {
      state.items = state.items.filter(
        (i) => !(i.productId === action.payload.productId && i.size === action.payload.size && i.color === action.payload.color),
      );
      persist(state);
    },
    clearCart: (state) => {
      state.items = [];
      persist(state);
    },
  },
});

export const { addItem, updateQuantity, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
