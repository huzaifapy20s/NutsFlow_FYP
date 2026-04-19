import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const initialState = {
  invoice_number: "",
  customer_id: "",
  receipt_account_id: "",
  paid_amount: "0.00",
  payment_method: "cash",
  notes: "",
  cartItems: [],
  submitting: false,
  error: null,
};

export const submitSale = createAsyncThunk("pos/submitSale", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState().pos;
    const payload = {
      invoice_number: state.invoice_number,
      customer_id: state.customer_id || null,
      receipt_account_id: state.receipt_account_id || null,
      paid_amount: state.paid_amount,
      payment_method: state.payment_method,
      notes: state.notes,
      sale_items: state.cartItems.map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    };
    const response = await axiosClient.post("/api/sales", payload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to submit sale.");
  }
});

const posSlice = createSlice({
  name: "pos",
  initialState,
  reducers: {
    setPosField: (state, action) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
    addToCart: (state, action) => {
      const item = action.payload;
      const existing = state.cartItems.find((row) => row.item_id === item.id);
      if (existing) {
        existing.quantity = String(Number(existing.quantity) + 1);
      } else {
        state.cartItems.push({
          item_id: item.id,
          item_name: item.item_name,
          available_stock: item.stock_quantity,
          quantity: "1.00",
          unit_price: item.sale_price,
        });
      }
    },
    updateCartItem: (state, action) => {
      const { itemId, field, value } = action.payload;
      const row = state.cartItems.find((item) => item.item_id === itemId);
      if (row) row[field] = value;
    },
    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter((item) => item.item_id !== action.payload);
    },
    clearCart: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitSale.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitSale.fulfilled, () => {
        return { ...initialState };
      })
      .addCase(submitSale.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { setPosField, addToCart, updateCartItem, removeFromCart, clearCart } = posSlice.actions;
export default posSlice.reducer;