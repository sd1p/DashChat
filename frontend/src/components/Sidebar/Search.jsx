import { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { fetchChat, fetchChatDetails } from "../../features/chat/chatSlice";

const Search = () => {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState([]);

  const createChat = async (id) => {
    try {
      const response = await axios.post(`/api/chat`, { userId: id });
      return response;
    } catch (error) {
      console.log(error);
    }
  };

  const handleOpenChat = async (e, user) => {
    e.preventDefault();
    const resp = await createChat(user._id);
    dispatch(fetchChat(resp.data._id));
    dispatch(fetchChatDetails(resp.data._id));
    setSearchQuery("");
  };
  useEffect(() => {
    const fetchUsers = async () => {
      if (searchQuery !== "") {
        try {
          const response = await axios.get(
            `/api/user/find?search=${searchQuery}`
          );
          // console.log(response);
          setSearch(response.data);
        } catch (error) {
          console.log(error);
        }
      } else {
        setSearch([]);
      }
    };
    fetchUsers();
  }, [searchQuery]);

  return (
    <>
      <div className="search">
        <div className="searchForm">
          <input
            type="text"
            placeholder="Find a user"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {search &&
          search.map((user) => {
            return (
              <div
                className="userChat"
                key={user._id}
                onClick={(e) => handleOpenChat(e, user)}
              >
                <img src={user.photo} alt="" />
                <div className="userChatInfo">
                  <span>{user.name}</span>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
};

export default Search;
