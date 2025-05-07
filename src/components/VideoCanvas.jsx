import { useEffect, useRef, useState } from "react"
import Hls from 'hls.js'
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
    cameraData, 
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
    const canvasRef = useRef(null)
    const videoRef = useRef(null)
    const hlsRef = useRef(null)
    const animationFrameRef = useRef(null)
    const [isVideoPlaying, setIsVideoPlaying] = useState(false)
    
    // Store playback state in a ref to persist across renders
    const playbackStateRef = useRef({
        currentTime: playbackPositions[cameraData.id] || 0,
        isInitialized: false
    })
    
    // Drawing state
    const [nextId, setNextId] = useState(1)
    const [drawingState, setDrawingState] = useState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
    })
    const [selectedShape, setSelectedShape] = useState(null)
    const [hoveredShape, setHoveredShape] = useState(null)
    const [shapeDialog, setShapeDialog] = useState({
        isOpen: false,
        x: 0,
        y: 0,
        shapeId: null,
        name: "",
    })
    const [fillColor, setFillColor] = useState("#6366F1")

    // Setup video rendering loop
    useEffect(() => {
        const canvas = canvasRef.current
        const video = videoRef.current
        
        if (!canvas || !video) return

        const ctx = canvas.getContext('2d')
        
        // Set canvas size to match container
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
        }
        resizeCanvas()

        // Animation loop for smooth rendering
        function renderFrame() {
            if (video.readyState >= 2) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                
                // Draw shapes on top of the video
                drawShapes(ctx, canvas.width, canvas.height)
            }
            animationFrameRef.current = requestAnimationFrame(renderFrame)
        }

        // Start render loop
        renderFrame()

        // Handle window resize to ensure canvas dimensions are correct
        const handleResize = () => {
            resizeCanvas()
        }
        
        window.addEventListener('resize', handleResize)

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            window.removeEventListener('resize', handleResize)
        }
    }, [isMaximized, shapes, drawingState, selectedShape, hoveredShape]) // Re-run on maximize state change or shapes change

    // Add keyboard event listener for Escape key to minimize
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isMaximized && onMinimize) {
                onMinimize();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMaximized, onMinimize]);

    // Draw all shapes on the canvas
    const drawShapes = (ctx, width, height) => {
        if (!ctx) return
        
        // Only draw shapes when maximized or when there's only one stream
        // We can determine if it's the only stream by checking if showMaximize is false
        if (!isMaximized && showMaximize) return;
        
        // Draw all existing shapes
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
        
        // Draw shape being created
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
        ctx.setLineDash([]);

    }

    // Find the next available ID for a new shape
    useEffect(() => {
        if (shapes.length > 0) {
            const maxId = Math.max(...shapes.map(shape => shape.id));
            setNextId(maxId + 1);
        } else {
            setNextId(1);
        }
    }, [shapes]);


    // HLS setup
    useEffect(() => {
        const video = videoRef.current
        if (!video || !cameraData.hlsUrl) return

        if (Hls.isSupported()) {
            // Store current time before setting up new HLS instance
            if (hlsRef.current && videoRef.current) {
                playbackStateRef.current.currentTime = videoRef.current.currentTime
                playbackPositions[cameraData.id] = videoRef.current.currentTime
            }
            
            const hls = new Hls({
                maxBufferSize: 30 * 1000 * 1000, // 30MB buffer
                maxBufferLength: 60, // 60 seconds buffer
                enableWorker: true, // Enable web worker
                lowLatencyMode: true, // Enable low latency mode
                backBufferLength: 90, // 90 seconds backward buffer
                startPosition: playbackStateRef.current.currentTime // Start from saved position
            })

            hlsRef.current = hls

            hls.loadSource(cameraData.hlsUrl)
            hls.attachMedia(video)

            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                // Only set the time if we've played before
                if (playbackStateRef.current.isInitialized && 
                    playbackStateRef.current.currentTime > 0) {
                    video.currentTime = playbackStateRef.current.currentTime
                }
                
                video.play()
                    .then(() => {
                        setIsVideoPlaying(true)
                        playbackStateRef.current.isInitialized = true
                    })
                    .catch(err => console.error("Play failed:", err))
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError()
                            break
                        default:
                            hls.destroy()
                            break
                    }
                }
            })
            
            // Store current time periodically to maintain position
            const timeUpdateHandler = () => {
                if (video.currentTime > 0) {
                    playbackStateRef.current.currentTime = video.currentTime
                    playbackPositions[cameraData.id] = video.currentTime
                }
            }
            
            video.addEventListener('timeupdate', timeUpdateHandler)

            return () => {
                video.removeEventListener('timeupdate', timeUpdateHandler)
                // Don't destroy HLS here to maintain state between renders
            }
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = cameraData.hlsUrl
            video.addEventListener('loadedmetadata', () => {
                if (playbackStateRef.current.currentTime > 0) {
                    video.currentTime = playbackStateRef.current.currentTime
                }
                video.play()
                    .then(() => setIsVideoPlaying(true))
                    .catch(err => console.error("Play failed:", err))
            })
        }
    }, [cameraData.hlsUrl, cameraData.id]) // Re-run if URL changes

    // Save playback position before unmount
    useEffect(() => {
        return () => {
            if (videoRef.current) {
                const currentTime = videoRef.current.currentTime
                if (currentTime > 0) {
                    playbackStateRef.current.currentTime = currentTime
                    playbackPositions[cameraData.id] = currentTime
                }
            }
            
            if (hlsRef.current) {
                hlsRef.current.destroy()
                hlsRef.current = null
            }
        }
    }, [cameraData.id])

    // Get canvas coordinates from mouse event
    const getCanvasCoordinates = (e) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return { x: 0, y: 0 }
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        return { x, y }
    }

    // Find shape at position
    const findShapeAtPosition = (x, y) => {
        for (let i = shapes.length - 1; i >= 0; i--) {
            const shape = shapes[i]
            
            if (shape.type === "rectangle") {
                // Normalize rectangle coordinates for hit testing
                const normalizedRect = {
                    x: shape.width < 0 ? shape.x + shape.width : shape.x,
                    y: shape.height < 0 ? shape.y + shape.height : shape.y,
                    width: Math.abs(shape.width),
                    height: Math.abs(shape.height)
                }
                
                if (
                    x >= normalizedRect.x && 
                    x <= normalizedRect.x + normalizedRect.width && 
                    y >= normalizedRect.y && 
                    y <= normalizedRect.y + normalizedRect.height
                ) {
                    return shape
                }
            }
        }
        return null
    }

    // Handle mouse down event
    const handleMouseDown = (e) => {
        // Allow drawing when maximized or when there's only one stream (showMaximize is false)
        if (!selectedTool || (!isMaximized && showMaximize)) return
        
        e.stopPropagation() // Prevent triggering parent onClick
        const { x, y } = getCanvasCoordinates(e)
        
        if (selectedTool === "pointer") {
            const clickedShape = findShapeAtPosition(x, y)
            setHoveredShape(null)
            setSelectedShape(clickedShape)
        } else if (selectedTool === "rectangle") {
            setDrawingState({
                isDrawing: true,
                startX: x,
                startY: y,
                currentX: x,
                currentY: y,
            })
            setSelectedShape(null)
            setShapeDialog({ ...shapeDialog, isOpen: false })
        } else if (selectedTool === "fill" && isSelected) {
            handleFill(x, y)
        }
    }

    // Handle mouse move event
    const handleMouseMove = (e) => {
        const { x, y } = getCanvasCoordinates(e)
        
        // Update drawing state if currently drawing
        if (drawingState.isDrawing && selectedTool === "rectangle") {
            setDrawingState({
                ...drawingState,
                currentX: x,
                currentY: y,
            })
        }
        
        // Handle hover for pointer tool - only when maximized or single stream
        if (selectedTool === "pointer" && !drawingState.isDrawing && (isMaximized || !showMaximize)) {
            const hoverShape = findShapeAtPosition(x, y)
            setHoveredShape(hoverShape)
        } else {
            // Clear hovered shape when not in pointer mode or when in grid view
            setHoveredShape(null)
        }
    }

    // Handle mouse up event
    const handleMouseUp = (e) => {
        if (!drawingState.isDrawing || selectedTool !== "rectangle") return
        
        const { x, y } = getCanvasCoordinates(e)
        const width = x - drawingState.startX
        const height = y - drawingState.startY
        
        // Only create rectangle if it has a reasonable size
        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
            const newRectangle = {
                id: nextId,
                type: "rectangle",
                x: drawingState.startX,
                y: drawingState.startY,
                width: width,
                height: height,
                isColored: false,
            }
            
            const updatedShapes = [...shapes, newRectangle];
            onShapesChange(updatedShapes);
            setNextId(nextId + 1)
        }
        
        setDrawingState({
            isDrawing: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
        })
    }

    // Handle fill tool
    const handleFill = (x, y) => {
        const clickedShape = findShapeAtPosition(x, y)
        
        if (clickedShape) {
            // Update the shape's color
            const updatedShapes = shapes.map(shape => 
                shape.id === clickedShape.id 
                    ? { ...shape, color: fillColor, isColored: true } 
                    : shape
            )
            
            onShapesChange(updatedShapes)
        }
    }

    // Handle edit shape
    const handleEditShape = () => {
        if (!hoveredShape) return
        
        // Calculate the center of the rectangle for dialog positioning
        const normalizedRect = {
            x: hoveredShape.width < 0 ? hoveredShape.x + hoveredShape.width : hoveredShape.x,
            y: hoveredShape.height < 0 ? hoveredShape.y + hoveredShape.height : hoveredShape.y,
            width: Math.abs(hoveredShape.width),
            height: Math.abs(hoveredShape.height)
        }
        
        const centerX = normalizedRect.x + (normalizedRect.width / 2)
        const centerY = normalizedRect.y + (normalizedRect.height / 2)
        
        setShapeDialog({
            isOpen: true,
            x: centerX,
            y: centerY,
            shapeId: hoveredShape.id,
            name: hoveredShape.name || "",
        })
        
        setSelectedShape(hoveredShape)
        setHoveredShape(null)
    }
    
    // Handle delete shape
    const handleDeleteShape = () => {
        if (!hoveredShape) return
        
        // Remove the shape
        const updatedShapes = shapes.filter(shape => shape.id !== hoveredShape.id)
        onShapesChange(updatedShapes)
        setHoveredShape(null)
    }
    
    // Handle shape dialog save
    const handleShapeDialogSave = () => {
        // Update the shape with the new name
        const updatedShapes = shapes.map(shape => 
            shape.id === shapeDialog.shapeId
                ? { ...shape, name: shapeDialog.name }
                : shape
        )
        
        onShapesChange(updatedShapes)
        setShapeDialog({ ...shapeDialog, isOpen: false })
    }
    
    // Close shape dialog
    const closeShapeDialog = () => {
        setShapeDialog({ ...shapeDialog, isOpen: false })
    }

    // Get cursor style based on selected tool
    const getCursorStyle = () => {
        return cursorMap[selectedTool] || "";
    }


    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleShapeDialogSave();
        }
    };

    return (
        <div 
            className={`w-full h-full relative ${
                isSelected ? 'ring-2 ring-[#7900F3]' : ''
            }`}
            onClick={() => onSelect(cameraData.id)}
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
                // className="hidden"
                muted
                playsInline
            />
            
            {/* Camera name */}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {cameraData.name}
            </div>

            {showMaximize && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        isMaximized ? onMinimize() : onMaximize()
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
            
            {/* Fill color selector - only show when maximized or single stream */}
            {selectedTool === "fill" && isSelected && (isMaximized || !showMaximize) && (
                <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md z-10 flex items-center">
                    <label className="text-sm font-medium text-gray-700">Fill Color:</label>
                    <input
                        type="color"
                        value={fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="ml-2 w-8 h-8 border-none cursor-pointer"
                    />
                </div>
            )}
            
            {/* Hover controls - only show when maximized or single stream */}
            {hoveredShape && selectedTool === "pointer" && (isMaximized || !showMaximize) && (
                <div
                    style={{
                        position: "absolute",
                        left: hoveredShape.x + hoveredShape.width + 2 > canvasRef.current?.width - 50 
                            ? hoveredShape.x - 33 
                            : hoveredShape.x + hoveredShape.width - 35,
                        top: hoveredShape.y + 2,
                        zIndex: 10,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <div className="relative group">
                        <button
                            className="w-8 h-8 rounded-full bg-indigo-400 hover:bg-indigo-500 flex items-center justify-center shadow-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditShape();
                            }}
                        >
                            <PencilIcon className="text-white w-4 h-4" />
                        </button>
                        <div className="absolute w-[65px] left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
                            Edit Info.
                        </div>
                    </div>
                
                    <div className="relative group">
                        <button
                            className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center shadow-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteShape();
                            }}
                        >
                            <Trash2 className="text-indigo-400 w-4 h-4" />
                        </button>
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
                            Delete
                        </div>
                    </div>
                </div>
            )}
            
            {/* Shape dialog for editing */}
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
    )
}