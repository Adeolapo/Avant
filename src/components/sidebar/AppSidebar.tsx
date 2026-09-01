import { MoreHorizontal } from "lucide-react"

import avantL from "@/assets/image/AvexL.png"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useContext, useEffect, useState } from "react"
import { MyContext } from "@/MyContext"
import {  collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore"
import { db } from "@/firebase"
import { Link, useNavigate } from "react-router-dom"

// Menu items.
/*const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]*/

export function AppSidebar() {
   const {user} = useContext(MyContext)!
   const [chats,setChats] = useState<any[]>([])
   const navigate = useNavigate()

   async function newChat() {
     const newChannel = prompt("Please enter the chat name");
      if (!newChannel) return;
    const userRef = doc(collection(db, "users",user.uid!, "chats"));
    
    const newChatRef = doc(db, "users", user.uid!, "chats", userRef.id);
   // Add a new document with a generated id.
     await setDoc(newChatRef, {
      createdAt: new Date(),
      title: newChannel,
      id: userRef.id
     });

     navigate(`/chat/${userRef.id}`);

    

     
   console.log("Document written with ID: ", userRef.id);
    
  }

  async function deleteTodo(id: string): Promise<void> {
      //let docRef = doc(db, "todos", id);
          /*await updateDoc(docRef, {
                  isCompleted: deleteField(),
                  text: deleteField(),
                  id: deleteField(),   
          });*/
         

            await deleteDoc(doc(db, "users", user.uid!, "chats", id));
  }
  

  /*useEffect(() => {
    async function fetchChats() {
    // Fetch chats from Firestore
    const userRef = query(collection(db, "users",user.uid!, "chats"));

  const unsub = onSnapshot(userRef, (item) => {
      setChats(item.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    
      console.log("Current data: ", item.docs.map((doc) => doc.data()));
  });

  console.log("Chats fetched:", chats);

  unsub();
    // This is a placeholder function; implement as needed
  }
    fetchChats();

    console.log("Chats updated:", chats);
  }, []);*/

  useEffect(() => {
  // 1. Guard clause: Don't run if user isn't logged in
  if (!user?.uid) return;

  console.log("Setting up real-time listener...");

  const userRef = collection(db, "users", user.uid, "chats");
  const q = query(userRef, orderBy("createdAt", "desc"));

  // 2. Start the listener
  const unsub = onSnapshot(q, (snapshot) => {
    const chatList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // 3. Update State
    setChats(chatList);
    
    // This log WILL work because it's inside the listener callback
    console.log("New data received from Firebase:", chatList);
  }, (error) => {
    console.error("Firebase Snapshot Error:", error);
  });

  // 4. THE FIX: Return unsub so React cleans it up when the component unmounts
  return () => unsub();
}, []); // Only re-run if the user changes
  return (
    <Sidebar className="bg-secondaryy  ">
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton className=" h-[50px]">
                        <div className="">
                            <img src={avantL} className="md:w-[40px] md:h-[40px] w-[40px] h-[40px]  bg-primaryy rounded-full " alt="" />
                        </div>
                        
                        <h1 className="font-semibold">Avant</h1>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
      <SidebarMenuItem></SidebarMenuItem>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((item) => (
                console.log(item),
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <Link to={`/chat/${item.id}`}>
                      
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction>
                        <MoreHorizontal />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem onClick={() => deleteTodo(item.id)}>
                        <span>Delete Project</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <Button onClick={newChat} className="w-[90%] m-auto  ">New Chat</Button>
      <SidebarFooter className="mt-4">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton className=" h-[50px]">
                        <div className="">
                            <img src={user?.photoURL ?? undefined} className="md:w-[40px] md:h-[40px] w-[40px] h-[40px]  bg-primaryy rounded-full " alt="" />
                        </div>
                        
                        <h1 className="font-semibold">{user.name}</h1>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}


export default AppSidebar