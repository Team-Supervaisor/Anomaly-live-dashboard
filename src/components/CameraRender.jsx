import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import ToolBar from "./tool-bar"
import { Plus, X } from "lucide-react"
import VideoCanvas from './VideoCanvas'

export default function CameraRender() {
    const [open, setOpen] = useState(false)
    const [cameraName, setCameraName] = useState("")
    const [rtspUrl, setRtspUrl] = useState("")
    const [cameras, setCameras] = useState([])
    const [selectedTool, setSelectedTool] = useState("pointer")
    const [selectedCamera, setSelectedCamera] = useState(null)
    const [activeTab, setActiveTab] = useState('video')

    const handleSubmit = () => {
        const newCamera = {
            id: Date.now(),
            name: cameraName,
            url: rtspUrl,
            hlsUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.mp4/.m3u8'
        }
        setCameras([...cameras, newCamera])
        setOpen(false)
        setCameraName("")
        setRtspUrl("")
    }

    const getGridCols = (count) => {
        if (count <= 1) return 'grid-cols-1'
        if (count <= 2) return 'grid-cols-2'
        return 'grid-cols-2 md:grid-cols-2'
    }

    return (
        <div className="backdrop-blur-sm bg-black/30 relative w-full h-[calc(100vh)] flex flex-col items-center">
            <div className="relative flex flex-col items-center h-full w-full">
                <div className="w-[95%] h-[85%] bg-white rounded-lg shadow-md relative mt-4 p-4">
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

                    {/* Video Grid */}
                    <div className={`grid ${getGridCols(cameras.length)} gap-4 h-full`}>
                        {cameras.map((camera) => (
                            <VideoCanvas
                                key={camera.id}
                                cameraData={camera}
                                isSelected={selectedCamera === camera.id}
                                onSelect={setSelectedCamera}
                            />
                        ))}
                    </div>

                    {/* Add Camera Button */}
                    {activeTab === 'cam' && cameras.length < 4 && (
                        <Dialog open={open} onOpenChange={setOpen} >
                            <DialogTrigger asChild>
                                <button
                                    className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2  rounded-[4rem] border border-[#0000001A] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Cam</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent style={{borderRadius: '20px'}} className="bg-[#F5F5F5]  border border-[#0000001A] p-0 w-[450px] overflow-hidden">
                                <div className="flex justify-between  items-center p-4 border-b border-[#0000001A]">
                                    <DialogTitle className="text-lg font-medium">Add Cam</DialogTitle>
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
                </div>

                {/* Toolbar */}
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