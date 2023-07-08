/* eslint react/prop-types: 0 */

import { useSelector } from "react-redux";
import timeConversion from "../../utils/timeConversion";
const Message = ({ message }) => {
  const { user } = useSelector((state) => state.user);
  let time = timeConversion(message.createdAt);

  return (
    message && (
      <>
        <div
          className={`message ${
            message.sender._id === user._id ? "owner" : ""
          }`}
        >
          <div className="messageInfo">
            <img src={message.sender.photo} alt="" />
          </div>

          <div className="messageContent">
            <div className="message">
              <p>{message.content}</p> <span>{time}</span>
            </div>

            {/* image in chat handler*/}
          </div>
        </div>
      </>
    )
  );
};

export default Message;
