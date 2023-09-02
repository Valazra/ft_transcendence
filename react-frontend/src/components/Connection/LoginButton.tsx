import React from "react";

const LoginButton: React.FC = () => {
  const handleLoginClick = () => {
    window.location.href = `http://localhost:5000/auth/42`;
  };
  return (
    <button className="buttonLogin" onClick={handleLoginClick}>Se connecter avec l'intranet 42</button>
  );
};

export default LoginButton;
