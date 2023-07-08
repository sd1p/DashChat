/* eslint react/prop-types: 0 */

import { useSelector } from "react-redux";
import timeConversion from "../../utils/timeConversion";
import { useState } from "react";
import { useEffect } from "react";

//#TODO: Individual rerenders
const ChatInfo = ({ chat, handleChatClick }) => {
  const { chatDetails } = useSelector((state) => state.currentChat);
  const { user } = useSelector((state) => state.user);
  const [notification, setNotifiation] = useState(chat.notification);
  useEffect(() => {}, [chat.notification]);
  let time = timeConversion(chat.latestMessage?.createdAt);
  return (
    <div
      className={`userChat ${chat._id === chatDetails?._id ? "selected" : ""}`}
      key={chat._id}
      onClick={(e) => {
        handleChatClick(e, chat);
        setNotifiation(0);
      }}
    >
      <img
        src={
          !chat.isGroupChat
            ? chat.users[0]._id === user?._id
              ? chat.users[1].photo
              : chat.users[0].photo
            : chat.users[0].photo
        }
        alt=""
      />
      <div className="userChatInfo">
        <span>
          {!chat.isGroupChat
            ? chat.users[0]._id === user?._id
              ? chat.users[1].name
              : chat.users[0].name
            : chat.chatName}
        </span>
        <p className="chatPreview">
          {chat.isGroupChat && chat.latestMessage !== null
            ? chat.latestMessage?.sender.name +
              ": " +
              chat.latestMessage?.content
            : chat.latestMessage?.content}
        </p>
      </div>
      <div className="status">
        <span className="time">{time ? time : ""}</span>

        <span
          className={`notification ${
            notification > 0 && chatDetails?._id !== chat._id
              ? "unhide"
              : "hide"
          }`}
        >
          {chat.notification > 0 ? chat.notification : ""}
        </span>
      </div>
    </div>
  );
};

export default ChatInfo;
