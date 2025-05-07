import { useEffect, useRef, useState } from "react"
import { Maximize, Minimize, PencilIcon, Trash2 } from "lucide-react"

// Define cursor map similar to DrawCanvasDrawer
const cursorMap = {
  pointer: "cursor-pointer",
  rectangle: "cursor-crosshair",
  fill: "custom-fill",
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

  // --- Resize & render loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };
    resizeCanvas();

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

    window.addEventListener('resize', resizeCanvas);
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isMaximized, shapes, drawingState, selectedShape, hoveredShape, showMaximize]);

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
      }
    }
    return null;
  };

  // --- Mouse handlers ---
  const handleMouseDown = (e) => {
    if (!selectedTool || (!isMaximized && showMaximize)) return;
    e.stopPropagation();
    const { x, y } = getCanvasCoordinates(e);
    if (selectedTool === "pointer") {
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
    if (drawingState.isDrawing && selectedTool === "rectangle") {
      setDrawingState({ ...drawingState, currentX: x, currentY: y });
    }
    if (selectedTool === "pointer" && !drawingState.isDrawing && (isMaximized || !showMaximize)) {
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

    // Reset dash pattern at the end
    ctx.setLineDash([]);
};

  // --- Hover controls style: map from video pixels → CSS pixels ---
  const hoverStyle = () => {
    if (!canvasRef.current || !videoRef.current || !hoveredShape) return {};
    const rect = canvasRef.current.getBoundingClientRect();
    const vw   = videoRef.current.videoWidth;
    const vh   = videoRef.current.videoHeight;
    const cssX = hoveredShape.x / vw * rect.width;
    const cssY = hoveredShape.y / vh * rect.height;
    const cssW = hoveredShape.width / vw * rect.width;
    return {
      position: 'absolute',
      left: `${cssX + cssW - 35}px`,
      top:  `${cssY + 5}px`,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    };
  };

  // --- Edit/Delete handlers ---
  const handleEditShape = () => {
    if (!hoveredShape) return;
    const norm = {
      x: hoveredShape.width < 0 ? hoveredShape.x + hoveredShape.width : hoveredShape.x,
      y: hoveredShape.height< 0 ? hoveredShape.y + hoveredShape.height: hoveredShape.y,
      width: Math.abs(hoveredShape.width),
      height: Math.abs(hoveredShape.height)
    };
    setShapeDialog({
      isOpen: true,
      x: norm.x + norm.width/2,
      y: norm.y + norm.height/2,
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

  const handleShapeDialogSave = () => {
    onShapesChange(shapes.map(s =>
      s.id === shapeDialog.shapeId
        ? { ...s, name: shapeDialog.name }
        : s
    ));
    setShapeDialog({ ...shapeDialog, isOpen: false });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
        handleShapeDialogSave();
    }
};


  const getCursorStyle = () => cursorMap[selectedTool] || "";

  return (
    <div
      className={`w-full h-full relative ${isSelected ? 'ring-2 ring-[#7900F3]' : ''}`}
      onClick={() => onSelect(videoData.id)}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full bg-black rounded-lg ${getCursorStyle()}`}
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
              className="w-8 h-8 rounded-full bg-indigo-400 hover:bg-indigo-500 flex items-center justify-center shadow-md"
              onClick={e => { e.stopPropagation(); handleEditShape(); }}
            >
              <PencilIcon className="text-white w-4 h-4"/>
            </button>
            <div className="absolute w-[65px] left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
              Edit Info.
            </div>
          </div>
          <div className="relative group">
            <button
              className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center shadow-md"
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

      {shapeDialog.isOpen && (
    <div
        className="absolute bg-white p-4 rounded-2xl shadow-xl w-[320px] z-100"
        style={{
          left: `${Math.max(175, Math.min(shapeDialog.x, canvasRef.current.width - 175))}px`,
          top:  `${Math.max(110, Math.min(shapeDialog.y - 50, canvasRef.current.height - 110))}px`,
            transform: "translate(-50%, -50%)",
            border: "1px solid #E5E7EB",
            backgroundColor: "#F8FAFC",
        }}
    >
        <div className="flex flex-col gap-5">
            <div className="space-y-2">
                <label className="block font-medium text-gray-700 text-sm">
                    Region Name
                </label>
                <input
                    type="text"
                    placeholder="Enter region name"
                    value={shapeDialog.name}
                    onKeyDown={handleKeyPress}
                    onChange={e => setShapeDialog({ ...shapeDialog, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg 
                             focus:outline-none focus:border-[#6366F1] focus:ring-1 
                             focus:ring-[#6366F1] text-gray-800 text-sm
                             placeholder:text-gray-400 transition-colors"
                />
            </div>
            <div className="flex justify-end gap-3">
                <button
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm 
                               text-gray-700 hover:bg-gray-50 transition-colors
                               focus:outline-none focus:ring-2 focus:ring-offset-1
                               focus:ring-gray-200"
                    onClick={closeShapeDialog}
                >
                    Cancel
                </button>
                <button
                    className="px-4 py-2 bg-[#6366F1] text-white rounded-lg text-sm
                               hover:bg-[#5558E3] transition-colors
                               focus:outline-none focus:ring-2 focus:ring-offset-1
                               focus:ring-[#6366F1]"
                    onClick={handleShapeDialogSave}
                >
                    Save
                </button>
            </div>
        </div>
    </div>
    )}
    </div>
  );
}
