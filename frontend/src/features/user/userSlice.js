import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  loading: false,
  user: {},
  error: null,
  auth: false,
};

//creating action
const fetchUser = createAsyncThunk("user/fetchUser", async () => {
  return axios.get("/api/user/auth").then((response) => response.data.user);
});

const userSlice = createSlice({
  name: "user",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(fetchUser.pending, (state) => {
      state.loading = true;
      state.auth = false;
    });
    builder.addCase(fetchUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.auth = true;
    });
    builder.addCase(fetchUser.rejected, (state, action) => {
      state.loading = false;
      state.user = null;
      state.auth = false;
      state.error = action.error.message;
    });
  },
});

export default userSlice.reducer;
export { fetchUser };
