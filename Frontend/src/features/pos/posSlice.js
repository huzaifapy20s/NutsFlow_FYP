import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const initialState = {
  invoice_number: "",
  customer_id: "",
  receipt_account_id: "",
  paid_amount: "0.00",
  payment_method: "cash",
  notes: "",
  /** 0–100, applied to line subtotal */
  discount_percent: "0",
  cartItems: [],
  submitting: false,
  error: null,
};

function roundMoney(value) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/** Per-line cent rounding; matches API line totals. */
export function subtotalFromCart(cartItems) {
  let cents = 0;
  for (const row of cartItems) {
    const q = Number(row.quantity || 0);
    const p = Number(row.unit_price || 0);
    cents += Math.round(q * p * 100);
  }
  return cents / 100;
}

export const submitSale = createAsyncThunk("pos/submitSale", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState().pos;
    const customerId = String(state.customer_id || "").trim();
    const receiptAccountId = String(state.receipt_account_id || "").trim();
    const subtotal = subtotalFromCart(state.cartItems);
    let pct = Number(String(state.discount_percent ?? "0").replace(/,/g, "."));
    if (!Number.isFinite(pct) || pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    const discount_amount = roundMoney((subtotal * pct) / 100);
    const totalAfterDiscount = roundMoney(subtotal - discount_amount);
    if (totalAfterDiscount < 0) {
      return rejectWithValue("Invalid discount: total would be negative.");
    }

    let paidNum = Number(String(state.paid_amount ?? "0").replace(/,/g, "."));
    if (!Number.isFinite(paidNum) || paidNum < 0) paidNum = 0;
    if (!customerId && paidNum < totalAfterDiscount) {
      paidNum = totalAfterDiscount;
    }
    if (paidNum > totalAfterDiscount) {
      paidNum = totalAfterDiscount;
    }
    if (roundMoney(paidNum) > 0 && !receiptAccountId) {
      return rejectWithValue("Select a receipt account when payment is greater than zero.");
    }
    const paidStr = roundMoney(paidNum).toFixed(2);

    const payload = {
      invoice_number: state.invoice_number,
      customer_id: customerId || null,
      receipt_account_id: receiptAccountId || null,
      paid_amount: paidStr,
      payment_method: state.payment_method,
      notes: state.notes,
      discount_amount: String(discount_amount.toFixed(2)),
      tax_amount: "0.00",
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
    clearCart: () => {
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
