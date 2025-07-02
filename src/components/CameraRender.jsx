import React, { useState, useRef, useEffect, Suspense } from "react"; // Import useEffect
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ToolBar from "./tool-bar";
import TabButtons from "./TabButtons";
import MediaGrid from "./MediaGrid";
import {
  buildCameraPayload,
  buildCameraRegions,
  buildVideoShapesData,
} from "@/lib/saveShapesUtils";
import { useAlert } from "./AlertsComponent";

const VideoControls = React.lazy(() => import("./VideoControls"));
const CameraControls = React.lazy(() => import("./CameraControls"));

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
  const { showAlert } = useAlert();

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
      if(!first_frame) return;

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
        // Camera logic
        const requests = cameras.map(async (camera, camIdx) => {
          const shapes = cameraShapes[camera.id] || [];
          const regions = buildCameraRegions(camera, shapes, camIdx);
          const payload = buildCameraPayload(camera, regions);
          return axios.post(endpoint, payload);
        });

        await Promise.all(requests);
        setHasShapesSaved(true);
      } else {
        // Video logic
        const videosWithoutShapes = uploadedVideos.filter(
          (video) =>
            !videoShapes[video.id] || videoShapes[video.id].length === 0,
        );

        if (videosWithoutShapes.length > 0) {
          const videoNames = videosWithoutShapes
            .map((v) => v.file.name)
            .join(", ");
          showAlert( `Please draw at least one region for each video. Missing regions in: ${videoNames}`, 'error');
          setIsSaving(false);
          return;
        }

        const formData = new FormData();
        uploadedVideos.forEach((video) => {
          formData.append("video", video.file);
        });

        const videoShapesData = buildVideoShapesData(
          uploadedVideos,
          videoShapes,
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
      showAlert('You can upload a maximum of 4 videos.', 'error');
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

  const getGridLayout = (count) => {
    const baseStyles = "mx-auto";

    switch (count) {
      case 0:
        return "";
      case 1:
        return activeTab === "video"
          ? `w-[60%] h-[470px] ${baseStyles} mt-2 2xl:mb-15`
          : `w-[80%] h-[70vh] ${baseStyles} mt-16 mb-10`;
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
      showAlert('Please drop video files only', 'error');
      return;
    }
    if (uploadedVideos.length + videoFiles.length > 4) {
      showAlert('You can upload a maximum of 4 videos.', 'error');
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
    setNextVideoNumber(1); // Reset video numbering when switching tabs
    setHasShapesSaved(false);
    setCameraShapes({});
    setVideoShapes({});
    setHasVideoShapesSaved(false);
    setVideoConfigData(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="relative flex flex-col items-center w-screen h-screen">
        <div className="w-screen h-screen bg-white rounded-lg shadow-md relative ">
          {/* Tab buttons */}
          <TabButtons activeTab={activeTab} onTabChange={handleTabChange} />

          {activeTab === "cam" && (
            <Suspense fallback={null}>
              <CameraControls
                open={open}
                setOpen={setOpen}
                isAdding={isAdding}
                cameraName={cameraName}
                setCameraName={setCameraName}
                rtspUrl={rtspUrl}
                setRtspUrl={setRtspUrl}
                handleSubmit={handleSubmit}
                hasShapesSaved={hasShapesSaved}
                selectedCamera={selectedCamera}
                navigate={navigate}
              />
            </Suspense>
          )}

          {activeTab === "cam" && (
            <MediaGrid
              items={cameras}
              mediaType="camera"
              maximizedId={maximizedCamera}
              gridKey={gridKey}
              getGridLayout={getGridLayout}
              selectedId={selectedCamera}
              setSelectedId={setSelectedCamera}
              handleMaximize={handleMaximize}
              handleMinimize={handleMinimize}
              showMaximize={cameras.length > 1}
              selectedTool={selectedTool}
              shapesMap={cameraShapes}
              onShapesChange={updateShapesForCamera}
            />
          )}

          {/* Video tab and remaining JSX unchanged... */}
          {activeTab === "video" && (
            <Suspense fallback={null}>
              <VideoControls
                uploadDialogOpen={uploadDialogOpen}
                setUploadDialogOpen={setUploadDialogOpen}
                uploadedVideos={uploadedVideos}
                handleVideoUpload={handleVideoUpload}
                handleDrop={handleDrop}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                hasVideoShapesSaved={hasVideoShapesSaved}
                navigate={navigate}
              />
            </Suspense>
          )}

          {activeTab === "video" && (
            <MediaGrid
              items={uploadedVideos}
              mediaType="video"
              maximizedId={maximizedVideo}
              gridKey={gridKey}
              getGridLayout={getGridLayout}
              selectedId={selectedVideo}
              setSelectedId={setSelectedVideo}
              handleMaximize={handleVideoMaximize}
              handleMinimize={handleVideoMinimize}
              showMaximize={uploadedVideos.length > 1}
              selectedTool={selectedTool}
              shapesMap={videoShapes}
              onShapesChange={updateShapesForVideo}
            />
          )}

          {/* Toolbar */}
          <div
            className="fixed"
            style={{
              bottom: "25px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
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
                      (maximizedVideo &&
                        videoShapes[maximizedVideo]?.length > 0),
              )}
              isSaving={isSaving}
              activeTab={activeTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
