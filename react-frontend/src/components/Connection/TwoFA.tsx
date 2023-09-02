import React, { useEffect, useState } from "react";
import "../../assets/connect.css";
import axios from "axios";
import api from "../../Api/api";

const TwoFA: React.FC = () => {

    const [inputCode, setInputCode] = useState('');
    const [errorCode, setErrorCode] = useState("");
    const [auth, setAuthorized] = useState(false);



    const isAuthorized = () => {
        api
            .get("/users/2faAuthorized")
            .then(() => {
                setAuthorized(true);
            }
            )
            .catch(() => {
                setAuthorized(false);
            });
    };

    useEffect(() => {
        isAuthorized();
    }, []);


    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        axios.get(`http://localhost:5000/users/verifyTwoFA?inputCode=${inputCode}`, { withCredentials: true })
            .then((response) => {
                if (response.data === true) {
                    window.location.href = `http://localhost`;
                }
                else {
                    setErrorCode("Bad code. Please try again.");
                    setInputCode('');
                }

            })
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputCode(event.target.value);
    };

    return (
        <div>
            {!auth && <p>Not authorized</p>}
            {auth && (
                <>
                    <h1 className="headerLoginh1">2FA AUTH</h1>
                    <div className="contentUnderNavbar">
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label className="labelPseudo" htmlFor="pseudo">Code 2FA : </label>
                                <input className="inputPseudo" type="text" name="code" id="code" onChange={handleChange} />
                            </div>
                            <button className="buttonPseudo" type="submit">Verify Code</button>
                            <p>
                                {errorCode}
                            </p>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};


export default TwoFA;

