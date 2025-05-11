import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react"; // Import useEffect
import ToolBar from "./tool-bar";
import { Plus, X, Upload, Maximize2, Minimize2, Loader2 } from "lucide-react";
import VideoCanvas from "./VideoCanvas";
import VideoSection from "./VideoSection";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import UploadIcon from "../assets/Upload.png";

export default function CameraRender() {
  const [open, setOpen] = useState(false);
  const [cameraName, setCameraName] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [activeTab, setActiveTab] = useState("video");
  const [maximizedCamera, setMaximizedCamera] = useState(null);

  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [maximizedVideo, setMaximizedVideo] = useState(null);
  const navigate = useNavigate();
  const [hasShapesSaved, setHasShapesSaved] = useState(false);
  const [hasVideoShapesSaved, setHasVideoShapesSaved] = useState(false);
  const [videoConfigData, setVideoConfigData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Add loading state
  const [isSaving, setIsSaving] = useState(false);

  // Add new state at the top with other states
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async () => {
    setIsAdding(true);
    const apiUrl = import.meta.env.VITE_API_URL;
    const startStreamEndpoint = `${apiUrl}/start-stream/`;
  
    try {
      const response = await axios.post(startStreamEndpoint, {
        camera_name: cameraName,
        rtsp_url: rtspUrl,
      });
  
      const { camera_id, first_frame } = response.data;
  
      const newCamera = {
        id: camera_id,
        name: cameraName,
        url: rtspUrl,
        firstFrame: first_frame, // Store the base64 image
        // Remove hlsUrl since we won't be using it
      };
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCameras((prev) => [...prev, newCamera]);
      setMaximizedCamera(camera_id);
      setGridKey((prev) => prev + 1);
      setOpen(false);
      setCameraName("");
      setRtspUrl("");
    } catch (error) {
      console.error("start-stream failed:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleMaximize = (cameraId) => {
    setMaximizedCamera(cameraId);
    setGridKey((prevKey) => prevKey + 1);
  };

  const handleMinimize = () => {
    setMaximizedCamera(null);
    setGridKey((prevKey) => prevKey + 1); 
  };

  const handleVideoMaximize = (videoId) => {
    setMaximizedVideo(videoId);
    setGridVideoKey((prevKey) => prevKey + 1); 
  };

  const handleVideoMinimize = () => {
    setMaximizedVideo(null);
    setGridVideoKey((prevKey) => prevKey + 1); 
  };



  const handleSaveShapes = async () => {
    setIsSaving(true);
    const apiUrl  = import.meta.env.VITE_API_URL;
    const endpoint= `${apiUrl}/start-stream/`;
  
    try {
      if (activeTab === "cam") {
        const camId   = maximizedCamera || selectedCamera;
        const camera  = cameras.find((c) => c.id === camId) || {};
  
        // ── 1) grab your canvas dimensions ───────────────────────────
        const wrapper   = document.getElementById(`camera-${camId}`);
        const canvasEl  = wrapper?.querySelector("canvas");
        const { width: canvas_width, height: canvas_height } =
          canvasEl?.getBoundingClientRect() || { width: 0, height: 0 };
        // ──────────────────────────────────────────────────────────────
  
        // Build your ROI definitions exactly as before…
        const roiDefs = Object.entries(cameraShapes).map(([_, shapes]) => {
          const rects = shapes.filter((s) => s.type === "rectangle");
          return {
            type: "camera",
            source: {
              id:   camera.id,
              name: camera.name,
              url:  camera.url,
            },
            regions: rects.map((r) => ({
              Region_name: r.name || `Region ${r.id}`,
              Region_Cords: {
                vertices: [
                  [r.x,             r.y],
                  [r.x,             r.y + r.height],
                  [r.x + r.width,   r.y + r.height],
                  [r.x + r.width,   r.y],
                ],
              },
            })),
          };
        });
  
        // ── 2) include those dimensions in your payload ──────────────
        const payload = {
          camera_name:   camera.name || "",
          rtsp_url:      camera.url  || "",
          first_frame:   camera.firstFrame || "",
          camera_id:     camId,
          roi_defs:      roiDefs,
          canvas_width:  Math.round(canvas_width),
          canvas_height: Math.round(canvas_height),
        };
        // ──────────────────────────────────────────────────────────────
  
        await axios.post(endpoint, payload);

               // Add minimum delay of 1 second
     await new Promise(resolve => setTimeout(resolve, 1000));
        setHasShapesSaved(true);
      } else {
        // Handle video tab
        const formData = new FormData();
        uploadedVideos.forEach((video) => {
          formData.append("video", video.file);
        });
      
        const videoShapesData = Object.entries(videoShapes).map(
          ([videoId, shapes]) => {
            const video = uploadedVideos.find((v) => v.id === videoId);
            const rects = shapes.filter((s) => s.type === "rectangle");
            return {
              type: "video",
              source: {
                id: video.id,
                name: video.file.name,
                url: video.url,
              },
              regions: rects.map((r) => ({
                Region_name: r.name || `Region ${r.id}`,
                Region_Cords: {
                  vertices: [
                    [r.x, r.y],
                    [r.x, r.y + r.height],
                    [r.x + r.width, r.y + r.height],
                    [r.x + r.width, r.y],
                  ],
                },
              })),
            };
          }
        );
      
        // grab the actual canvas size for this video
        const wrapper    = document.getElementById(`video-${selectedVideo}`);
        const canvasEl   = wrapper.querySelector("canvas");
        const { width: canvas_width, height: canvas_height } =
          canvasEl.getBoundingClientRect();
      
        formData.append("canvas_width",  Math.round(canvas_width));
        formData.append("canvas_height", Math.round(canvas_height));
        formData.append("roi_defs",      JSON.stringify(videoShapesData));
      
        const res = await fetch(`${apiUrl}/upload_config`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setHasVideoShapesSaved(true);
        setVideoConfigData(data);
        // navigate("/live-video", { state: { data } });

      }
          } catch (err) {
      console.error("Error saving shapes:", err);
    } finally {
      setIsSaving(false);
    }
  };



  const handleClearCanvas = () => {
    if (activeTab === "cam") {
        // Clear shapes for all cameras
        setCameraShapes({});
    } else {
        // Clear shapes for all videos
        setVideoShapes({});
    }
};

  const updateShapesForCamera = (cameraId, shapes) => {
    setCameraShapes((prev) => ({
      ...prev,
      [cameraId]: shapes,
    }));
  };

  const updateShapesForVideo = (videoId, shapes) => {
    setVideoShapes((prev) => ({
      ...prev,
      [videoId]: shapes,
    }));
  };

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
    setNextVideoNumber((prev) => prev + 1);
    setUploadDialogOpen(false);
  };

  // Update the getGridLayout function
  const getGridLayout = (count) => {
    const baseStyles = "mx-auto"; // Removed mt-16 mb-5 from base styles
    
    switch (count) {
      case 0:
        return "";
      case 1:
        return activeTab === "video" 
          ? `w-[60%] h-[470px] ${baseStyles} mt-2 2xl:mb-15` // Video styles
          : `w-[80%] h-[70vh] ${baseStyles} mt-16 mb-10`; // Camera styles
      case 2:
        return `grid-cols-2 gap-4 w-[90%] h-[60vh] ${baseStyles} mt-16`;
      case 3:
        return `grid-cols-2 gap-4 w-[60%] h-[60vh] ${baseStyles} mt-1 mb-10`;
      case 4:
        return `grid-cols-2 gap-4 w-[60%] h-[60vh] ${baseStyles} mt-1 mb-10`;
      default:
        return `grid-cols-2 gap-4 w-[90%] h-[70vh] ${baseStyles} mt-16`;
    }
  };
  useEffect(() => {
    return () => {
      // Cleanup object URLs when component unmounts
      uploadedVideos.forEach((video) => {
        if (video.url.startsWith("blob:")) {
          URL.revokeObjectURL(video.url);
        }
      });
    };
  }, [uploadedVideos]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("border-[#717AEA]", "bg-[#717AEA33]");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-[#717AEA]", "bg-[#717AEA33]");
  };

  // Modify handleDrop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-[#717AEA]", "bg-[#717AEA33]");

    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));

    if (videoFiles.length === 0) {
      alert("Please drop video files only");
      return;
    }
    if (uploadedVideos.length + videoFiles.length > 4) {
      alert("You can upload a maximum of 4 videos.");
      return;
    }

    videoFiles.forEach((file) => {
      const newVideo = {
        id: `Video ${nextVideoNumber}`,
        file,
        url: URL.createObjectURL(file),
      };

      setUploadedVideos((prev) => [...prev, newVideo]);
      setNextVideoNumber((prev) => prev + 1);
    });

    setUploadDialogOpen(false);
  };

  // Filter cameras to display based on maximized state
  const visibleCameras = maximizedCamera
    ? cameras.filter((cam) => cam.id === maximizedCamera)
    : cameras;

  const visibleVideos = maximizedVideo
    ? uploadedVideos.filter((video) => video.id === maximizedVideo)
    : uploadedVideos;

  // Trigger re-render when cameras change
  useEffect(() => {
    setGridKey((prevKey) => prevKey + 1);
  }, [cameras]);

  useEffect(() => {
    setGridVideoKey((prevKey) => prevKey + 1);
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
    setHasShapesSaved(false);
    setCameraShapes({});
    setVideoShapes({});
    setHasVideoShapesSaved(false);
    setVideoConfigData(null);
  };


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
  
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="relative flex flex-col items-center w-screen h-screen">
        <div className="w-screen h-screen bg-white rounded-lg shadow-md relative ">
          {/* Tab buttons */}
          <div className="absolute" style={{ top: '34px', left: '34px' }}>
  <div className="flex gap-3">
    <button
      onClick={() => handleTabChange("video")}
      style={{padding: "14px 24px"}}
      className={`flex items-center gap-2 rounded-[8px] border text-[16px] font-[500] ${
        activeTab === "video"
          ? "bg-[#717AEA] text-white border-none"
          : "bg-white text-[#717171] "
      }`}
    >
      <img
        src="/play.svg"
        className={`w-4 h-4 ${
          activeTab === "video" ? "brightness-0 invert" : ""
        }`}
        alt="video icon"
      />
      <span>Video</span>
    </button>

            <button
              onClick={() => handleTabChange("cam")}
              style={{padding: "14px 24px"}}
              className={`flex items-center gap-2   text-[16px] font-[500]  rounded-[8px] border ${
                activeTab === "cam"
                  ? "bg-[#717AEA] text-white border-none"
                  : "bg-white text-[#717171] "
              }`}
            >
              <img
                src="/camera.svg"
                className={`w-4 h-4 ${
                  activeTab === "cam" ? "brightness-0 invert" : ""
                }`}
                alt="cam icon"
              />
              <span>Cam</span>
            </button>
          </div>
          </div>

          {activeTab === "cam" && (
  <div className="w-full h-full flex items-center justify-center">
    <div
      key={gridKey}
      className={`grid ${getGridLayout(visibleCameras.length)}`}
    >
      {/* Always render all cameras to keep HLS instances alive,
          but only show the ones that should be visible */}
      {cameras.map((camera) => {
        const isVisible =
          !maximizedCamera || camera.id === maximizedCamera;

        return (
          <div
              key={camera.id}
              id={`camera-${camera.id}`}
              className={`relative rounded-lg overflow-hidden ${isVisible ? "" : "hidden"}`}
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
              onShapesChange={(shapes) =>
                updateShapesForCamera(camera.id, shapes)
              }
            />
          </div>
        );
      })}
    </div>
  </div>
)}

          {activeTab === "video" && (
            <div className="w-full h-full flex items-center justify-center">
              <div
                key={gridKey}
                className={`grid ${getGridLayout(visibleVideos.length)}`}
              >
                {uploadedVideos.map((video) => {
                  const isVisible =
                    !maximizedVideo || video.id === maximizedVideo;

                  return (
                       <div
                         key={video.id}
                         id={`video-${video.id}`}
                         className={`relative rounded-lg overflow-visible ${isVisible ? "" : "hidden"}`}
                      >                      <VideoSection
                        videoData={video}
                        isSelected={selectedVideo === video.id}
                        onSelect={setSelectedVideo}
                        isMaximized={maximizedVideo === video.id}
                        onMaximize={() => handleVideoMaximize(video.id)}
                        onMinimize={handleVideoMinimize}
                        showMaximize={uploadedVideos.length > 1}
                        selectedTool={selectedTool}
                        shapes={videoShapes[video.id] || []}
                        onShapesChange={(shapes) =>
                          updateShapesForVideo(video.id, shapes)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          
          {activeTab === "video" && (
  <div className="absolute flex items-center gap-3" style={{ top: '34px', right: '34px' }}>

     {/* Fullscreen */}
  
    <button
      onClick={toggleFullscreen}
      style={{padding: "14px 24px"}}
      className="flex items-center gap-[10px] rounded-[100px] text-[16px] font-[500] border transition-colors"
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4 text-black" />
      ) : (
        <Maximize2 className="w-4 h-4 text-black" />
      )}
      <span className="text-black">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
    </button>

            
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
          style={{padding: "14px 24px"}}
          className="flex items-center gap-[10px] rounded-[100px] text-[16px] font-[500] border transition-colors"
        >
          <Upload className="w-4 h-4 text-black" />
          <span className="text-black">Upload</span>
        </button>
      </DialogTrigger>
      
      <DialogContent className="bg-[#F4F8FF] border border-[#0000001A] p-0 w-[664px] overflow-hidden rounded-3xl">
        <div className="flex justify-between items-center p-5 border-b border-[#0000001A]">
          <DialogTitle className="text-xl font-medium">
            Upload file
          </DialogTitle>
        </div>
        <div className="p-4 space-y-4">
                  <div
                    className="border-2 border-dashed border-[#717AEA] bg-[#717AEA1A] rounded-3xl flex items-center justify-center h-[200px] text-center cursor-pointer transition-colors duration-200"
                    onClick={() =>
                      document.getElementById("video-upload-input").click()
                    }
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div>
                      <img
                        src={UploadIcon}
                        className="mx-auto w-14 h-[42px] text-[#717AEA]"
                      />
                      <p className="text-[16px] font-medium mt-[10px] text-black">
                        Drop your files here or{" "}
                        <span className="text-[#717AEA66] underline">
                          click to browse
                        </span>
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

    {/* <button
      onClick={() => navigate("/live-ai")}
      style={{padding: "14px 24px"}}
      className="flex items-center border gap-[10px] rounded-[100px] text-[#666] text-[16px] font-[500]"
    >
      <img
        src="/live.svg"
        alt="live icon"
        className="w-4 h-4 mr-2"
      />
      Live AI
    </button> */}

    {hasVideoShapesSaved && (
      <button
        onClick={() => navigate("/live-video", { state: { data: videoConfigData } })}
        style={{padding: "14px 24px"}}
        className="flex items-center border gap-[10px] rounded-[100px] text-[16px] font-[500] text-[#F20A0A]"
      >
        <img
          src="/live.svg"
          alt="live icon"
          className="w-4 h-4 mr-2"
          style={{
            filter: 'invert(15%) sepia(95%) saturate(6932%) hue-rotate(358deg) brightness(95%) contrast(114%)'
          }}
        />
        Live AI
      </button>
    )}
  </div>
)}

          {/* Add Camera Button */}
          {activeTab === "cam" && (
          <div className="absolute flex items-center gap-3" style={{ top: '34px', right: '34px' }}>

          {/* Fullscreen */}
          <button
          onClick={toggleFullscreen}
          style={{padding: "14px 24px"}}
          className="flex items-center gap-[10px] rounded-[100px] text-[16px] font-[500] border transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-black" />
          ) : (
            <Maximize2 className="w-4 h-4 text-black" />
          )}
          <span className="text-black">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
                
              {  cameras.length < 4 && 
              <Dialog open={open}  onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) {
                setIsAdding(false);
                setCameraName("");
                setRtspUrl("");
              }
            }}>
                <DialogTrigger asChild>
                <button
              
                  style={{padding: "14px 24px"}}
                  className="flex items-center gap-[10px] rounded-[100px] text-[16px] font-[500] border transition-colors"
                >
                   <Plus className="w-4 h-4" />
                   <span>Add Cam</span>
                </button>
                 
                </DialogTrigger>
                <DialogContent
                  style={{ borderRadius: "20px" }}
                  className="bg-[#F4F8FF] border border-[#0000001A] p-0 w-[450px] overflow-hidden"
                >
                  <div className="flex justify-between items-center p-4 border-b border-[#0000001A]">
                    <DialogTitle className="text-lg font-medium">
                      Add Cam
                    </DialogTitle>
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
                        className="w-full py-2 px-4 bg-[#717AEA] text-white rounded-[4rem] hover:bg-[#717AEA] transition-colors mt-4 flex items-center justify-center gap-2"
                        disabled={isAdding}
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Adding Camera...</span>
                          </>
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
               
                </DialogContent>
              </Dialog>}

              {hasShapesSaved && (
              <button
                onClick={() => {
                  const camId = selectedCamera;
                  if (!camId) {
                    alert("Please select (or maximize) a camera first before going Live AI.");
                    return;
                  }
                  navigate(`/live-ai/${camId}`, {
                    state: { cameraId: camId }
                  });
                }}
                style={{padding: "14px 24px"}}
                className="flex items-center border  gap-[10px] rounded-[100px] text-[16px] font-[500] text-[#F20A0A]"
              >
                <img
                  src="/live.svg"
                  alt="live icon"
                  className="w-4 h-4 mr-2"
                  style={{
                    filter: 'invert(15%) sepia(95%) saturate(6932%) hue-rotate(358deg) brightness(95%) contrast(114%)'
                  }}
                />
                Live AI
              </button>
            )}

             
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="fixed" style={{ bottom: '25px', left: '50%', transform: 'translateX(-50%)' }}>
          <ToolBar
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            clearCanvas={handleClearCanvas}
            saveShapes={handleSaveShapes}
            isOpenSpaceMode={false}
            setIsOpenSpaceMode={() => {}}
            hasMaximizedOrSelected={true}
            hasShapes={Boolean(
              activeTab === "cam"
                ? (selectedCamera && cameraShapes[selectedCamera]?.length > 0) || 
                  (maximizedCamera && cameraShapes[maximizedCamera]?.length > 0)
                : (selectedVideo && videoShapes[selectedVideo]?.length > 0) || 
                  (maximizedVideo && videoShapes[maximizedVideo]?.length > 0)
            )}
            isSaving={isSaving}
            activeTab={activeTab}
          />
        </div>
      </div>
    </div>
  );
}