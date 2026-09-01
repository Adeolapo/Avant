import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import AppSidebar from "./components/sidebar/AppSidebar"

import Login from "./pages/login/Login"
import { Outlet } from "react-router-dom"
import { useContext } from "react"
import { MyContext } from "./MyContext"

export default function App() {
  const context = useContext(MyContext)
  const user = context?.user
  return (
    <SidebarProvider>
      {!user? <Login /> : 
        <>
          <AppSidebar />
          <main className="flex-1 overflow-x-hidden  ">
            <SidebarTrigger className="m-2 fixed top-2 " />
            <Outlet/>
          </main>
        </>

      }
      
    </SidebarProvider>
  )
}

