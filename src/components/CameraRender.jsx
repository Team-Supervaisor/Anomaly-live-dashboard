import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import ToolBar from "./tool-bar"
import { Plus, X , Upload} from "lucide-react"
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

    // const getGridLayout = (count) => {
    //     switch (count) {
    //         case 0:
    //             return '';
    //         case 1:
    //             return 'w-[900px] h-[540px] mx-auto mt-15'; // Larger size for single camera
    //         case 2:
    //             return 'grid-cols-2 gap-3 w-[90%] h-[500px] mx-auto mt-20'; // Two cameras with gap
    //         case 3: return 'grid-cols-2 gap-3 w-[70%] h-[540px] mx-auto mt-15';
          
    //         case 4:
    //             return 'grid-cols-2 gap-3 w-[65%] h-[540px] mx-auto mt-15'; // 2x2 grid with gaps
    //         default:
    //             return 'grid-cols-2 gap-8 w-[95%] h-[700px] mx-auto mt-20';
    //     }
    // }

    const getGridLayout = (count) => {
        switch (count) {
            case 0:
                return '';
            case 1:
                return 'w-[95%] md:w-[80%] lg:w-[900px] h-[400px] md:h-[480px] lg:h-[540px] mx-auto mt-10 md:mt-15'; // Responsive single camera
            case 2:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-4 lg:gap-3 w-[95%] md:w-[90%] lg:w-[90%] h-[600px] md:h-[500px] mx-auto mt-10 md:mt-20'; // Responsive two cameras
            case 3:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-4 w-[95%] md:w-[85%] lg:w-[80%] h-[800px] md:h-[500px] mx-auto mt-10 md:mt-18'; // Responsive three cameras
            case 4:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-4 w-[95%] md:w-[85%] lg:w-[80%] h-[1000px] md:h-[520px] mx-auto mt-10 md:mt-18'; // Responsive four cameras
            default:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 w-[95%] md:w-[85%] lg:w-[80%] h-[1000px] md:h-[700px] mx-auto mt-10 md:mt-15';
        }
    }

    return (
        <div className="relative w-full h-full flex flex-col items-center">
            <div className="relative flex flex-col items-center w-screen h-screen">
                <div className="w-screen h-screen bg-white rounded-lg shadow-md relative ">
                    {/* Tab buttons */}
                    <div className="absolute top-4 left-4 flex gap-3">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-sm border ${
                                activeTab === 'video'
                                    ? 'bg-[#7900F3] text-white border-[#7900F3]'
                                    : 'bg-white text-[#717171] border-[#0000001A]  '
                            }`}
                        >
                            <img 
                                src="/play.svg"
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
                                    : 'bg-white text-[#717171] border-[#0000001A]'
                            }`}
                        >
                            <img 
                                src="/camera.svg"
                                className={`w-4 h-4 ${
                                    activeTab === 'cam' ? 'brightness-0 invert' : ''
                                }`}
                                alt="cam icon"
                            />
                            <span>Cam</span>
                        </button>
                    </div>

                    {/* Video Grid */}
                    {cameras.length === 1 ? (
                        // Single camera view
                        <div className={`${getGridLayout(1)} relative`}>
                            <VideoCanvas
                                key={cameras[0].id}
                                cameraData={cameras[0]}
                                isSelected={selectedCamera === cameras[0].id}
                                onSelect={setSelectedCamera}
                            />
                        </div>
                    ) : (
                        // Multiple cameras grid
                        <div className={`grid ${getGridLayout(cameras.length)}`}>
                            {cameras.map((camera) => (
                                <div key={camera.id} className="relative rounded-lg overflow-hidden">
                                    <VideoCanvas
                                        cameraData={camera}
                                        isSelected={selectedCamera === camera.id}
                                        onSelect={setSelectedCamera}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {activeTab === 'video' && (
                        <button
                            onClick={() => console.log('Upload video')}
                            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-[4rem] border border-[#0000001A] hover:bg-gray-50 transition-colors"
                        >
                            <Upload className="w-4 h-4 text-black" />
                            <span className="text-black">Upload</span>
                        </button>
                    )}


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