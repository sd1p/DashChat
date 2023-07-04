import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./user/userSlice";
import chatReducer from "./chat/chatSlice";
import chatsReducer from "./chats/chatsSlice";
const store = configureStore({
  reducer: {
    user: userReducer,
    currentChat: chatReducer,
    chats: chatsReducer,
  },
});

export default store;
