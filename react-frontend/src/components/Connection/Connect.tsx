import LoginButton from "./LoginButton";
import React from "react";
import "../../assets/connect.css";

const Connect: React.FC = () => {
  return (
    <div className="allConnectPage">
      <div className="headerLogin">
        <h1> 
          JEU DE PONG 
        </h1>
      </div>
      <div className="connect">
          <LoginButton />
      </div>
    </div>
  );
};

export default Connect;
