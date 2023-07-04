/* eslint react/prop-types: 0 */
import { useEffect, useRef } from "react";
import Message from "./Message";
import { useSelector } from "react-redux";

const Messages = ({ socket }) => {
  const messagesEndRef = useRef(null);
  const { messages } = useSelector((state) => state.currentChat);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // useEffect(() => {
  //   if (socket?.connected === true) {
  //     socket.on("notify", (newMessageRecieved) => {
  //       console.log(newMessageRecieved);
  //       if (chatDetails._id == newMessageRecieved.chat._id) {
  //         //dispatch(fetchChats(chatDetails._id));
  //         console.log("hi");
  //         dispatch(fetchChat(chatDetails._id));
  //       } else {
  //         console.log("bye");
  //         dispatch(fetchChats());
  //         //alternate method mutate messages with newMessage
  //       }
  //     });
  //   }
  // });

  return (
    <div className="messages style-4">
      {messages
        ? messages.map((message) => (
            <Message key={message._id} message={message} />
          ))
        : "start a conversation say'hi"}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Messages;
