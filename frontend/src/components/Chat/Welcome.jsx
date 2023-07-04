import React from "react";
import Typewriter from "typewriter-effect";
const Welcome = () => {
  return (
    <div className="chat welcome">
      <div className="typewriter">
        <Typewriter
          options={{ loop: true }}
          onInit={(typewriter) => {
            typewriter
              .typeString(
                '<strong ">Welcome to <span style="color: #8DA4F1;">DashChat</span>.</strong>'
              )
              .pauseFor(2500)
              .deleteAll()
              .start();
          }}
        />
      </div>
    </div>
  );
};

export default Welcome;
