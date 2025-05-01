import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import ToolBar from "./tool-bar"

export default function CameraRender() {
    const [open, setOpen] = useState(false)
    const [cameraName, setCameraName] = useState("")
    const [rtspUrl, setRtspUrl] = useState("")
    const [cameras, setCameras] = useState([])
    const [selectedTool, setSelectedTool] = useState("pointer")
    const [selectedCamera, setSelectedCamera] = useState(null)
    const [activeTab, setActiveTab] = useState('video') // Add this new state

    const handleSubmit = () => {
        const newCamera = {
            id: Date.now(),
            name: cameraName,
            url: rtspUrl
        }
        setCameras([...cameras, newCamera])
        setOpen(false)
        setCameraName("")
        setRtspUrl("")
    }

    return (
        <div className="backdrop-blur-sm bg-black/30 relative w-full h-[calc(100vh)] flex flex-col items-center">
            <div className="relative flex flex-col items-center h-full w-full">
                {/* Main content area */}
                <div className="w-[95%] h-[88%] bg-white rounded-lg shadow-md relative mt-4">
                    {/* Tab buttons */}
                    <div className="absolute top-4 left-4 flex gap-3">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-sm border bg-[#7900F3] text-white border-[#7900F3]}`}
                        >
                            <img 
                                src="/video.svg"
                                className={`w-4 h-4 ${
                                    activeTab === 'video' ? 'brightness-0 invert' : ''
                                }`}
                                alt="video icon"
                            />
                            <span>Video</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('cam')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-sm border `}
                        >
                            <img 
                                src="/cam.svg"
                                className={`w-4 h-4 ${
                                    activeTab === 'cam' ? 'brightness-0 invert' : ''
                                }`}
                                alt="cam icon"
                            />
                            <span>Cam</span>
                        </button>
                    </div>

                    {cameras.map((camera) => (
                        <div
                            key={camera.id}
                            className={`absolute inset-0 ${
                                selectedCamera === camera.id ? 'ring-2 ring-[#5D61E2]' : ''
                            }`}
                            onClick={() => setSelectedCamera(camera.id)}
                        >
                            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                                {camera.name}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar repositioned to bottom of screen */}
                <div className="fixed bottom-3 left-1/2 transform -translate-x-1/2">
                    <ToolBar
                        selectedTool={selectedTool}
                        setSelectedTool={setSelectedTool}
                        clearCanvas={() => {
                            setCameras([])
                            setSelectedCamera(null)
                        }}
                        saveShapes={() => console.log("Save camera config")}
                        isOpenSpaceMode={false}
                        setIsOpenSpaceMode={() => {}}
                    />
                </div>
            </div>
        </div>
    )
}