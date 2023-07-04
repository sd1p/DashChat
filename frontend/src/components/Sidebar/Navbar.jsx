import axios from "axios";
import { useNavigate } from "react-router-dom";
import { fetchUser } from "./../../features/user/userSlice";
import { useDispatch, useSelector } from "react-redux";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.get("api/user/logout");
      dispatch(fetchUser());
      navigate("/login");
      console.log(data.message);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <div className="navbar">
        <span className="logo">DashChat</span>
        <div className="user">
          <img src={user?.photo} alt="" />
          <span>{user?.name}</span>
          <button onClick={handleLogout}>logout</button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
