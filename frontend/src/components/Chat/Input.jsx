/* eslint react/prop-types: 0 */

import { useEffect, useState } from "react";
import Attach from "../../img/attach.png";
import Image from "../../img/img.png";
import axios from "axios";
import { fetchChat } from "../../features/chat/chatSlice";
import { fetchChats } from "../../features/chats/chatsSlice";
import { useDispatch, useSelector } from "react-redux";

//#TODO: Implement global socket
const Input = ({ socket, isTyping, setIsTyping }) => {
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);

  const dispatch = useDispatch();
  const chatId = useSelector((state) => state.currentChat.chatDetails._id);
  const sendText = async (id, content) => {
    let data;
    try {
      data = await axios
        .post(`/api/message`, {
          chatId: id,
          content,
        })
        .then((response) => response.data);
      dispatch(fetchChat(id));
      dispatch(fetchChats());
    } catch (error) {
      console.log(error);
    }
    if ((socket?.connected === true && data !== undefined) || null) {
      socket.emit("newMessage", data.message);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (socket?.connected) {
      if (!typing) {
        setTyping(true);
        socket.emit("typing", chatId);
      }

      const lastTyping = new Date().getTime();
      const duration = 3000;
      setTimeout(() => {
        const timeNow = new Date().getTime();
        let timeDiff = timeNow - lastTyping;

        if (timeDiff >= duration && typing) {
          socket.emit("notTyping", chatId);
          setTyping(false);
        }
      }, duration);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const send = async () => {
      await sendText(chatId, message);
      setMessage("");
    };
    send();
  };

  useEffect(() => {
    if (socket?.connected) {
      socket.on("typing", () => setIsTyping(true));
      socket.on("notTyping", () => setIsTyping(false));
    }
  });

  useEffect(() => {
    setMessage("");
  }, [chatId]);

  return (
    <>
      <div className="inputBar">
        <div>{isTyping && "..."}</div>
        <input
          type="text"
          placeholder="Type something..."
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && handleSend(e)}
        />
        <div className="rightInput">
          <img src={Attach} alt="attach" />
          <input type="file" id="img" style={{ display: "none" }} />
          <label htmlFor="img">
            <img src={Image} alt="" />
          </label>
          <button
            type="submit"
            onClick={(e) => {
              handleSend(e);
            }}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default Input;
