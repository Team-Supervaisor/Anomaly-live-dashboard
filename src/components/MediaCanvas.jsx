import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Maximize, Minimize } from "lucide-react";
import RegionModal from "./modals/AddRegionModal";
import ShapeControls from "./ShapeControls";
import FillColorPicker from "./FillColorPicker";
import useCanvasDrawing from "../lib/useCanvasDrawing";

const cursorMap = {
  pointer: "cursor-pointer",
  rectangle: "cursor-crosshair",
  fill: "custom-fill",
  caligraphy: "cursor-crosshair",
};

const playbackPositions = {};

const getPolygonCenter = (points) => {
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x, y };
};

export default function MediaCanvas({
  mediaType, // "camera" or "video"
  mediaData, // cameraData or videoData
  isSelected,
  onSelect,
  isMaximized,
  onMaximize,
  onMinimize,
  showMaximize,
  selectedTool,
  shapes = [],
  onShapesChange,
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [nextId, setNextId] = useState(1);
  const [drawingState, setDrawingState] = useState({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [selectedShape, setSelectedShape] = useState(null);
  const [hoveredShape, setHoveredShape] = useState(null);
  const [shapeDialog, setShapeDialog] = useState({
    isOpen: false,
    shapeId: null,
    name: "",
  });
  const [fillColor, setFillColor] = useState("#6366F1");
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [previewPoint, setPreviewPoint] = useState(null);
  const [nearStartPoint, setNearStartPoint] = useState(false);

  const firstFrameImageRef = useRef(null);

  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });

  //helper functions
  const { handleMouseDown, handleMouseMove, handleMouseUp } = useCanvasDrawing({
    mediaType,
    canvasRef,
    videoRef,
    firstFrameImageRef,
    shapes,
    isMaximized,
    showMaximize,
    drawingState,
    setDrawingState,
    selectedShape,
    setSelectedShape,
    hoveredShape,
    setHoveredShape,
    polygonPoints,
    setPolygonPoints,
    isDrawingPolygon,
    setIsDrawingPolygon,
    previewPoint,
    setPreviewPoint,
    nearStartPoint,
    setNearStartPoint,
    selectedTool,
    fillColor,
    onShapesChange,
    nextId,
    setNextId,
    canvasDimensions,
    animationFrameRef,
    setShapeDialog,
    shapeDialog,
    getPolygonCenter,
  });

  // --- Setup for camera (HLS or base64) ---
  useEffect(() => {
    if (mediaType !== "camera" || !mediaData.firstFrame) return;
    const img = new Image();
    img.onload = () => {
      firstFrameImageRef.current = {
        image: img,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
      };
    };
    img.src = `data:image/jpeg;base64,${mediaData.firstFrame}`;
  }, [mediaType, mediaData.firstFrame]);

  // --- Setup for HLS (camera only, if no firstFrame) ---
  useEffect(() => {
    if (mediaType !== "camera" || mediaData.firstFrame) return;
    const video = videoRef.current;
    if (!video || !mediaData.hlsUrl) return;

    if (Hls.isSupported()) {
      if (hlsRef.current && videoRef.current) {
        playbackPositions[mediaData.id] = videoRef.current.currentTime;
      }
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(mediaData.hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = mediaData.hlsUrl;
      video.play().catch(() => {});
    }
  }, [mediaType, mediaData.hlsUrl, mediaData.id, mediaData.firstFrame]);

  useEffect(() => {
    if (mediaType !== "camera") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [mediaType]);

  // --- Setup for video (uploaded) ---
  useEffect(() => {
    if (mediaType !== "video") return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const handleVideoMetadata = () => {
      if (!canvasDimensions.width && !canvasDimensions.height) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        canvas.width = width;
        canvas.height = height;
        setCanvasDimensions({ width, height });
      }
    };
    video.addEventListener("loadedmetadata", handleVideoMetadata);
    return () =>
      video.removeEventListener("loadedmetadata", handleVideoMetadata);
  }, [
    mediaType,
    mediaData.url,
    canvasDimensions.width,
    canvasDimensions.height,
  ]);

  // --- Keyboard Escape to minimize ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isMaximized) {
        onMinimize();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized, onMinimize]);

  // --- Update nextId when shapes change ---
  useEffect(() => {
    if (shapes.length > 0) {
      setNextId(Math.max(...shapes.map((s) => s.id)) + 1);
    } else {
      setNextId(1);
    }
  }, [shapes]);

  // --- Persist playback position on unmount ---
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        const t = videoRef.current.currentTime;
        if (t > 0) {
          playbackPositions[mediaData.id] = t;
        }
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [mediaData.id]);

  // --- Edit/Delete handlers ---
  const handleEditShape = () => {
    if (!hoveredShape) return;
    setShapeDialog({
      isOpen: true,
      shapeId: hoveredShape.id,
      name: hoveredShape.name || "",
    });
    setSelectedShape(hoveredShape);
    setHoveredShape(null);
  };

  const handleDeleteShape = () => {
    if (!hoveredShape) return;
    onShapesChange(shapes.filter((s) => s.id !== hoveredShape.id));
    setHoveredShape(null);
  };

  // --- Modal handlers ---
  const closeShapeDialog = () =>
    setShapeDialog({ ...shapeDialog, isOpen: false });
  const handleShapeDialogSave = (name) => {
    onShapesChange(
      shapes.map((s) =>
        s.id === shapeDialog.shapeId ? { ...s, name: name } : s,
      ),
    );
    setShapeDialog({ ...shapeDialog, isOpen: false });
  };

  // --- Cursor style ---
  const getCursorStyle = () => {
    if (
      selectedTool === "caligraphy" &&
      nearStartPoint &&
      polygonPoints.length >= 2
    ) {
      return "cursor-pointer";
    }
    return cursorMap[selectedTool] || "";
  };

  // --- Hover controls style ---

  const hoverStyle = () => {
    if (!canvasRef.current || !videoRef.current || !hoveredShape) return {};
    const rect = canvasRef.current.getBoundingClientRect();
    let vw = rect.width,
      vh = rect.height;
    if (mediaType === "video" && videoRef.current) {
      vw = videoRef.current.videoWidth;
      vh = videoRef.current.videoHeight;
    }
    if (hoveredShape.type === "rectangle") {
      const cssX = (hoveredShape.x / vw) * rect.width;
      const cssY = (hoveredShape.y / vh) * rect.height;
      const cssW = (hoveredShape.width / vw) * rect.width;
      return {
        position: "absolute",
        right: `${rect.width - (cssX + cssW) + 12}px`,
        top: `${cssY + 12}px`,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      };
    } else if (hoveredShape.type === "caligraphy") {
      const center = getPolygonCenter(hoveredShape.points);
      const cssX = (center.x / vw) * rect.width;
      const cssY = (center.y / vh) * rect.height;
      return {
        position: "absolute",
        left: `${cssX + 12}px`,
        top: `${cssY + 12}px`,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      };
    }
    return {};
  };

  return (
    <div
      className={`w-full h-full relative ${isSelected ? "ring-2 ring-[#7900F3]" : ""}`}
      onClick={() => onSelect(mediaData.id)}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full bg-black rounded-lg ${getCursorStyle()}`}
        style={{
          aspectRatio:
            mediaType === "video" &&
            canvasDimensions.width &&
            canvasDimensions.height
              ? `${canvasDimensions.width}/${canvasDimensions.height}`
              : mediaType === "camera" && firstFrameImageRef.current
                ? `${firstFrameImageRef.current.width}/${firstFrameImageRef.current.height}`
                : "auto",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <video
        ref={videoRef}
        src={mediaType === "video" ? mediaData.url : undefined}
        className="hidden"
        muted
        playsInline
        preload="auto"
      />
      {/* Camera name overlay */}
      {mediaType === "camera" && (
        <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {mediaData.name}
        </div>
      )}
      {showMaximize && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            isMaximized ? onMinimize() : onMaximize();
          }}
          className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
        >
          {isMaximized ? (
            <Minimize className="w-4 h-4 text-white" />
          ) : (
            <Maximize className="w-4 h-4 text-white" />
          )}
        </button>
      )}
      {selectedTool === "fill" &&
        isSelected &&
        (isMaximized || !showMaximize) && (
          <FillColorPicker fillColor={fillColor} setFillColor={setFillColor} />
        )}
      {hoveredShape &&
        selectedTool === "pointer" &&
        (isMaximized || !showMaximize) && (
          <ShapeControls
            hoverStyle={hoverStyle}
            onEdit={(e) => {
              e.stopPropagation();
              handleEditShape();
            }}
            onDelete={(e) => {
              e.stopPropagation();
              handleDeleteShape();
            }}
          />
        )}
      {shapeDialog.isOpen && (
        <RegionModal
          isOpen={shapeDialog.isOpen}
          onClose={closeShapeDialog}
          onSave={handleShapeDialogSave}
          initialValue={shapeDialog.name}
        />
      )}
    </div>
  );
}
