import { useState, useRef, useEffect } from "react";
import ToolBar from "./tool-bar";
import VideoCanvas from "./VideoCanvas";
import VideoSection from "./VideoSection";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import FullscreenToggle from "./ui/Fullscreentoggle";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import UploadModal from "./UploadModal";


export default function CameraRender() {
  const [open, setOpen] = useState(true); // Set to true initially to show the popup
  const [cameraName, setCameraName] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [activeTab, setActiveTab] = useState("video"); // Default to video
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
  const [nextVideoNumber, setNextVideoNumber] = useState(1);
  const cameraRefs = useRef({});
  const [cameraShapes, setCameraShapes] = useState({});
  const [videoShapes, setVideoShapes] = useState({});
  const [gridKey, setGridKey] = useState(0);
  const [gridVideoKey, setGridVideoKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
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
        firstFrame: first_frame,
      };
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
    const apiUrl = import.meta.env.VITE_API_URL;
    const endpoint = `${apiUrl}/start-stream/`;

    try {
      if (activeTab === "cam") {
        const camId = maximizedCamera || selectedCamera;
        const camera = cameras.find((c) => c.id === camId) || {};

        const wrapper = document.getElementById(`camera-${camId}`);
        const canvasEl = wrapper?.querySelector("canvas");
        const { width: canvas_width, height: canvas_height } =
          canvasEl?.getBoundingClientRect() || { width: 0, height: 0 };

        const roiDefs = Object.entries(cameraShapes).map(([_, shapes]) => {
          return {
            type: "camera",
            source: {
              id: camera.id,
              name: camera.name,
              url: camera.url,
            },
            regions: shapes.map((shape) => {
              if (shape.type === "rectangle") {
                return {
                  Region_name: shape.name || `Region ${shape.id}`,
                  Region_Cords: {
                    vertices: [
                      [shape.x, shape.y],
                      [shape.x, shape.y + shape.height],
                      [shape.x + shape.width, shape.y + shape.height],
                      [shape.x + shape.width, shape.y],
                    ],
                  },
                };
              } else if (shape.type === "caligraphy") {
                return {
                  Region_name: shape.name || `Region ${shape.id}`,
                  Region_Cords: {
                    vertices: shape.points.map((point) => [point.x, point.y]),
                  },
                };
              }
              return null;
            }).filter(Boolean),
          };
        });

        const payload = {
          camera_name: camera.name || "",
          rtsp_url: camera.url || "",
          first_frame: camera.firstFrame || "",
          camera_id: camId,
          roi_defs: roiDefs,
          canvas_width: Math.round(canvas_width),
          canvas_height: Math.round(canvas_height),
        };

        await axios.post(endpoint, payload);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setHasShapesSaved(true);
      } else {
        const videosWithoutShapes = uploadedVideos.filter(
          (video) => !videoShapes[video.id] || videoShapes[video.id].length === 0
        );

        if (videosWithoutShapes.length > 0) {
          const videoNames = videosWithoutShapes.map((v) => v.file.name).join(", ");
          alert(
            `Please draw at least one region for each video. Missing regions in: ${videoNames}`
          );
          setIsSaving(false);
          return;
        }

        const formData = new FormData();
        uploadedVideos.forEach((video) => {
          formData.append("video", video.file);
        });

        const videoShapesData = Object.entries(videoShapes).map(
          ([videoId, shapes]) => {
            const video = uploadedVideos.find((v) => v.id === videoId);
            return {
              type: "video",
              source: {
                id: video.id,
                name: video.file.name,
                url: video.url,
              },
              regions: shapes.map((shape) => {
                if (shape.type === "rectangle") {
                  return {
                    Region_name: shape.name || `Region ${shape.id}`,
                    Region_Cords: {
                      vertices: [
                        [shape.x, shape.y],
                        [shape.x, shape.y + shape.height],
                        [shape.x + shape.width, shape.y + shape.height],
                        [shape.x + shape.width, shape.y],
                      ],
                    },
                  };
                } else if (shape.type === "caligraphy") {
                  return {
                    Region_name: shape.name || `Region ${shape.id}`,
                    Region_Cords: {
                      vertices: shape.points.map((point) => [point.x, point.y]),
                    },
                  };
                }
                return null;
              }).filter(Boolean),
            };
          }
        );

        const wrapper = document.getElementById(`video-${selectedVideo}`);
        const canvasEl = wrapper.querySelector("canvas");
        const { width: canvas_width, height: canvas_height } =
          canvasEl.getBoundingClientRect();

        formData.append("canvas_width", Math.round(canvas_width));
        formData.append("canvas_height", Math.round(canvas_height));
        formData.append("roi_defs", JSON.stringify(videoShapesData));

        const res = await fetch(`${apiUrl}/tracking_details`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        setHasVideoShapesSaved(true);
      }
    } catch (err) {
      console.error("Error saving shapes:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCanvas = () => {
    if (activeTab === "cam") {
      setCameraShapes({});
    } else {
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
    setOpen(false); // Close the popup after video upload
  };

  const getGridLayout = (count) => {
    const baseStyles = "mx-auto";

    switch (count) {
      case 0:
        return "";
      case 1:
        return activeTab === "video"
          ? `w-[60%] h-[470px] ${baseStyles} mb-20`
          : `w-[80%] h-[70vh] ${baseStyles} mb-16`;
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
    setOpen(false); // Close the popup after video drop
  };

  const visibleCameras = maximizedCamera
    ? cameras.filter((cam) => cam.id === maximizedCamera)
    : cameras;

  const visibleVideos = maximizedVideo
    ? uploadedVideos.filter((video) => video.id === maximizedVideo)
    : uploadedVideos;

  useEffect(() => {
    setGridKey((prevKey) => prevKey + 1);
  }, [cameras]);

  useEffect(() => {
    setGridVideoKey((prevKey) => prevKey + 1);
  }, [uploadedVideos]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedCamera(null);
    setMaximizedCamera(null);
    setSelectedVideo(null);
    setMaximizedVideo(null);
    setCameras([]);
    setUploadedVideos([]);
    setNextVideoNumber(1);
    setHasShapesSaved(false);
    setCameraShapes({});
    setVideoShapes({});
    setHasVideoShapesSaved(false);
    setVideoConfigData(null);
  };

  const resetState = () => {
    setOpen(true);
    setCameraName("");
    setRtspUrl("");
    setCameras([]);
    setSelectedTool("pointer");
    setSelectedCamera(null);
    setActiveTab("video");
    setMaximizedCamera(null);
    setUploadedVideos([]);
    setUploadDialogOpen(false);
    setSelectedVideo(null);
    setMaximizedVideo(null);
    setHasShapesSaved(false);
    setHasVideoShapesSaved(false);
    setVideoConfigData(null);
    setCameraShapes({});
    setVideoShapes({});
    setGridKey(0);
    setGridVideoKey(0);
    setIsSaving(false);
    setIsAdding(false);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="relative flex flex-col items-center w-screen h-screen">
        <header className="flex items-center justify-between h-[58px] pl-[12px] bg-white w-full">
          {/* Left section - Logo and Title */}
          <div
          onClick={resetState}
          className="flex-none cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <div className="rounded">
              <img className="h-8 w-8" src={logo} alt="Logo" />
            </div>
            <h2 className="text-[22px] text-black font-medium">
              Tracking Dashboard
            </h2>
          </div>
        </div>

          {/* Right section - Fullscreen and Live AI */}
          <div className="flex items-center gap-4">
            <div  className="m-3">
              <FullscreenToggle  />
            </div>
            {activeTab === "video" && hasVideoShapesSaved && (
              <button
                onClick={() => navigate("/live-video")}
                style={{ padding: "14px 24px" }}
                className="flex items-center border gap-[10px] rounded-[100px] text-[16px] font-[500] text-[#F20A0A]"
              >
                <img
                  src="/live.svg"
                  alt="live icon"
                  className="w-4 h-4 mr-2"
                  style={{
                    filter:
                      "invert(15%) sepia(95%) saturate(6932%) hue-rotate(358deg) brightness(95%) contrast(114%)",
                  }}
                />
                Live AI
              </button>
            )}

            {activeTab === "cam" && hasShapesSaved && (
              <button
                onClick={() => {
                  const camId = selectedCamera;
                  if (!camId) {
                    alert(
                      "Please select (or maximize) a camera first before going Live AI."
                    );
                    return;
                  }
                  navigate(`/live-ai/${camId}`, {
                    state: { cameraId: camId },
                  });
                }}
                style={{ padding: "14px 24px" }}
                className="flex items-center border  gap-[10px] rounded-[100px] text-[16px] font-[500] text-[#F20A0A]"
              >
                <img
                  src="/live.svg"
                  alt="live icon"
                  className="w-4 h-4 mr-2"
                  style={{
                    filter:
                      "invert(15%) sepia(95%) saturate(6932%) hue-rotate(358deg) brightness(95%) contrast(114%)",
                  }}
                />
                Live AI
              </button>
            )}
          </div>
        </header>

        <div className="w-screen h-screen bg-[#F6F7FA] rounded-lg shadow-md relative ">
          {activeTab === "cam" && (
            <div className="w-full h-full flex items-center justify-center">
              <div
                key={gridKey}
                className={`grid ${getGridLayout(visibleCameras.length)}`}
              >
                {cameras.map((camera) => {
                  const isVisible =
                    !maximizedCamera || camera.id === maximizedCamera;

                  return (
                    <div
                      key={camera.id}
                      id={`camera-${camera.id}`}
                      className={`relative rounded-lg overflow-hidden ${
                        isVisible ? "" : "hidden"
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
                      className={`relative rounded-lg overflow-visible ${
                        isVisible ? "" : "hidden"
                      }`}
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
        </div>

        {/* Toolbar */}
        <div
          className="fixed"
          style={{ bottom: "25px", left: "50%", transform: "translateX(-50%)" }}
        >
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
                ? (selectedCamera &&
                    cameraShapes[selectedCamera]?.length > 0) ||
                    (maximizedCamera &&
                      cameraShapes[maximizedCamera]?.length > 0)
                : (selectedVideo && videoShapes[selectedVideo]?.length > 0) ||
                    (maximizedVideo && videoShapes[maximizedVideo]?.length > 0)
            )}
            isSaving={isSaving}
            activeTab={activeTab}
          />
        </div>

        {/* Popup Modal */}
        <UploadModal
        open={open}
        activeTab={activeTab}
        cameraName={cameraName}
        setCameraName={setCameraName}
        rtspUrl={rtspUrl}
        setRtspUrl={setRtspUrl}
        handleSubmit={handleSubmit}
        isAdding={isAdding}
        handleVideoUpload={handleVideoUpload}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        handleTabChange={handleTabChange}
      />
      </div>
    </div>
  );
}
