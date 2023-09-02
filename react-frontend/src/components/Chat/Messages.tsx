import { useContext } from "react";
import PrevMessagesContext from "../../context/PrevMessagesContext";

export default function Messages({ messages }: { messages: string[] }) {

    const {prevMessages} = useContext(PrevMessagesContext);

    return (
        <div>
            {prevMessages.map((prevMessage, index) => (
                <div className="chat_div" key={index}>{prevMessage}</div>
            ))}
            {messages.map((message, index2) => (
                <div className="chat_div" key={index2}>{message}</div>
            ))}
        </div>
    )
}