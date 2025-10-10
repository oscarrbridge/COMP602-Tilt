import { useNavigate } from "react-router-dom";
import { useState } from "react"
import "./Settings.css"
import NavBar from "@components/NavBar/NavBar";

export default function Settings(){
    const navagate = useNavigate();
    var [settingsPage, setSettingsPage] = useState("");

    const renderContent = () => {
        switch (settingsPage){
            case "account":
                return <Account />;
            case "general":
                return <General />;
            default:
                return <p>...</p>
        }
    }

    return(
        <>
            <NavBar />
            <div className="pageContainer">
                <div className="innerComponents">
                    <div className="leftMenu">
                        <h2>Category</h2>
                        <div className="settingItems">
                            <p onClick={() => setSettingsPage("account")}>Account</p>
                            <p onClick={() => setSettingsPage("general")}>General</p>
                        </div>
                    </div>
                    <div className="rightMenu">
                        <>
                            {renderContent()}
                        </>
                    </div>
                </div>
            </div>
        </>
    );

}

function General() {
    return(
        <>
            <div><p>General</p></div>
        </>
    );
}

function Account() {
    return(
        <>
            <div><p>Account</p></div>
        </>
    );
}