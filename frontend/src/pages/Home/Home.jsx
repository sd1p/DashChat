import Sidebar from "../../components/Sidebar/Sidebar";
import Chat from "../../components/Chat/Chat";
import "./HomePage.scss";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { io } from "socket.io-client";
import { appendMessage } from "../../features/chat/chatSlice";
import { fetchChats, resetNotification } from "../../features/chats/chatsSlice";
import Welcome from "../../components/Chat/Welcome";

//dev
// const ENDPOINT = "http://localhost:5000";
//production
const ENDPOINT = "https://dashchat.onrender.com";

let socket;

const Home = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { chatDetails } = useSelector((state) => state.currentChat);
  useEffect(() => {
    socket = io(ENDPOINT);
    if (user._id !== undefined || null) {
      socket.emit("setup", user._id);
      socket.on("connected", () => {
        console.log("connected");
      });
    }
  }, [user]);

  useEffect(() => {
    socket.on("notify", (newMessageRecieved) => {
      if (chatDetails !== null) {
        if (newMessageRecieved.chat._id !== chatDetails._id) {
          // console.log("noti in another chat");
          dispatch(fetchChats());
        } else if (newMessageRecieved.chat._id === chatDetails._id) {
          // console.log("home");
          dispatch(appendMessage(newMessageRecieved));
          dispatch(resetNotification(newMessageRecieved.chat._id));
          // console.log("chat");
        }
      } else {
        // console.log("noti");
        dispatch(fetchChats());
      }
    });
  });

  return (
    <>
      {user && (
        <div className="home">
          <div className="container">
            <Sidebar socket={socket} />

            {chatDetails ? (
              <Chat key={chatDetails._id} socket={socket} />
            ) : (
              <Welcome />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
