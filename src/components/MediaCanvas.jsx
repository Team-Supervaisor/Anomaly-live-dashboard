import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Maximize, Minimize, Trash2 } from "lucide-react";
import RegionModal from "./modals/AddRegionModal";
import ShapeControls from "./ShapeControls";
import FillColorPicker from "./FillColorPicker";

const cursorMap = {
  pointer: "cursor-pointer",
  rectangle: "cursor-crosshair",
  fill: "custom-fill",
  caligraphy: "cursor-crosshair",
};

const playbackPositions = {};

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
  // --- Shared state ---
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

  console.log('ismaximzed', isMaximized)

  // --- Camera-specific: first frame image ---
  const firstFrameImageRef = useRef(null);

  // --- Video-specific: canvas dimensions ---
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

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
    return () => video.removeEventListener("loadedmetadata", handleVideoMetadata);
  }, [mediaType, mediaData.url, canvasDimensions.width, canvasDimensions.height]);

  // --- Render loop for both camera and video ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function renderFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (mediaType === "camera") {
        if (firstFrameImageRef.current) {
          const img = firstFrameImageRef.current.image;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } else if (video && video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      } else if (mediaType === "video") {
        if (video && video.readyState >= 2) {
          ctx.drawImage(
            video,
            0, 0,
            video.videoWidth, video.videoHeight,
            0, 0,
            canvas.width, canvas.height
          );
        }
      }
      drawShapes(ctx, canvas.width, canvas.height);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
    renderFrame();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [
    mediaType,
    shapes,
    isMaximized,
    drawingState,
    selectedShape,
    hoveredShape,
    showMaximize,
    polygonPoints,
    previewPoint,
    isDrawingPolygon,
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

  // --- Coordinate conversion ---
const getCanvasCoordinates = (e) => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  if (mediaType === "camera") {
    // Direct mapping for camera
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  } else if (mediaType === "video" && videoRef.current) {
    // Scale for video
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }
  return { x: 0, y: 0 };
};

  // --- Hit test ---
  const findShapeAtPosition = (x, y) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (s.type === "rectangle") {
        const norm = {
          x: s.width < 0 ? s.x + s.width : s.x,
          y: s.height < 0 ? s.y + s.height : s.y,
          width: Math.abs(s.width),
          height: Math.abs(s.height),
        };
        if (
          x >= norm.x &&
          x <= norm.x + norm.width &&
          y >= norm.y &&
          y <= norm.y + norm.height
        )
          return s;
      } else if (s.type === "caligraphy") {
        let inside = false;
        for (let j = 0, k = s.points.length - 1; j < s.points.length; k = j++) {
          const xi = s.points[j].x,
            yi = s.points[j].y;
          const xj = s.points[k].x,
            yj = s.points[k].y;
          if (
            (yi > y) !== (yj > y) &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
          ) {
            inside = !inside;
          }
        }
        if (inside) return s;
      }
    }
    return null;
  };

  // --- Mouse handlers ---
  const handleMouseDown = (e) => {
    if (!selectedTool || (!isMaximized && showMaximize)) return;
    e.stopPropagation();
    const { x, y } = getCanvasCoordinates(e);
    if (selectedTool === "caligraphy") {
      if (!isDrawingPolygon) {
        setPolygonPoints([{ x, y }]);
        setIsDrawingPolygon(true);
      } else {
        const startPoint = polygonPoints[0];
        const distance = Math.hypot(x - startPoint.x, y - startPoint.y);
        if (distance < 20 && polygonPoints.length >= 3) {
          const newShape = {
            id: nextId,
            type: "caligraphy",
            points: [...polygonPoints],
            isColored: false,
          };
          onShapesChange([...shapes, newShape]);
          setNextId(nextId + 1);
          setPolygonPoints([]);
          setIsDrawingPolygon(false);
          setPreviewPoint(null);
        } else {
          setPolygonPoints([...polygonPoints, { x, y }]);
        }
      }
    } else if (selectedTool === "pointer") {
      setSelectedShape(findShapeAtPosition(x, y));
      setHoveredShape(null);
    } else if (selectedTool === "rectangle") {
      setDrawingState({
        isDrawing: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
      setSelectedShape(null);
      setShapeDialog({ ...shapeDialog, isOpen: false });
    } else if (selectedTool === "fill" && isSelected) {
      const hit = findShapeAtPosition(x, y);
      if (hit) {
        onShapesChange(
          shapes.map((s) =>
            s.id === hit.id ? { ...s, isColored: true, color: fillColor } : s
          )
        );
      }
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasCoordinates(e);
    if (selectedTool === "caligraphy" && isDrawingPolygon) {
      setPreviewPoint({ x, y });
      if (polygonPoints.length >= 2) {
        const startPoint = polygonPoints[0];
        const distance = Math.hypot(x - startPoint.x, y - startPoint.y);
        setNearStartPoint(distance < 20);
      }
    } else if (drawingState.isDrawing && selectedTool === "rectangle") {
      setDrawingState({ ...drawingState, currentX: x, currentY: y });
    }
    if (
      selectedTool === "pointer" &&
      !drawingState.isDrawing &&
      (isMaximized || !showMaximize)
    ) {
      setHoveredShape(findShapeAtPosition(x, y));
    } else {
      setHoveredShape(null);
    }
  };

  const handleMouseUp = (e) => {
    if (!drawingState.isDrawing || selectedTool !== "rectangle") return;
    const { x, y } = getCanvasCoordinates(e);
    const w = x - drawingState.startX;
    const h = y - drawingState.startY;
    if (Math.abs(w) > 5 && Math.abs(h) > 5) {
      onShapesChange([
        ...shapes,
        {
          id: nextId,
          type: "rectangle",
          x: drawingState.startX,
          y: drawingState.startY,
          width: w,
          height: h,
          isColored: false,
        },
      ]);
      setNextId(nextId + 1);
    }
    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  };

  // --- Draw shapes ---
  const drawShapes = (ctx, width, height) => {
    if (!ctx) return;

    if (!isMaximized && showMaximize) return;

    const active = isMaximized || !showMaximize;
    if (!active) return;
    shapes.forEach((s) => {
      if (s.type === "rectangle") {
        ctx.strokeStyle =
          selectedShape?.id === s.id
            ? "#6366F1"
            : hoveredShape?.id === s.id
            ? "#9CA3AF"
            : "#FFD700";
        ctx.lineWidth = 5;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(s.x, s.y, s.width, s.height);
        if (s.isColored) {
          ctx.fillStyle = s.color;
          ctx.fillRect(s.x, s.y, s.width, s.height);
        }
        if (s.name) {
          ctx.setLineDash([]);
          ctx.fillStyle = "#00FFFF";
          ctx.font = "12px Urbanist";
          const tw = ctx.measureText(s.name).width;
          ctx.fillText(s.name, s.x + (s.width - tw) / 2, s.y + s.height / 2 + 7);
          ctx.setLineDash([8, 4]);
        }
      } else if (s.type === "caligraphy") {
        ctx.beginPath();
        ctx.strokeStyle =
          selectedShape?.id === s.id
            ? "#6366F1"
            : hoveredShape?.id === s.id
            ? "#9CA3AF"
            : "#FFD700";
        ctx.lineWidth = 5;
        ctx.setLineDash([8, 4]);
        s.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        if (s.isColored) {
          ctx.fillStyle = s.color;
          ctx.fill();
        }
        ctx.stroke();
        s.points.forEach((point, index) => {
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.fillStyle = index === 0 ? "#FF4444" : "#FFD700";
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;
          ctx.arc(point.x, point.y, index === 0 ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        if (s.name) {
          const center = getPolygonCenter(s.points);
          ctx.setLineDash([]);
          ctx.fillStyle = "#00FFFF";
          ctx.font = "12px Urbanist";
          const tw = ctx.measureText(s.name).width;
          ctx.fillText(s.name, center.x - tw / 2, center.y);
        }
      }
    });
    // Draw shape being created (rectangle)
    if (drawingState.isDrawing && selectedTool === "rectangle") {
      const w = drawingState.currentX - drawingState.startX;
      const h = drawingState.currentY - drawingState.startY;
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(drawingState.startX, drawingState.startY, w, h);
      ctx.fillStyle = "rgba(255, 215, 0, 0.1)";
      ctx.fillRect(drawingState.startX, drawingState.startY, w, h);
    }
    // Draw shape being created (polygon)
    if (isDrawingPolygon && polygonPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      polygonPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      if (previewPoint) {
        ctx.lineTo(previewPoint.x, previewPoint.y);
        if (nearStartPoint) {
          ctx.lineTo(polygonPoints[0].x, polygonPoints[0].y);
        }
      }
      ctx.stroke();
      polygonPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.fillStyle = index === 0 ? "#FF4444" : "#FFD700";
        ctx.arc(point.x, point.y, index === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.setLineDash([]);
  };

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
  const closeShapeDialog = () => setShapeDialog({ ...shapeDialog, isOpen: false });
  const handleShapeDialogSave = (name) => {
    onShapesChange(
      shapes.map((s) =>
        s.id === shapeDialog.shapeId ? { ...s, name: name } : s
      )
    );
    setShapeDialog({ ...shapeDialog, isOpen: false });
  };

  // --- Cursor style ---
  const getCursorStyle = () => {
    if (selectedTool === "caligraphy" && nearStartPoint && polygonPoints.length >= 2) {
      return "cursor-pointer";
    }
    return cursorMap[selectedTool] || "";
  };

  // --- Hover controls style ---
  const getPolygonCenter = (points) => {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  };
  const hoverStyle = () => {
    if (!canvasRef.current || !videoRef.current || !hoveredShape) return {};
    const rect = canvasRef.current.getBoundingClientRect();
    let vw = rect.width, vh = rect.height;
    if (mediaType === "video" && videoRef.current) {
      vw = videoRef.current.videoWidth;
      vh = videoRef.current.videoHeight;
    }
    if (hoveredShape.type === "rectangle") {
      const cssX = hoveredShape.x / vw * rect.width;
      const cssY = hoveredShape.y / vh * rect.height;
      const cssW = hoveredShape.width / vw * rect.width;
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
      const cssX = center.x / vw * rect.width;
      const cssY = center.y / vh * rect.height;
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

  // --- Render ---
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
        (mediaType === "video" && canvasDimensions.width && canvasDimensions.height)
            ? `${canvasDimensions.width}/${canvasDimensions.height}`
            : (mediaType === "camera" && firstFrameImageRef.current)
            ? `${firstFrameImageRef.current.width}/${firstFrameImageRef.current.height}`
            : 'auto'
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
      {selectedTool === "fill" && isSelected && (isMaximized || !showMaximize) && (
        <FillColorPicker fillColor={fillColor} setFillColor={setFillColor} />
      )}
      {hoveredShape && selectedTool === "pointer" && (isMaximized || !showMaximize) && (
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