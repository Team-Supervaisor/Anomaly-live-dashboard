import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import ToolBar from "./tool-bar"
import { Plus, X } from "lucide-react"

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
                <div className="w-[95%] h-[85%] bg-white rounded-lg shadow-md relative mt-4">
                    {/* Tab buttons */}
                    <div className="absolute top-4 left-4 flex gap-3">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-sm border ${
                                activeTab === 'video'
                                    ? 'bg-[#7900F3] text-white border-[#7900F3]'
                                    : 'bg-white text-[#717171] border-[#717171]'
                            }`}
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-sm border ${
                                activeTab === 'cam'
                                    ? 'bg-[#7900F3] text-white border-[#7900F3]'
                                    : 'bg-white text-[#717171] border-[#717171]'
                            }`}
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

         
                    {activeTab === 'cam' && (
                        <Dialog open={open} onOpenChange={setOpen} className="rounded-2xl">
                            <DialogTrigger asChild>
                                <button
                                    className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2  rounded-[4rem] border border-[#0000001A] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Cam</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#F5F5F5]  rounded-[3rem] border border-[#0000001A] p-0 w-[450px]">
                                <div className="flex justify-between items-center p-4 border-b border-[#0000001A]">
                                    <DialogTitle className="text-lg font-medium">Add Cam</DialogTitle>
                                    {/* <button 
                                        onClick={() => setOpen(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button> */}
                                </div>
                                
                                <div className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Enter the camera name:
                                        </label>
                                        <Input
                                            value={cameraName}
                                            onChange={(e) => setCameraName(e.target.value)}
                                            className="w-full border border-[#0000001A] bg-white focus:ring-[#717AEA] focus:border-[#717AEA]"
                                            placeholder="Camera name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Enter the RTSP URL:
                                        </label>
                                        <Input
                                            value={rtspUrl}
                                            onChange={(e) => setRtspUrl(e.target.value)}
                                            className="w-full border border-[#0000001A] bg-white focus:ring-[#717AEA] focus:border-[#717AEA]"
                                            placeholder="rtsp://"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        className="w-full py-2 px-4 bg-[#717AEA] text-white rounded-[4rem] hover:bg-[#5961e0] transition-colors mt-4"
                                    >
                                        Add
                                    </button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

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