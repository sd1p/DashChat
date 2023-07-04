/* eslint react/prop-types: 0 */

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChat, fetchChatDetails } from "../../features/chat/chatSlice";
import { fetchChats } from "../../features/chats/chatsSlice";
import ChatInfo from "./ChatInfo";

const Chats = () => {
  // const { user } = useSelector((state) => state.user);
  // const { chatDetails } = useSelector((state) => state.currentChat);
  const { chats } = useSelector((state) => state.chats);
  const dispatch = useDispatch();
  const handleChatClick = async (e, chat) => {
    e.preventDefault();
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
                key={chat._id}
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
