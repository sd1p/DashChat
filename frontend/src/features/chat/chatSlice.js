import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  loading: false,
  chatDetails: {},
  status: "offline",
  messages: [],
  error: null,
};

//creating actions
const fetchChat = createAsyncThunk("currentChat/fetchChat", async (chatId) => {
  const messages = await axios
    .get(`/api/message/${chatId}`)
    .then((response) => response.data.messages);
  return { messages };
});

const fetchChatDetails = createAsyncThunk(
  "currentChat/fetchChatDetails",
  async (chatId) => {
    const chatDetails = await axios
      .get(`/api/chat/${chatId}`)
      .then((response) => response.data);

    return { chatDetails };
  }
);

//alternate mutate messages array
// const updateMessages = createAsyncThunk(
//   "currentChat/updateMessages",
//   async (chatId) => {
//     return axios
//       .get(`/api/message/${chatId}`)
//       .then((response) => response.data.messages);
//   }
// );

const chatSlice = createSlice({
  name: "currentChat",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(fetchChat.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchChat.fulfilled, (state, action) => {
      state.loading = false;
      state.messages = action.payload.messages;
    });
    builder.addCase(fetchChat.rejected, (state, action) => {
      state.loading = false;
      state.messages = null;
      state.error = action.error.message;
    });
    builder.addCase(fetchChatDetails.fulfilled, (state, action) => {
      state.loading = false;
      state.chatDetails = action.payload.chatDetails;
    });
    builder.addCase(fetchChatDetails.rejected, (state, action) => {
      state.loading = false;
      state.chatDetails = null;
      state.error = action.error.message;
    });
  },
});

export default chatSlice.reducer;
export { fetchChat, fetchChatDetails };
