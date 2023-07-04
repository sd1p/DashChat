/* eslint react/prop-types: 0 */

import VidCall from "../../img/cam.png";
import AddFriend from "../../img/add.png";
import Options from "../../img/more.png";
import Messages from "./Messages";
import Input from "./Input";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
// import { io } from "socket.io-client";

// const ENDPOINT = "http://localhost:5000";
// let socket;

const Chat = ({ socket }) => {
  const { user } = useSelector((state) => state.user);
  const { chatDetails } = useSelector((state) => state.currentChat);
  const [isTyping, setIsTyping] = useState(false);

  let chatName = !chatDetails
    ? ""
    : chatDetails.isGroupChat === false
    ? chatDetails.users[0]._id === user._id
      ? chatDetails.users[1].name
      : chatDetails.users[0].name
    : chatDetails.chatName;

  useEffect(() => {
    if (chatDetails._id && socket.connected === true) {
      socket.emit("joinChat", chatDetails._id);
    }
  }, [chatDetails, socket]);

  return (
    <>
      <div className="chat">
        <div className="chatInfo">
          <span>{chatName}</span>
          <span className="typing">{isTyping && "typing..."}</span>
          <div className="chatIcons">
            <img src={VidCall} alt="" />
            <img src={AddFriend} alt="" />
            <img src={Options} alt="" />
          </div>
        </div>
        <Messages />
        <Input
          key={chatDetails._id}
          socket={socket}
          typing={isTyping}
          setIsTyping={setIsTyping}
        />
      </div>
    </>
  );
};

export default Chat;
