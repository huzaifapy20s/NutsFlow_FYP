import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

const storedSession = JSON.parse(localStorage.getItem("dfms_auth") || "null");

const persistSession = (state) => {
  localStorage.setItem(
    "dfms_auth",
    JSON.stringify({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      user: state.user,
    })
  );
};

export const loginUser = createAsyncThunk("auth/loginUser", async (_, { getState, rejectWithValue }) => {
  try {
    const { email, password } = getState().auth.loginForm;
    const response = await axiosClient.post("/api/auth/login", { email, password });
    return response.data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Login failed.");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedSession?.user || null,
    accessToken: storedSession?.accessToken || null,
    refreshToken: storedSession?.refreshToken || null,
    loading: false,
    error: null,
    loginForm: {
      email: "",
      password: "",
    },
  },
  reducers: {
    setLoginField: (state, action) => {
      const { field, value } = action.payload;
      state.loginForm[field] = value;
    },
    logoutUser: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem("dfms_auth");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.access_token;
        state.refreshToken = action.payload.tokens.refresh_token;
        persistSession(state);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setLoginField, logoutUser } = authSlice.actions;
export default authSlice.reducer;