/* eslint react/prop-types: 0 */

import VidCall from "../../img/cam.png";
import AddFriend from "../../img/add.png";
import Options from "../../img/more.png";
import Messages from "./Messages";
import Input from "./Input";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

//#TODO: Global state for typing indicator
const Chat = ({ socket }) => {
  const { user } = useSelector((state) => state.user);
  const { isGroupChat, users, chatName, _id } = useSelector(
    (state) => state.currentChat.chatDetails
  );
  const [isTyping, setIsTyping] = useState(false);

  let chatname =
    chatName === null || undefined
      ? ""
      : !isGroupChat
      ? users[0]._id === user._id
        ? users[1].name
        : users[0].name
      : chatName;

  useEffect(() => {
    if (_id !== undefined || (null && socket.connected === true)) {
      socket.emit("joinChat", _id);
    }
  }, [_id, socket]);

  return (
    <>
      <div className="chat">
        <div className="chatInfo">
          <span>{chatname}</span>
          <span className="typing">{isTyping && "typing..."}</span>
          <div className="chatIcons">
            <img src={VidCall} alt="" />
            <img src={AddFriend} alt="" />
            <img src={Options} alt="" />
          </div>
        </div>
        <Messages />
        <Input
          key={_id}
          socket={socket}
          typing={isTyping}
          setIsTyping={setIsTyping}
        />
      </div>
    </>
  );
};

export default Chat;
