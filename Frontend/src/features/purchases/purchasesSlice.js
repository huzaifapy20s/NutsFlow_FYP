import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const initialDraft = {
  supplier_id: "",
  payment_account_id: "",
  invoice_number: "",
  discount_amount: "0.00",
  paid_amount: "0.00",
  payment_method: "cash",
  notes: "",
  purchase_items: [{ item_id: "", quantity: "0.00", unit_cost: "0.00" }],
};

export const fetchPurchases = createAsyncThunk("purchases/fetchPurchases", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/purchases");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch purchases.");
  }
});

export const submitPurchase = createAsyncThunk("purchases/submitPurchase", async (_, { getState, rejectWithValue }) => {
  try {
    const payload = getState().purchases.draft;
    const response = await axiosClient.post("/api/purchases", payload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to submit purchase.");
  }
});

export const updatePurchase = createAsyncThunk(
  "purchases/updatePurchase",
  async ({ purchaseId, payload }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/api/purchases/${purchaseId}`, payload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update purchase.");
    }
  }
);

export const deletePurchase = createAsyncThunk("purchases/deletePurchase", async ({ purchaseId, purchaseData }, { rejectWithValue }) => {
  try {
    await axiosClient.delete(`/api/purchases/${purchaseId}`);
    return { purchaseId, purchaseData };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to delete purchase.");
  }
});

export const restorePurchase = createAsyncThunk("purchases/restorePurchase", async (purchaseData, { rejectWithValue }) => {
  try {
    // Remove id field if it exists to create a new purchase
    const { id, ...cleanData } = purchaseData;
    const response = await axiosClient.post("/api/purchases", cleanData);
    return response.data.data;
  } catch (error) {
    console.error("Restore error:", error.response?.data);
    return rejectWithValue(error.response?.data?.message || "Failed to restore purchase.");
  }
});

const purchasesSlice = createSlice({
  name: "purchases",
  initialState: {
    list: [],
    draft: initialDraft,
    loading: false,
    submitting: false,
    error: null,
    deletedPurchase: null,
  },
  reducers: {
    setPurchaseField: (state, action) => {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    setPurchaseDraft: (state, action) => {
      state.draft = action.payload;
    },
    addPurchaseLine: (state) => {
      state.draft.purchase_items.push({ item_id: "", quantity: "0.00", unit_cost: "0.00" });
    },
    updatePurchaseLine: (state, action) => {
      const { index, field, value } = action.payload;
      state.draft.purchase_items[index][field] = value;
    },
    removePurchaseLine: (state, action) => {
      if (state.draft.purchase_items.length > 1) {
        state.draft.purchase_items.splice(action.payload, 1);
      }
    },
    resetPurchaseDraft: (state) => {
      state.draft = initialDraft;
    },
    clearDeletedPurchase: (state) => {
      state.deletedPurchase = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchases.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPurchases.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(submitPurchase.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitPurchase.fulfilled, (state) => {
        state.submitting = false;
        state.draft = initialDraft;
      })
      .addCase(submitPurchase.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(updatePurchase.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updatePurchase.fulfilled, (state) => {
        state.submitting = false;
        state.draft = initialDraft;
      })
      .addCase(updatePurchase.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(deletePurchase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePurchase.fulfilled, (state, action) => {
        state.loading = false;
        state.deletedPurchase = action.payload.purchaseData;
      })
      .addCase(deletePurchase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(restorePurchase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restorePurchase.fulfilled, (state) => {
        state.loading = false;
        state.deletedPurchase = null;
      })
      .addCase(restorePurchase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setPurchaseField, setPurchaseDraft, addPurchaseLine, updatePurchaseLine, removePurchaseLine, resetPurchaseDraft, clearDeletedPurchase } =
  purchasesSlice.actions;
export default purchasesSlice.reducer;