import Sidebar from "../../components/Sidebar/Sidebar";
import Chat from "../../components/Chat/Chat";
import "./HomePage.scss";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { io } from "socket.io-client";
import { fetchChat } from "../../features/chat/chatSlice";
import { fetchChats } from "../../features/chats/chatsSlice";
const ENDPOINT = "http://localhost:5000";
let socket;

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { chatDetails, messages } = useSelector((state) => state.currentChat);
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

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
    // console.log("hi");
    socket.on("notify", (newMessageRecieved) => {
      console.log(chatDetails);
      if (newMessageRecieved.chat._id !== chatDetails._id) {
        dispatch(fetchChats());
        // console.log("noti");
      } else if (newMessageRecieved.chat._id === messages[0].chat._id) {
        console.log("home");
        dispatch(fetchChat(newMessageRecieved.chat._id));
        // console.log("chat");
      }
    });
  });

  return (
    <>
      {user && (
        <div className="home">
          <div className="container">
            <Sidebar socket={socket} />
            <Chat key={chatDetails._id} socket={socket} />
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
