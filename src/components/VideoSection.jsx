import { useEffect, useRef, useState } from "react"
import { Maximize, Minimize, PencilIcon, Trash2 } from "lucide-react"
import RegionModal from "./modals/AddRegionModal";

// Define cursor map similar to DrawCanvasDrawer
const cursorMap = {
  pointer: "cursor-pointer",
  rectangle: "cursor-crosshair",
  fill: "custom-fill",
  caligraphy: "cursor-crosshair", // Add this line
};

// Create a global store to persist playback positions across remounts
const playbackPositions = {};

export default function VideoCanvas({
  videoData,
  isSelected,
  onSelect,
  isMaximized,
  onMaximize,
  onMinimize,
  showMaximize,
  selectedTool,
  shapes = [],
  onShapesChange
}) {
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
    x: 0,
    y: 0,
    shapeId: null,
    name: "",
  });
  const [fillColor, setFillColor] = useState("#6366F1");

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const playbackStateRef = useRef({
    currentTime: 0,
    isInitialized: false
  });

  const [polygonPoints, setPolygonPoints] = useState([]);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [previewPoint, setPreviewPoint] = useState(null);
  const [nearStartPoint, setNearStartPoint] = useState(false);

  // First, add state for canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // --- Resize & render loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size only once when video metadata is loaded
    const handleVideoMetadata = () => {
      if (!canvasDimensions.width && !canvasDimensions.height) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        canvas.width = width;
        canvas.height = height;
        setCanvasDimensions({ width, height });
      }
    };

    video.addEventListener('loadedmetadata', handleVideoMetadata);

    function renderFrame() {
      if (video.readyState >= 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          video,
          0, 0,
          video.videoWidth, video.videoHeight,
          0, 0,
          canvas.width, canvas.height
        );
        drawShapes(ctx, canvas.width, canvas.height);
      }
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      video.removeEventListener('loadedmetadata', handleVideoMetadata);
    };
  }, [isMaximized, shapes, drawingState, selectedShape, hoveredShape, showMaximize, polygonPoints, previewPoint]);

  // --- Keyboard Escape to minimize ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        onMinimize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized, onMinimize]);

  // --- Update nextId when shapes change ---
  useEffect(() => {
    if (shapes.length > 0) {
      setNextId(Math.max(...shapes.map(s => s.id)) + 1);
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
          playbackPositions[videoData.id] = t;
        }
      }
    };
  }, [videoData.id]);

  // --- Coordinate conversion ---
  const getCanvasCoordinates = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return { x: 0, y: 0 };
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // --- Hit test ---
  const findShapeAtPosition = (x, y) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (s.type === "rectangle") {
        const norm = {
          x:      s.width  < 0 ? s.x + s.width   : s.x,
          y:      s.height < 0 ? s.y + s.height  : s.y,
          width:  Math.abs(s.width),
          height: Math.abs(s.height)
        };
        if (
          x >= norm.x &&
          x <= norm.x + norm.width &&
          y >= norm.y &&
          y <= norm.y + norm.height
        ) return s;
      } else if (s.type === "caligraphy") {
        // Basic polygon hit test
        let inside = false;
        for (let j = 0, k = s.points.length - 1; j < s.points.length; k = j++) {
          const xi = s.points[j].x, yi = s.points[j].y;
          const xj = s.points[k].x, yj = s.points[k].y;
          
          if (((yi > y) !== (yj > y)) &&
              (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
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
        // Start new polygon
        setPolygonPoints([{ x, y }]);
        setIsDrawingPolygon(true);
      } else {
        // Check if clicking near start point to close polygon
        const startPoint = polygonPoints[0];
        const distance = Math.hypot(x - startPoint.x, y - startPoint.y);
        
        if (distance < 20 && polygonPoints.length >= 3) {
          // Close the polygon
          const newShape = {
            id: nextId,
            type: "caligraphy",
            points: [...polygonPoints],
            isColored: false
          };
          onShapesChange([...shapes, newShape]);
          setNextId(nextId + 1);
          setPolygonPoints([]);
          setIsDrawingPolygon(false);
          setPreviewPoint(null);
        } else {
          // Add new point
          setPolygonPoints([...polygonPoints, { x, y }]);
        }
      }
    }
    else if (selectedTool === "pointer") {
      setSelectedShape(findShapeAtPosition(x, y));
      setHoveredShape(null);
    } else if (selectedTool === "rectangle") {
      setDrawingState({ isDrawing: true, startX: x, startY: y, currentX: x, currentY: y });
      setSelectedShape(null);
      setShapeDialog({ ...shapeDialog, isOpen: false });
    } else if (selectedTool === "fill" && isSelected) {
      const hit = findShapeAtPosition(x, y);
      if (hit) {
        onShapesChange(shapes.map(s =>
          s.id === hit.id ? { ...s, isColored: true, color: fillColor } : s
        ));
      }
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (selectedTool === "caligraphy" && isDrawingPolygon) {
        setPreviewPoint({ x, y });
        
        // Check if near start point
        if (polygonPoints.length >= 2) {
            const startPoint = polygonPoints[0];
            const distance = Math.hypot(x - startPoint.x, y - startPoint.y);
            setNearStartPoint(distance < 20);
        }
    } else if (drawingState.isDrawing && selectedTool === "rectangle") {
      setDrawingState({ ...drawingState, currentX: x, currentY: y });
    }
    
    if (selectedTool === "pointer" && !drawingState.isDrawing && (isMaximized || !showMaximize)) {
      setHoveredShape(findShapeAtPosition(x, y));
    } else {
      setHoveredShape(null);
    }
  };


  const getPolygonCenter = (points) => {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  };

  const handleMouseUp = (e) => {
    if (!drawingState.isDrawing || selectedTool !== "rectangle") return;
    const { x, y } = getCanvasCoordinates(e);
    const w = x - drawingState.startX;
    const h = y - drawingState.startY;
    if (Math.abs(w) > 5 && Math.abs(h) > 5) {
      onShapesChange([...shapes, {
        id: nextId,
        type: "rectangle",
        x: drawingState.startX,
        y: drawingState.startY,
        width: w,
        height: h,
        isColored: false
      }]);
      setNextId(nextId + 1);
    }
    setDrawingState({ isDrawing: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  };

  // --- Draw shapes ---
  const drawShapes = (ctx) => {
    if (!ctx) return;
    const active = isMaximized || !showMaximize;
    if (!active) return;

    // Draw existing shapes (dashed lines)
    shapes.forEach(s => {
        if (s.type === "rectangle") {
            ctx.strokeStyle = selectedShape?.id === s.id
                ? "#6366F1"
                : hoveredShape?.id === s.id
                    ? "#9CA3AF"
                    : "#FFD700";
            ctx.lineWidth = 5; // Increased line width for all shapes
            ctx.setLineDash([8, 4]); // Apply dashed style to completed shapes
            ctx.strokeRect(s.x, s.y, s.width, s.height);
            
            if (s.isColored) {
                ctx.fillStyle = s.color;
                ctx.fillRect(s.x, s.y, s.width, s.height);
            }
            if (s.name) {
                ctx.setLineDash([]); // Reset dash for text
                ctx.fillStyle = "#00FFFF";
                ctx.font = "12px Ubranist";
                const tw = ctx.measureText(s.name).width;
                ctx.fillText(s.name, s.x + (s.width - tw)/2, s.y + s.height/2 + 7);
                ctx.setLineDash([8, 4]); // Restore dash pattern after text
            }
        } else if (s.type === "caligraphy") {
          ctx.beginPath();
          ctx.strokeStyle = selectedShape?.id === s.id
              ? "#6366F1"
              : hoveredShape?.id === s.id
                  ? "#9CA3AF"
                  : "#FFD700";
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          
          // Draw the polygon lines
          s.points.forEach((point, index) => {
              if (index === 0) {
                  ctx.moveTo(point.x, point.y);
              } else {
                  ctx.lineTo(point.x, point.y);
              }
          });
          
          // Close the path before filling or stroking
          ctx.closePath();
          
          // Fill first if colored
          if (s.isColored) {
              ctx.fillStyle = s.color;
              ctx.fill();
          }
          
          // Then stroke the border
          ctx.stroke();
          
          // Draw the points
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
              ctx.fillText(s.name, center.x - tw/2, center.y);
          }
      }
    });

    // Draw shape being created (same dashed style)
    if (drawingState.isDrawing && selectedTool === "rectangle") {
        const w = drawingState.currentX - drawingState.startX;
        const h = drawingState.currentY - drawingState.startY;
        
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(drawingState.startX, drawingState.startY, w, h);

        // Add semi-transparent fill
        ctx.fillStyle = "rgba(255, 215, 0, 0.1)";
        ctx.fillRect(drawingState.startX, drawingState.startY, w, h);
    }


    if (isDrawingPolygon && polygonPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Draw lines between points
      polygonPoints.forEach((point, index) => {
          if (index === 0) {
              ctx.moveTo(point.x, point.y);
          } else {
              ctx.lineTo(point.x, point.y);
          }
      });
      
      // Draw preview line
      if (previewPoint) {
          ctx.lineTo(previewPoint.x, previewPoint.y);
          
          // Highlight start point if nearby
          if (nearStartPoint) {
              ctx.lineTo(polygonPoints[0].x, polygonPoints[0].y);
          }
      }
      ctx.stroke();
      
      // Draw points with different style for start point
      polygonPoints.forEach((point, index) => {
          ctx.beginPath();
          ctx.fillStyle = index === 0 ? "#FF4444" : "#FFD700";
          ctx.arc(point.x, point.y, index === 0 ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();
      });
  }

    // Reset dash pattern at the end
    ctx.setLineDash([]);
};

  // --- Hover controls style: map from video pixels → CSS pixels ---
  // const hoverStyle = () => {
  //   if (!canvasRef.current || !videoRef.current || !hoveredShape) return {};
    
  //   const rect = canvasRef.current.getBoundingClientRect();
  //   const vw = videoRef.current.videoWidth;
  //   const vh = videoRef.current.videoHeight;
    
  //   // Convert shape coordinates to CSS pixels
  //   const cssX = hoveredShape.x / vw * rect.width;
  //   const cssY = hoveredShape.y / vh * rect.height;
  //   const cssW = hoveredShape.width / vw * rect.width;
    
  //   return {
  //     position: 'absolute',
  //     right: `${rect.width - (cssX + cssW) + 12}px`, // 12px from right edge of shape
  //     top: `${cssY + 12}px`, // 12px from top of shape
  //     zIndex: 10,
  //     display: 'flex',
  //     flexDirection: 'column',
  //     alignItems: 'center',
  //     gap: '8px'
  //   };
  // };



  const hoverStyle = () => {
    if (!canvasRef.current || !videoRef.current || !hoveredShape) return {};
    
    const rect = canvasRef.current.getBoundingClientRect();
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    
    // Calculate position based on shape type
    if (hoveredShape.type === "rectangle") {
      // Convert shape coordinates to CSS pixels
      const cssX = hoveredShape.x / vw * rect.width;
      const cssY = hoveredShape.y / vh * rect.height;
      const cssW = hoveredShape.width / vw * rect.width;
      
      return {
        position: 'absolute',
        right: `${rect.width - (cssX + cssW) + 12}px`,
        top: `${cssY + 12}px`,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      };
    } else if (hoveredShape.type === "caligraphy") {
      // For polygon/caligraphy shapes, use the center point
      const center = getPolygonCenter(hoveredShape.points);
      const cssX = center.x / vw * rect.width;
      const cssY = center.y / vh * rect.height;
      
      return {
        position: 'absolute',
        left: `${cssX + 12}px`,
        top: `${cssY + 12}px`,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      };
    }
    
    return {};
  };
  // --- Edit/Delete handlers ---
  const handleEditShape = () => {
    if (!hoveredShape) return;
    
    let dialogX, dialogY;
    
    if (hoveredShape.type === "rectangle") {
      const norm = {
        x: hoveredShape.width < 0 ? hoveredShape.x + hoveredShape.width : hoveredShape.x,
        y: hoveredShape.height < 0 ? hoveredShape.y + hoveredShape.height : hoveredShape.y,
        width: Math.abs(hoveredShape.width),
        height: Math.abs(hoveredShape.height)
      };
      dialogX = norm.x + norm.width/2;
      dialogY = norm.y + norm.height/2;
    } else if (hoveredShape.type === "caligraphy") {
      const center = getPolygonCenter(hoveredShape.points);
      dialogX = center.x;
      dialogY = center.y;
    }
  
    setShapeDialog({
      isOpen: true,
      x: dialogX,
      y: dialogY,
      shapeId: hoveredShape.id,
      name: hoveredShape.name || ""
    });
    setSelectedShape(hoveredShape);
    setHoveredShape(null);
  };
  
  const handleDeleteShape = () => {
    if (!hoveredShape) return;
    onShapesChange(shapes.filter(s => s.id !== hoveredShape.id));
    setHoveredShape(null);
  };

  const closeShapeDialog = () => setShapeDialog({ ...shapeDialog, isOpen: false });

  const handleShapeDialogSave = (name) => {  // Add name parameter here
    onShapesChange(shapes.map(s => {
      if (s.id === shapeDialog.shapeId) {
        if (s.type === "rectangle") {
          return { ...s, name: name };
        } else if (s.type === "caligraphy") {
          return { ...s, name: name };
        }
      }
      return s;
    }));
    setShapeDialog({ ...shapeDialog, isOpen: false });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
        handleShapeDialogSave();
    }
};


  // const getCursorStyle = () => cursorMap[selectedTool] || "";
  const getCursorStyle = () => {
    if (selectedTool === "caligraphy" && nearStartPoint && polygonPoints.length >= 3) {
        return "cursor-pointer";
    }
    return cursorMap[selectedTool] || "";
};

  return (
    <div
      className={`w-full h-full relative ${isSelected ? 'ring-2 ring-[#7900F3]' : ''}`}
      onClick={() => onSelect(videoData.id)}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full bg-black rounded-lg ${getCursorStyle()}`}
        style={{
          aspectRatio: canvasDimensions.width && canvasDimensions.height 
            ? `${canvasDimensions.width}/${canvasDimensions.height}`
            : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <video
        ref={videoRef}
        src={videoData.url}
        style={{ display: 'none' }}
        preload="auto"
        muted
      />

      {showMaximize && (
        <button
          onClick={e => { e.stopPropagation(); isMaximized ? onMinimize() : onMaximize(); }}
          className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
        >
          {isMaximized
            ? <Minimize className="w-4 h-4 text-white"/>
            : <Maximize className="w-4 h-4 text-white"/>
          }
        </button>
      )}

      {selectedTool === "fill" && isSelected && (isMaximized || !showMaximize) && (
        <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md z-10 flex items-center">
          <label className="text-sm font-medium text-gray-700">Fill Color:</label>
          <input
            type="color"
            value={fillColor}
            onChange={e => setFillColor(e.target.value)}
            className="ml-2 w-8 h-8 border-none cursor-pointer"
          />
        </div>
      )}

      {hoveredShape && selectedTool === "pointer" && (isMaximized || !showMaximize) && (
        <div style={hoverStyle()}>
          <div className="relative group">
            <button
              className="w-8 h-8 rounded-full  flex items-center justify-center shadow-md"
              onClick={e => { e.stopPropagation(); handleEditShape(); }}
            >
             
              <img
              src="/pen.svg"
              alt="live icon"
              className=""
            />
            </button>
            <div className="absolute w-[65px] left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
              Edit Info.
            </div>
          </div>
          <div className="relative group">
            <button
              className="w-7 h-7 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center shadow-md"
              onClick={e => { e.stopPropagation(); handleDeleteShape(); }}
            >
              <Trash2 className="text-indigo-400 w-4 h-4"/>
            </button>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
              Delete
            </div>
          </div>
        </div>
      )}

      {/* add Region modal */}
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
