import { useEffect } from "react";


export default function useCanvasDrawing({
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
  getPolygonCenter

}) {
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

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    drawShapes, 
    findShapeAtPosition,
    getCanvasCoordinates,
  };
}