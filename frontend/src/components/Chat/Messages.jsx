/* eslint react/prop-types: 0 */
import { useEffect, useRef } from "react";
import Message from "./Message";
import { useSelector } from "react-redux";

//#TODO: Dispatch messages/message when required
const Messages = () => {
  const messagesEndRef = useRef(null);
  const { messages } = useSelector((state) => state.currentChat);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="messages style-4">
      {messages
        ? messages.map((message) => (
            <Message key={message._id} message={message} />
          ))
        : ""}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Messages;
