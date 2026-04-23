import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

/** Monotonic per dispatch so slower HTTP responses cannot overwrite a newer list (e.g. after a bill update). */
let itemsFetchSeq = 0;

const initialDraft = {
  item_name: "",
  sku: "",
  category: "",
  unit: "kg",
  average_cost: "0.00",
  sale_price: "0.00",
  stock_quantity: "0.00",
  low_stock_threshold: "0.00",
};

export const fetchItems = createAsyncThunk("items/fetchItems", async (_, { rejectWithValue, signal }) => {
  const requestId = ++itemsFetchSeq;
  try {
    const response = await axiosClient.get("/api/items", { signal });
    const raw = response.data?.data;
    const data = Array.isArray(raw) ? raw : [];
    return { data, requestId };
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      return rejectWithValue({ requestId, aborted: true, message: "" });
    }
    return rejectWithValue({
      requestId,
      message: error.response?.data?.message || "Failed to fetch items.",
    });
  }
});

export const createItem = createAsyncThunk("items/createItem", async (_, { getState, rejectWithValue }) => {
  try {
    const payload = getState().items.draft;
    await axiosClient.post("/api/items", payload);
    return true;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to create item.");
  }
});

export const updateItem = createAsyncThunk("items/updateItem", async (_, { getState, rejectWithValue }) => {
  try {
    const { editingId, draft } = getState().items;
    await axiosClient.put(`/api/items/${editingId}`, draft);
    return true;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to update item.");
  }
});

export const deleteItem = createAsyncThunk("items/deleteItem", async (itemId, { rejectWithValue }) => {
  try {
    await axiosClient.delete(`/api/items/${itemId}`);
    return itemId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to delete item.");
  }
});

export const restoreItem = createAsyncThunk("items/restoreItem", async (itemId, { rejectWithValue }) => {
  try {
    await axiosClient.put(`/api/items/${itemId}`, { is_active: true });
    return itemId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to restore item.");
  }
});

const itemsSlice = createSlice({
  name: "items",
  initialState: {
    list: [],
    /** Highest `requestId` applied to `list` from fetchItems.fulfilled (stale responses are ignored). */
    highestItemsFetchId: 0,
    loading: false,
    submitting: false,
    error: null,
    editingId: null,
    draft: initialDraft,
  },
  reducers: {
    setItemDraftField: (state, action) => {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    editItem: (state, action) => {
      const item = action.payload;
      state.editingId = item.id;
      state.draft = {
        item_name: item.item_name,
        sku: item.sku,
        category: item.category || "",
        unit: item.unit,
        average_cost: item.average_cost,
        sale_price: item.sale_price,
        stock_quantity: item.stock_quantity,
        low_stock_threshold: item.low_stock_threshold,
      };
    },
    resetItemDraft: (state) => {
      state.editingId = null;
      state.draft = initialDraft;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        const { data, requestId } = action.payload;
        if (requestId < state.highestItemsFetchId) {
          return;
        }
        state.highestItemsFetchId = requestId;
        state.loading = false;
        state.error = null;
        state.list = data;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        if (action.meta?.aborted) {
          return;
        }
        const payload = action.payload;
        if (payload && typeof payload === "object" && payload.aborted) {
          return;
        }
        const reqId = payload && typeof payload === "object" ? payload.requestId : null;
        if (reqId != null && reqId < state.highestItemsFetchId) {
          return;
        }
        state.loading = false;
        state.error = typeof payload === "string" ? payload : payload?.message || "Failed to fetch items.";
      })
      .addCase(createItem.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createItem.fulfilled, (state) => {
        state.submitting = false;
        state.draft = initialDraft;
      })
      .addCase(createItem.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(updateItem.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateItem.fulfilled, (state) => {
        state.submitting = false;
        state.editingId = null;
        state.draft = initialDraft;
      })
      .addCase(updateItem.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(deleteItem.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.submitting = false;
        state.list = state.list.filter((item) => item.id !== action.payload);
        if (state.editingId === action.payload) {
          state.editingId = null;
          state.draft = initialDraft;
        }
      })
      .addCase(deleteItem.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(restoreItem.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(restoreItem.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(restoreItem.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { setItemDraftField, editItem, resetItemDraft } = itemsSlice.actions;
export default itemsSlice.reducer;