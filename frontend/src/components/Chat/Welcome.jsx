import React from "react";
import Typewriter from "typewriter-effect";
const Welcome = () => {
  return (
    <div className="chat welcome">
      <div className="typewriter-container">
        <div>
          <strong>
            Welcome to <span style={{ color: " #8DA4F1" }}>DashChat</span>.
          </strong>
        </div>
        <div className="typewriter">
          <Typewriter
            options={{ loop: true }}
            onInit={(typewriter) => {
              typewriter
                .typeString(
                  "<span>Select a chat to start a conversation.</span>"
                )
                .pauseFor(3000)
                .deleteAll()
                .start();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Welcome;
