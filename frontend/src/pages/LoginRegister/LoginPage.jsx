import { useState } from "react";
import "./LoginRegister.scss";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "./../../features/user/userSlice";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import githubIcon from "../../img/github-logo.png";
import googleIcon from "../../img/google-logo.png";
import { Helmet } from "react-helmet";
const LoginPage = () => {
  const { user, auth } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleShow = () => {
    setShow(!show);
  };

  const signInWithGoogle = () => {
    window.open("/api/auth/google", "_self");
  };
  // const signInWithGoogle = () => {
  //   window.open("http://localhost:5000/api/auth/google/", "_self");
  // };
  const signInWithGithub = () => {
    window.open("/api/auth/github", "_self");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    try {
      await axios.post(
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
        <Helmet>
          <title>LogIn</title>
          <meta name="description" content="A real-time chat app" />
        </Helmet>
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
          <div className="stratergy">
            <div className="google btn" onClick={signInWithGoogle}>
              <img src={googleIcon} alt="Google" />
              <p>Google</p>
            </div>
            <div className="github btn" onClick={signInWithGithub}>
              <img src={githubIcon} alt="GitHub" />
              <p>Github</p>
            </div>
          </div>
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
