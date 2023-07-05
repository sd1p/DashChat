import "./LoginRegister.scss";
import AddAvatar from "../../img/addAvatar.png";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { fetchUser } from "./../../features/user/userSlice";
import { useDispatch, useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const RegisterPage = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(false);
  const navigate = useNavigate();

  const handleShow = () => {
    setShow(!show);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = e.target[0].value;
    const email = e.target[1].value;
    const password = e.target[2].value;

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const { data } = await axios.post(
        "/api/user/register",
        { name, email, password, photo },
        config
      );
      dispatch(fetchUser());
      // localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/");
    } catch (error) {
      console.log(error);
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

  const handleAvatar = async (pic) => {
    setLoading(true);
    if (pic === undefined) {
      console.log("Upload proper image");
      return;
    }
    // console.log(pic);
    if (pic.type === "image/jpeg" || pic.type === "image/png") {
      const data = new FormData();
      data.append("file", pic);
      data.append("upload_preset", "dashch");
      data.append("cloud_name", "dehopmlh6");
      fetch("https://api.cloudinary.com/v1_1/dehopmlh6/image/upload", {
        method: "post",
        body: data,
      })
        .then((res) => res.json())
        .then((data) => {
          setPhoto(data.url.toString());
          // console.log(data.url.toString());
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    } else {
      console.log("Upload proper image");
      setLoading(false);
      return;
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    !user && (
      <div className="formContainer">
        <div className="formWrapper">
          <span className="logo">DashChat</span>
          <span className="smTitle">Register</span>
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Display Name" />
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
            <input
              type="file"
              id="avatar"
              onChange={(e) => handleAvatar(e.target.files[0])}
            />
            <label htmlFor="avatar">
              <img src={AddAvatar} alt="addAvatar" />
              <span>Add an A vatar</span>
            </label>
            <button type="submit">Sign Up</button>
          </form>
          <p>
            You do have an account? <Link to="/login">Login</Link>
          </p>
        </div>
        <ToastContainer />
      </div>
    )
  );
};

export default RegisterPage;
