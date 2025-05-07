import { Route, Routes, Navigate } from 'react-router-dom'
import LiveAi from './components/LIveAi'
import Stores from './components/Home'

import LoginModal from './components/LoginModal'
import { useAppContext } from './context'
import CameraRender from './components/CameraRender'
import LiveVideo from './components/LiveVideo'
function App() {
  const { isAuthenticated } = useAppContext();

  return (
    <Routes>
      <Route path="/" element={
     <CameraRender /> 
      } />
      {/* <Route path="/app" element={
       
      } /> */}
      <Route path="/live-video" element={
       <LiveVideo />
      } />
        <Route path="/live-ai" element={
       <LiveAi />
      } />
  
   
    </Routes>
  )
}

export default App
