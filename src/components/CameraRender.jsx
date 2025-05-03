import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react" // Import useEffect
import ToolBar from "./tool-bar"
import { Plus, X, Upload, Maximize2, Minimize2 } from "lucide-react"
import VideoCanvas from './VideoCanvas'
import VideoSection from "./VideoSection"

import UploadIcon from "../assets/Upload.png"

export default function CameraRender() {
    const [open, setOpen] = useState(false)
    const [cameraName, setCameraName] = useState("")
    const [rtspUrl, setRtspUrl] = useState("")
    const [cameras, setCameras] = useState([])
    const [selectedTool, setSelectedTool] = useState("pointer")
    const [selectedCamera, setSelectedCamera] = useState(null)
    const [activeTab, setActiveTab] = useState('video')
    const [maximizedCamera, setMaximizedCamera] = useState(null)

    const [uploadedVideos, setUploadedVideos] = useState([]);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null)
    const [maximizedVideo, setMaximizedVideo] = useState(null)

    // Add this state to track the next video number
    const [nextVideoNumber, setNextVideoNumber] = useState(1);

    // Store camera references to persist HLS instances
    const cameraRefs = useRef({});

    // Store shapes for each camera
    const [cameraShapes, setCameraShapes] = useState({});
    const [videoShapes, setVideoShapes] = useState({});

    // Add a state variable to trigger re-render
    const [gridKey, setGridKey] = useState(0);
    const [gridVideoKey, setGridVideoKey] = useState(0);

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

    const handleMaximize = (cameraId) => {
        setMaximizedCamera(cameraId);
        setGridKey(prevKey => prevKey + 1); // Trigger re-render
    }

    const handleMinimize = () => {
        setMaximizedCamera(null);
        setGridKey(prevKey => prevKey + 1); // Trigger re-render
    }

    const handleVideoMaximize = (videoId) => {
        setMaximizedVideo(videoId);
        setGridVideoKey(prevKey => prevKey + 1); // Trigger re-render
    }

    const handleVideoMinimize = () => {
        setMaximizedVideo(null);
        setGridVideoKey(prevKey => prevKey + 1); // Trigger re-render
    }

    const handleSaveShapes = () => {
        // Create a structured object with camera info and shapes
        const cameraShapesData = cameras.map(camera => {
            // Get shapes for this camera
            const shapes = cameraShapes[camera.id] || [];

            // Filter for rectangle shapes (similar to your previous approach)
            const rectangleShapes = shapes.filter(shape => shape.type === "rectangle");

            // Transform shapes into the required format, matching your previous approach
            const regionsPayload = rectangleShapes.map(rect => {
                // Create vertices from the rectangle coordinates
                const vertices = [
                    [rect.x, rect.y],
                    [rect.x, rect.y + rect.height],
                    [rect.x + rect.width, rect.y + rect.height],
                    [rect.x + rect.width, rect.y]
                ];

                return {
                    Region_name: rect.name || `Region ${rect.id}`,
                    Region_Cords: {
                        vertices: vertices.map(([x, y]) => [x, y]) // This matches your previous mapping approach
                    }
                };
            });

            return {
                camera: {
                    id: camera.id,
                    name: camera.name,
                    url: camera.url,
                    hlsUrl: camera.hlsUrl
                },
                regions: regionsPayload
            };
        });

        // Filter out cameras with no regions
        const camerasWithRegions = cameraShapesData.filter(item => item.regions.length > 0);

        // Handle video shapes
        const videoShapesData = uploadedVideos.map(video => {
            const shapes = videoShapes[video.id] || [];
            const rectangleShapes = shapes.filter(shape => shape.type === "rectangle");

            const regionsPayload = rectangleShapes.map(rect => ({
                Region_name: rect.name || `Region ${rect.id}`,
                Region_Cords: {
                    vertices: [
                        [rect.x, rect.y],
                        [rect.x, rect.y + rect.height],
                        [rect.x + rect.width, rect.y + rect.height],
                        [rect.x + rect.width, rect.y]
                    ]
                }
            }));

            return {
                type: 'video',
                source: {
                    id: video.id,
                    name: video.file.name,
                    url: video.url
                },
                regions: regionsPayload
            };
        });

        // Filter out videos with no regions
        const videosWithRegions = videoShapesData.filter(item => item.regions.length > 0);

        console.log(JSON.stringify(videosWithRegions, null, 2));

        // Log the complete data structure
        console.log("=== SAVED CAMERA SHAPES DATA ===");
        console.log(JSON.stringify(camerasWithRegions, null, 2));
        console.log("===============================");

        // You would typically send this data to your backend API
        // Example: axios.post('/api/save-shapes', camerasWithRegions);
    }


    const handleClearCanvas = () => {
        if (activeTab === 'cam') {
            // Only clear shapes for maximized camera if one is maximized
            if (maximizedCamera) {
                setCameraShapes(prev => ({
                    ...prev,
                    [maximizedCamera]: [] // Clear only maximized camera's shapes
                }));
            } else if (selectedCamera) {
                setCameraShapes(prev => ({
                    ...prev,
                    [selectedCamera]: [] // Clear only selected camera's shapes
                }));
            }
        } else {
            // Only clear shapes for maximized video if one is maximized
            if (maximizedVideo) {
                setVideoShapes(prev => ({
                    ...prev,
                    [maximizedVideo]: [] // Clear only maximized video's shapes
                }));
            } else if (selectedVideo) {
                setVideoShapes(prev => ({
                    ...prev,
                    [selectedVideo]: [] // Clear only selected video's shapes
                }));
            }
        }
    }

    const updateShapesForCamera = (cameraId, shapes) => {
        setCameraShapes(prev => ({
            ...prev,
            [cameraId]: shapes
        }));
    }

    const updateShapesForVideo = (videoId, shapes) => {
        setVideoShapes(prev => ({
            ...prev,
            [videoId]: shapes
        }));
    }

    // Modify handleVideoUpload
    const handleVideoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (uploadedVideos.length >= 4) {
            alert("You can upload a maximum of 4 videos.");
            return;
        }

        const newVideo = {
            id: `Video ${nextVideoNumber}`,
            file,
            url: URL.createObjectURL(file),
        };

        setUploadedVideos((prev) => [...prev, newVideo]);
        setNextVideoNumber(prev => prev + 1);
        setUploadDialogOpen(false);
    }

    const getGridLayout = (count) => {
        switch (count) {
            case 0:
                return '';
            case 1:
                return 'w-[95%] md:w-[80%] lg:w-[800px] h-[400px] md:h-[480px] lg:h-[400px] mx-auto mt-10 md:mt-15'; // Responsive single camera
            case 2:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-4 lg:gap-3 w-[95%] md:w-[90%] lg:w-[80%] h-[600px] md:h-[400px] mx-auto mt-10 md:mt-20'; // Responsive two cameras
            case 3:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-4 w-[95%] md:w-[85%] lg:w-[80%] h-[800px] md:h-[390px] mx-auto mt-10 md:mt-18'; // Responsive three cameras
            case 4:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-4 w-[95%] md:w-[85%] lg:w-[80%] h-[1000px] md:h-[390px] mx-auto mt-10 md:mt-18'; // Responsive four cameras
            default:
                return 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 w-[95%] md:w-[85%] lg:w-[80%] h-[1000px] md:h-[700px] mx-auto mt-10 md:mt-15';
        }
    }

    useEffect(() => {
        return () => {
            // Cleanup object URLs when component unmounts
            uploadedVideos.forEach(video => {
                if (video.url.startsWith('blob:')) {
                    URL.revokeObjectURL(video.url);
                }
            });
        };
    }, [uploadedVideos]);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('border-[#717AEA]', 'bg-[#717AEA33]');
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-[#717AEA]', 'bg-[#717AEA33]');
    };

    // Modify handleDrop
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-[#717AEA]', 'bg-[#717AEA33]');

        const files = Array.from(e.dataTransfer.files);
        const videoFiles = files.filter(file => file.type.startsWith('video/'));

        if (videoFiles.length === 0) {
            alert("Please drop video files only");
            return;
        }
        if (uploadedVideos.length + videoFiles.length > 4) {
            alert("You can upload a maximum of 4 videos.");
            return;
        }

        videoFiles.forEach(file => {
            const newVideo = {
                id: `Video ${nextVideoNumber}`,
                file,
                url: URL.createObjectURL(file),
            };

            setUploadedVideos((prev) => [...prev, newVideo]);
            setNextVideoNumber(prev => prev + 1);
        });

        setUploadDialogOpen(false);
    };

    // Filter cameras to display based on maximized state
    const visibleCameras = maximizedCamera
        ? cameras.filter(cam => cam.id === maximizedCamera)
        : cameras;

    const visibleVideos = maximizedVideo
        ? uploadedVideos.filter(video => video.id === maximizedVideo)
        : uploadedVideos;

    // Trigger re-render when cameras change
    useEffect(() => {
        setGridKey(prevKey => prevKey + 1);
    }, [cameras]);

    useEffect(() => {
        setGridVideoKey(prevKey => prevKey + 1);
    }, [uploadedVideos]);

    // Add a reset for nextVideoNumber when switching tabs
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedCamera(null);
        setMaximizedCamera(null);
        setSelectedVideo(null);
        setMaximizedVideo(null);
        setCameras([]);
        setUploadedVideos([]);
        setNextVideoNumber(1); // Reset video numbering when switching tabs
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center">
            <div className="relative flex flex-col items-center w-screen h-screen">
                <div className="w-screen h-screen bg-white rounded-lg shadow-md relative ">
                    {/* Tab buttons */}
                    <div className="absolute top-4 left-4 flex gap-3">
                        <button
                            onClick={() => handleTabChange('video')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-sm border ${activeTab === 'video'
                                ? 'bg-[#7900F3] text-white border-[#7900F3]'
                                : 'bg-white text-[#717171] border-[#0000001A]'
                                }`}
                        >
                            <img
                                src="/play.svg"
                                className={`w-4 h-4 ${activeTab === 'video' ? 'brightness-0 invert' : ''
                                    }`}
                                alt="video icon"
                            />
                            <span>Video</span>
                        </button>

                        <button
                            onClick={() => handleTabChange('cam')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-sm border ${activeTab === 'cam'
                                ? 'bg-[#7900F3] text-white border-[#7900F3]'
                                : 'bg-white text-[#717171] border-[#0000001A]'
                                }`}
                        >
                            <img
                                src="/camera.svg"
                                className={`w-4 h-4 ${activeTab === 'cam' ? 'brightness-0 invert' : ''
                                    }`}
                                alt="cam icon"
                            />
                            <span>Cam</span>
                        </button>
                    </div>

                    {/* Video Grid - Always rendered but not always visible */}
                    <div
                        key={gridKey} // Add key to force re-render
                        className={`grid ${getGridLayout(visibleCameras.length)}`}
                    >
                        {/* Always render all cameras to keep HLS instances alive,
                            but only show the ones that should be visible */}
                        {cameras.map((camera) => {
                            const isVisible = !maximizedCamera || camera.id === maximizedCamera;

                            return (
                                <div
                                    key={camera.id}
                                    className={`relative rounded-lg overflow-hidden ${isVisible ? '' : 'hidden'
                                        }`}
                                >
                                    <VideoCanvas
                                        cameraData={camera}
                                        isSelected={selectedCamera === camera.id}
                                        onSelect={setSelectedCamera}
                                        isMaximized={maximizedCamera === camera.id}
                                        onMaximize={() => handleMaximize(camera.id)}
                                        onMinimize={handleMinimize}
                                        showMaximize={cameras.length > 1}
                                        selectedTool={selectedTool}
                                        shapes={cameraShapes[camera.id] || []}
                                        onShapesChange={(shapes) => updateShapesForCamera(camera.id, shapes)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {activeTab === 'video' && (
                        <div
                            key={gridKey} // Add key to force re-render
                            className={`grid ${getGridLayout(visibleVideos.length)}`}>
                            {uploadedVideos.map((video) => {
                                const isVisible = !maximizedVideo || video.id === maximizedVideo;

                                return (
                                    <div
                                        key={video.id}
                                        className={`relative rounded-lg overflow-hidden ${isVisible ? "" : "hidden"}`}
                                    >
                                        <VideoSection
                                            videoData={video}
                                            isSelected={selectedVideo === video.id}
                                            onSelect={setSelectedVideo}
                                            isMaximized={maximizedVideo === video.id}
                                            onMaximize={() => handleVideoMaximize(video.id)}
                                            onMinimize={handleVideoMinimize}
                                            showMaximize={uploadedVideos.length > 1}
                                            selectedTool={selectedTool}
                                            shapes={videoShapes[video.id] || []}
                                            onShapesChange={(shapes) => updateShapesForVideo(video.id, shapes)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                            <DialogTrigger asChild>
                                <button
                                    onClick={() => {
                                        if (uploadedVideos.length >= 4) {
                                            alert("Maximum 4 videos allowed.");
                                            return;
                                        }
                                        setUploadDialogOpen(true);
                                    }}
                                    className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-[4rem] border border-[#0000001A] hover:bg-gray-50 transition-colors"
                                >
                                    <Upload className="w-4 h-4 text-black" />
                                    <span className="text-black">Upload</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#F4F8FF] border border-[#0000001A] p-0 w-[664px] overflow-hidden rounded-3xl">
                                <div className="flex justify-between items-center p-5 border-b border-[#0000001A]">
                                    <DialogTitle className="text-xl font-medium">Upload file</DialogTitle>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div
                                        className="border-2 border-dashed border-[#717AEA] bg-[#717AEA1A] rounded-3xl flex items-center justify-center h-[200px] text-center cursor-pointer transition-colors duration-200"
                                        onClick={() => document.getElementById("video-upload-input").click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        <div>
                                            <img src={UploadIcon} className="mx-auto w-14 h-[42px] text-[#717AEA]" />
                                            <p className="text-[16px] font-medium mt-[10px] text-black">
                                                Drop your files here or <span className="text-[#717AEA66] underline">click to browse</span>
                                            </p>
                                        </div>
                                        <input
                                            id="video-upload-input"
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={handleVideoUpload}
                                            multiple
                                        />
                                    </div>

                                    <button
                                        className="w-full py-2 bg-[#717AEA] text-white rounded-full mt-3 text-xl"
                                        onClick={() => setUploadDialogOpen(false)}
                                    >
                                        Upload
                                    </button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Add Camera Button */}
                    {activeTab === 'cam' && cameras.length < 4 && (
                        <Dialog open={open} onOpenChange={setOpen} >
                            <DialogTrigger asChild>
                                <button
                                    className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-[4rem] border border-[#0000001A] transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Cam</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent style={{ borderRadius: '20px' }} className="bg-[#F4F8FF] border border-[#0000001A] p-0 w-[450px] overflow-hidden">
                                <div className="flex justify-between items-center p-4 border-b border-[#0000001A]">
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
                clearCanvas={handleClearCanvas}
                saveShapes={handleSaveShapes}
                isOpenSpaceMode={false}
                setIsOpenSpaceMode={() => {}}
                hasMaximizedOrSelected={Boolean(
                    activeTab === 'cam' 
                        ? maximizedCamera    // Only check for maximized camera
                        : maximizedVideo    // Only check for maximized video
                )}
                hasShapes={Boolean(
                    activeTab === 'cam'
                        ? (maximizedCamera && cameraShapes[maximizedCamera]?.length > 0)
                        : (maximizedVideo && videoShapes[maximizedVideo]?.length > 0)
                )}
            />
</div>
            </div>
        </div>
    )
}