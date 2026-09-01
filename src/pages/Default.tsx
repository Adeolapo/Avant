
import { MyContext } from '@/MyContext';
import React, { useContext } from 'react';

const Default: React.FC = () => {

  const {user} = useContext(MyContext)!
  return (
    <div className='h-[100vh]  overflow-hidden text-center p-4 m-auto flex justify-center   '>
    <div className='pt-[180px] '>
      <h1 className='font-bold text-[32px] md:text-[40px] '>Hi there, <span className='bg-gradient-to-b from-primaryy to-[#00D4FF] bg-clip-text text-transparent'>{user.name}</span></h1>
      <h2 className='font-bold text-[32px] md:text-[40px] '>This is a Safe Space feel free</h2>
    </div>
        

    
      
    </div>
  );
};

export default Default;