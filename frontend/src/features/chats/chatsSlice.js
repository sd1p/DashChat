import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  loading: false,
  chats: [],
  error: null,
};

//creating action
const fetchChats = createAsyncThunk("chats/fetchChats", async () => {
  return axios.get("/api/chat").then((response) => response.data);
});

const chatsSlice = createSlice({
  name: "user",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(fetchChats.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchChats.fulfilled, (state, action) => {
      state.loading = false;
      state.chats = action.payload;
    });
    builder.addCase(fetchChats.rejected, (state, action) => {
      state.loading = false;
      state.chats = [];
      state.error = action.error.message;
    });
  },
});

export default chatsSlice.reducer;
export { fetchChats };
