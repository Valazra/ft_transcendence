import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../Api/api";

export default function MessageInput({ send }: { send: (pseudo: string, val: string) => void }) {
  const [value, setValue] = useState("");
  const [pseudo, setPseudo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // Création de la référence


  const fetchUserPseudo = useCallback(() => {
    api
      .get("/users/user")
      .then((response) => {
        setPseudo(response.data.user.pseudo);
      })
      .catch(() => {
        console.log("Messages fetchUserPseudo");
      });
  }, [setPseudo]);

  useEffect(() => {
    fetchUserPseudo();
  }, [pseudo, fetchUserPseudo]);

  const sendMessage = () => {
    send(pseudo, value);
    setValue("");
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === "Enter") {
      sendMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sendMessage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
        window.removeEventListener('keydown', handleKeyPress);
    };
}, [handleKeyPress]);

  useEffect(() => {
    inputRef.current?.focus(); // Appel de la méthode focus() sur la référence
  }, []);

  return (
    <div>
      <input
        className="chat_inputMessages"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your message..."
        value={value}
        ref={inputRef}
      />
      <button className="chat_buttonSend" onClick={sendMessage}>
        Send
      </button>
    </div>
  );
}