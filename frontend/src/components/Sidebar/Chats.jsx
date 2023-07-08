/* eslint react/prop-types: 0 */

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChat, fetchChatDetails } from "../../features/chat/chatSlice";
import { fetchChats, resetNotification } from "../../features/chats/chatsSlice";
import ChatInfo from "./ChatInfo";
import axios from "axios";

const Chats = () => {
  const { chats } = useSelector((state) => state.chats);
  const { chatDetails } = useSelector((state) => state.currentChat);
  const dispatch = useDispatch();

  const handleChatClick = async (e, chat) => {
    if (chatDetails._id) {
      await axios.get(`api/message/mark-seen/${chatDetails._id}`);
      dispatch(resetNotification(chatDetails?._id));
    }
    dispatch(resetNotification(chat._id));
    dispatch(fetchChatDetails(chat._id));
    dispatch(fetchChat(chat._id));
  };

  useEffect(() => {
    dispatch(fetchChats());
  }, [dispatch]);

  return (
    <>
      <div className="chats">
        {chats &&
          chats.map((chat) => {
            return (
              <ChatInfo
                key={chat._id + chat.notification}
                chat={chat}
                handleChatClick={handleChatClick}
              />
            );
          })}
      </div>
    </>
  );
};

export default Chats;
