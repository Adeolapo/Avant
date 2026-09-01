import { createContext} from "react";


 type UserType ={
    name: string;
    email: string | null
    uid: string | null
    photoURL: string | null
  }
type contextType = {
    user: UserType;
    setUser: React.Dispatch<React.SetStateAction<UserType>>;
    prompt : string;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    image: string;
    setImage: React.Dispatch<React.SetStateAction<string[]>>;
    messages: Array<{ role: string; text: string }>;
    setMessages: React.Dispatch<React.SetStateAction<Array<{ role: string; text: string }>>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}


export const MyContext = createContext<contextType | undefined>(undefined)