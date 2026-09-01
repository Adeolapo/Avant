import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './pages/home/Home.tsx'
import Login from './pages/login/Login.tsx'
import { MyContext } from './MyContext.ts'
import Default from './pages/Default.tsx'


const router = createBrowserRouter([{
  path: "/",
  element: <App />,
  children: [
    {
      path: "chat/:chatId",
      element: <Home />,
    },
    {
      path: "/",
      element: <Default />,
    }
  ],

  
},
{
  path: "/login",
  element: <Login />,
}

]
);

const Root = () => {

 
  const [user, setUser] = useState();
  const [prompt, setPrompt] = useState();
  const [image, setImage] = useState();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <MyContext.Provider value={{ user, setUser,prompt,setPrompt,image,setImage,messages,setMessages,loading,setLoading } as any}>
      <RouterProvider router={router} />
    </MyContext.Provider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
