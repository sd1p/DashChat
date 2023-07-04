/* eslint react/prop-types: 0 */

import Navbar from "./Navbar";
import Search from "./Search";
import Chats from "./Chats";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChats } from "../../features/chats/chatsSlice";
import { fetchChat } from "../../features/chat/chatSlice";
const Sidebar = ({ socket }) => {
  const { chatDetails } = useSelector((state) => state.currentChat);
  const dispatch = useDispatch();
  // useEffect(() => {
  //   if (socket?.connected === true) {
  //     console.log("hi");
  //     socket.on("notify", (newMessageRecieved) => {
  //       if (newMessageRecieved.chat._id === chatDetails?._id) {
  //         dispatch(fetchChat(chatDetails._id));
  //         console.log("chat");
  //       } else {
  //         dispatch(fetchChats());
  //         console.log("noti");
  //       }
  //       dispatch(fetchChats());

  //       console.log(newMessageRecieved);
  //     });
  //   }
  // });
  return (
    <div className="sidebar">
      <Navbar />
      <Search />
      <Chats />
    </div>
  );
};

export default Sidebar;
