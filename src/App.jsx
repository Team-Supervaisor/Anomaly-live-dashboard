import { Route, Routes, Navigate } from 'react-router-dom'

import Stores from './components/Home'

import LoginModal from './components/LoginModal'
import { useAppContext } from './context'
import CameraRender from './components/CameraRender'
function App() {
  const { isAuthenticated } = useAppContext();

  return (
    <Routes>
      <Route path="/" element={
     <CameraRender /> 
      } />
      {/* <Route path="/app" element={
       
      } /> */}
  
   
    </Routes>
  )
}

export default App
