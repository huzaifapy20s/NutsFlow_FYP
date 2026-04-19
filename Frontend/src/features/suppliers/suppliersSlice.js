import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const initialDraft = {
  supplier_name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  opening_balance: "0.00",
};

export const fetchSuppliers = createAsyncThunk("suppliers/fetchSuppliers", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosClient.get("/api/suppliers");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch suppliers.");
  }
});

export const createSupplier = createAsyncThunk("suppliers/createSupplier", async (_, { getState, rejectWithValue }) => {
  try {
    const payload = getState().suppliers.draft;
    await axiosClient.post("/api/suppliers", payload);
    return true;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to create supplier.");
  }
});

export const updateSupplier = createAsyncThunk("suppliers/updateSupplier", async (_, { getState, rejectWithValue }) => {
  try {
    const { editingId, draft } = getState().suppliers;
    await axiosClient.put(`/api/suppliers/${editingId}`, draft);
    return true;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to update supplier.");
  }
});

export const deleteSupplier = createAsyncThunk("suppliers/deleteSupplier", async (supplierId, { rejectWithValue }) => {
  try {
    await axiosClient.delete(`/api/suppliers/${supplierId}`);
    return supplierId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to delete supplier.");
  }
});

export const restoreSupplier = createAsyncThunk("suppliers/restoreSupplier", async (supplierId, { rejectWithValue }) => {
  try {
    await axiosClient.put(`/api/suppliers/${supplierId}`, { is_active: true });
    return supplierId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to restore supplier.");
  }
});

const suppliersSlice = createSlice({
  name: "suppliers",
  initialState: {
    list: [],
    loading: false,
    submitting: false,
    error: null,
    editingId: null,
    draft: initialDraft,
  },
  reducers: {
    setSupplierDraftField: (state, action) => {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    editSupplier: (state, action) => {
      const supplier = action.payload;
      state.editingId = supplier.id;
      state.draft = {
        supplier_name: supplier.supplier_name,
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        opening_balance: supplier.opening_balance,
      };
    },
    resetSupplierDraft: (state) => {
      state.editingId = null;
      state.draft = initialDraft;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSupplier.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createSupplier.fulfilled, (state) => {
        state.submitting = false;
        state.draft = initialDraft;
        state.editingId = null;
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(updateSupplier.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateSupplier.fulfilled, (state) => {
        state.submitting = false;
        state.editingId = null;
        state.draft = initialDraft;
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(deleteSupplier.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.submitting = false;
        state.list = state.list.filter((supplier) => supplier.id !== action.payload);
        if (state.editingId === action.payload) {
          state.editingId = null;
          state.draft = initialDraft;
        }
      })
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(restoreSupplier.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(restoreSupplier.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(restoreSupplier.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { setSupplierDraftField, editSupplier, resetSupplierDraft } = suppliersSlice.actions;
export default suppliersSlice.reducer;