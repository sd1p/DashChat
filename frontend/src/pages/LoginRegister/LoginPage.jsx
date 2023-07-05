import { useState } from "react";
import "./LoginRegister.scss";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "./../../features/user/userSlice";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LoginPage = () => {
  const { user, auth } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleShow = () => {
    setShow(!show);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    try {
      const { data } = await axios.post(
        "/api/user/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      dispatch(fetchUser());
      // localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/");
    } catch (error) {
      console.log(error.response.data.message);
      toast.error(error.response.data.message, {
        position: "bottom-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  };

  useEffect(() => {
    if (auth) {
      navigate("/");
    }
  }, [user, auth, navigate]);

  return (
    !user && (
      <div className="formContainer">
        <div className="formWrapper">
          <span className="logo">DashChat</span>
          <span className="smTitle">Login</span>
          <form onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" />

            <div className="password">
              <input type={show ? "text" : "password"} placeholder="Password" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleShow();
                }}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>

            <input type="file" id="avatar" />

            <button type="submit">Sign In</button>
          </form>
          <p>
            You don&apos;t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
        <ToastContainer />
      </div>
    )
  );
};

export default LoginPage;
