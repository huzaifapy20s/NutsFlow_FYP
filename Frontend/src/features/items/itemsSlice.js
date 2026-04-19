import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

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

export const fetchItems = createAsyncThunk("items/fetchItems", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/items");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch items.");
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
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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