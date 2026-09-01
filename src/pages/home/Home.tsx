

import Footer from '@/components/footer/Footer';
import './home.css'
import { MyContext } from '@/MyContext';
import React, { useContext, useEffect } from 'react';


const Home: React.FC = () => {
const {user,messages,loading} = useContext(MyContext)!

useEffect(() => {
    console.log('Messages updated:', messages);
  
}, []);
  return (
  <div className='h-[100vh]  overflow-hidden text-center p-4 m-auto flex justify-center   '>
    {messages.length === 0 ? (
      <div className='pt-[180px] leading-[1.2] '>
        <h1 className='font-bold text-[32px] md:text-[40px] '>Hi there, <span className='bg-gradient-to-b from-primaryy to-[#00D4FF] bg-clip-text text-transparent'>{user.name}</span></h1>
        <h2 className='font-bold text-[32px] md:text-[40px] '>How can i assist you today</h2>
      </div>
    ) : (
      <div className='w-full overflow-y-auto pb-[150px] px-2 '>
              {messages.map((msg,) => (
                <div className={`max-w-[85%] md:max-w-[70%] p-4 whitespace-pre-wrap rounded-2xl mb-[60px] shadow-sm w-fit ${
                    msg.role === 'model' 
                      ? 'bg-slate-200 text-slate-900 self-start rounded-tl-none' // AI on the Left
                      : 'bg-primaryy text-white self-end rounded-tr-none ml-auto' // User on the Right
                  }`}>
                    <p className={`text-sm md:text-[16px] text-left whitespace-pre-wrap leading-[1.8]`}>
                      {msg.text}
                    </p>
                </div>
        ))}
        {loading &&(
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
            <div className="loader"></div>
          </div>
          
          
        )}

         
      </div>
    )}

    
    <Footer />
	  
	</div>
  );
};

export default Home;


/*

<div className={`max-w-[70%] p-4 whitespace-pre-wrap rounded-2xl mb-[60px] shadow-sm ${
              msg.role === 'model' 
                ? ' bg-slate-200 text-white rounded-tr-none' 
                : ' bg-primaryy text-slate-800 rounded-tl-none'
            }`}>
              <div className={`text-sm md:text-[16px] text-left whitespace-pre-wrap leading-[1.8] ${msg.role === 'model' ? 'text-black' : 'text-white'}`}>{msg.text}</div>
              
              
            </div>
            
             <div className={`max-w-[85%] md:max-w-[70%] p-4 whitespace-pre-wrap rounded-2xl mb-6 shadow-sm ${
                    msg.role === 'model' 
                      ? 'bg-slate-200 text-slate-900 self-start rounded-tl-none' // AI on the Left
                      : 'bg-primaryy text-white self-end rounded-tr-none ml-auto' // User on the Right
                  }`}>
                    <div className={`text-sm md:text-[16px] text-left whitespace-pre-wrap leading-[1.8]`}>
                      {msg.text}
                    </div>
                </div> 
            
            
            */