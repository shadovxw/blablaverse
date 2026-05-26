
import { useChatStore } from "../store/useChatStore";

export default function ActiveTabSwitch() {

    const {activetabs,setActiveTab} = useChatStore();

    return (
        <div className="tabs tabs-boxed bg-transparent p-2 m-2">

            <button 
                onClick={()=> setActiveTab('chats')}
                className={`tab ${activetabs === 'chats' ? 'tab-active' : ''}`}
            >
                Chats
            </button>
            
            <button
                onClick={()=> setActiveTab('contacts')}
                className={`tab ${activetabs === 'contacts' ? 'tab-active' : ''}`}
            >
                Contacts
            </button>
            
        </div>
    );
}