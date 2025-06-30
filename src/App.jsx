import { Route, Routes, Navigate } from 'react-router-dom'
import LiveAi from './components/live-ai/live-ai'
import CameraRender from './components/CameraRender'
import LiveVideo from './components/live-video/LiveVideo'

function App() {
  return (
    <Routes>
      <Route path="/" element={
     <CameraRender /> 
      } />
      <Route path="/live-video" element={
       <LiveVideo />
      } />
        <Route path="/live-ai/:cameraId" element={
       <LiveAi />
      } />
      <Route path="/cameras" element={<CameraRender />} />

   
    </Routes>
  )
}

export default App
