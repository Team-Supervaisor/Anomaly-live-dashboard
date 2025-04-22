import { Route, Routes, Navigate } from 'react-router-dom'

import Stores from './components/Home'

import LoginModal from './components/LoginModal'
import { useAppContext } from './context'

function App() {
  const { isAuthenticated } = useAppContext();

  return (
    <Routes>
      <Route path="/" element={
        <LoginModal /> 
      } />
      <Route path="/app" element={
        <Stores /> 
      } />
      {/* <Route path="/login" element={
        !isAuthenticated ? <LoginModal /> : <Navigate to="/" replace />
      } /> */}
   
    </Routes>
  )
}

export default App
