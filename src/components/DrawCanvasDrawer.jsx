import { useEffect, useRef, useState } from "react"
import ToolBar from "./tool-bar"
import { ChevronDown, X, PencilIcon, Trash2 } from "lucide-react"
import { useAppContext } from '../context';
import Hls from 'hls.js'

const tagOptions = [
  { id: "cashier", title: "Cashier", color: "#FFD6C3" },
  { id: "open space", title: "Open Space", color: "#FFF7CD" },
  { id: "table", title: "Table", color: "#D4E5FC" },
  { id: "entry gate", title: "Entry Gate", color: "#BAE5AF91" },
];


const cursorMap = {
  pointer: "cursor-pointer",
  rectangle: "cursor-crosshair",
  delete: 'custom-bin',
  fill: 'custom-fill',
};

const tagBorderStyles = {
  "open space": {
    color: "#EEA74C",
    style: [5, 3] // dash pattern
  },
  "cashier": {
    color: "#E76024",
    style: [5, 3]
  },
  "table": {
    color: "#11458D",
    style: [5, 3]
  },
  "entry gate": {
    color: "#2C9717",
    style: [5, 3]
  }
};



export default function DrawingCanvas({data} ) {
  const canvasRef = useRef(null)
  const { streamDetails } = useAppContext();
  const videoRef = useRef(null);
  const [fillColor, setFillColor] = useState("#000000")
  const [ctx, setCtx] = useState(null)
  const [hoveredShape, setHoveredShape] = useState(null);
  const [selectedTool, setSelectedTool] = useState("rectangle")
  const [shapes, setShapes] = useState([])
  const [nextId, setNextId] = useState(1)

  const [drawingState, setDrawingState] = useState({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  })
  const [textInput, setTextInput] = useState({
    isActive: false,
    x: 0,
    y: 0,
    text: "",
  })
  const [selectedShape, setSelectedShape] = useState(null)
  const [shapeDialog, setShapeDialog] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    shapeId: null,
    name: "",
    instruction: "",
    tag: "",
    visibility: "",
  })
  // Track all selected instructions to manage availability

  // Replace the static canvas dimensions with state
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth * 0.95,
    height: window.innerHeight * 0.88
  });

  const [isOpenSpaceMode, setIsOpenSpaceMode] = useState(false);

  // console.log("Stream URL:", cameraUrl);

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    const context = canvas.getContext("2d")
    if (context) {
      context.lineCap = "round"
      context.lineJoin = "round"
      setCtx(context)
    }
  }, [])


  useEffect(() => {
    if (!data.playlistUrl) return;


    console.log("Stream URL:", data.playlistUrl);
    
    const video = videoRef.current;
    if (!video) return;

    let hls = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(data.playlistUrl);
      hls.attachMedia(video);
      
      // Add error handling and logging
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
      });
      
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS Media Attached');
      });
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS Manifest Parsed');
        video.play().catch(err => console.error('Video play error:', err));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = data.playlistUrl;
    }

    video.addEventListener('loadeddata', () => {
      console.log('Video loaded');
    });

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
}, [streamDetails]);

  // useEffect(() => {
  //   if (!streamDetails?.playlistUrl) return;

  //   console.log("Stream URL:", streamDetails.playlistUrl);
    
  //   const video = videoRef.current;
  //   if (!video) return;

  //   let hls = null;

  //   if (Hls.isSupported()) {
  //     hls = new Hls();
  //     hls.loadSource(streamDetails.playlistUrl);
  //     hls.attachMedia(video);
  //   } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  //     video.src = streamDetails.playlistUrl;
  //   }

  //   return () => {
  //     if (hls) {
  //       hls.destroy();
  //     }
  //   };
  // }, [streamDetails]);

  useEffect(() => {
    if (!ctx || !canvasRef.current) return;

    let animationFrameId;

    const render = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw video frame if video is ready
      if (videoRef.current?.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, canvasSize.width, canvasSize.height);
      }

      ctx.save();
      ctx.translate(canvasSize.width / 2, canvasSize.height / 2);

 


  shapes.forEach((shape) => {
    if (shape.type === "rectangle" && shape.isOpenSpace) {
      // Create clipping region from non-open space shapes
      ctx.save();
      ctx.beginPath();
      
      // Start with full canvas
      ctx.rect(-canvasSize.width/2, -canvasSize.height/2, canvasSize.width, canvasSize.height);
      
      // Subtract all regular shapes and walls
      shapes.forEach(otherShape => {
        if ((otherShape.type === "rectangle" || otherShape.type === "brick") && !otherShape.isOpenSpace) {
          ctx.rect(otherShape.x, otherShape.y, otherShape.width, otherShape.height);
        }
      });
      
      ctx.clip("evenodd"); // Use even-odd rule for clipping

      // Draw open space with transparent yellow
      ctx.fillStyle = "rgba(255, 243, 168, 0.3)";
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);


      if (shape.name) {
        ctx.fillStyle = "#000000";
        ctx.font = "14px Arial";
        const textWidth = ctx.measureText(shape.name).width;
        const textHeight = 14;
        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        
        // Save context before drawing text
        ctx.save();
        // Draw text above the clipping mask
        ctx.restore();
        ctx.fillText(
          shape.name,
          centerX - textWidth / 2,
          centerY + textHeight / 2
        );
      }
      
      ctx.restore();
    }
  });

    // Then draw regular shapes and walls
    shapes.forEach((shape) => {
      if ((shape.type === "rectangle" || shape.type === "brick") && !shape.isOpenSpace) {
        // Set border style based on tag
        if (shape.tag && tagBorderStyles[shape.tag]) {
          ctx.strokeStyle = tagBorderStyles[shape.tag].color;
          ctx.setLineDash(tagBorderStyles[shape.tag].style);
        } else if (selectedShape && selectedShape.id === shape.id) {
          ctx.strokeStyle = "#6366F1";
          ctx.setLineDash([]); // solid line for selected shape
        } else {
          ctx.strokeStyle = "#000000";
          ctx.setLineDash([]); // solid line for untagged shapes
        }
        
        ctx.lineWidth = 2;
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        
        // Reset line dash to prevent affecting other drawings
        ctx.setLineDash([]);

        // Fill color logic remains the same
        if (shape.isColored) {
          ctx.fillStyle = shape.color;
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }

        // Draw ID text
        ctx.fillStyle = "#000000"
        ctx.font = "12px Arial"

        // Draw name if it exists

        if (shape.isBricked) {
          // Normalize rectangle coordinates for proper filling
          const normalizedRect = {
            x: shape.width < 0 ? shape.x + shape.width : shape.x,
            y: shape.height < 0 ? shape.y + shape.height : shape.y,
            width: Math.abs(shape.width),
            height: Math.abs(shape.height),
          };

          // Save the current context state
          ctx.save();

          // Create a clipping path for the rectangle
          ctx.beginPath();
          ctx.rect(
            normalizedRect.x,
            normalizedRect.y,
            normalizedRect.width,
            normalizedRect.height
          );
          ctx.clip();

          // Set the brick color
          ctx.fillStyle = "#8897F1";

          // Draw the brick pattern within the clipped area
          const brickWidth = 20;
          const brickHeight = 10;

          for (
            let y = normalizedRect.y;
            y < normalizedRect.y + normalizedRect.height;
            y += brickHeight * 2
          ) {
            // First row of bricks
            for (
              let x = normalizedRect.x;
              x < normalizedRect.x + normalizedRect.width;
              x += brickWidth
            ) {
              ctx.fillRect(x, y, brickWidth - 2, brickHeight - 1);
            }

            // Second row of bricks (offset)
            for (
              let x = normalizedRect.x - brickWidth / 2;
              x < normalizedRect.x + normalizedRect.width;
              x += brickWidth
            ) {
              ctx.fillRect(x, y + brickHeight, brickWidth - 2, brickHeight - 1);
            }
          }

          // Restore the context to remove the clipping path
          ctx.restore();
        }

        if (shape.isColored) {
          ctx.fillStyle = shape.color;
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }

        if (shape.name) {
          ctx.fillStyle = "#000000"
          ctx.font = "14px Arial"
          const textWidth = ctx.measureText(shape.name).width;
          const textHeight = 14; // Approximate text height for 14px font
          const centerX = shape.x + shape.width / 2;
          const centerY = shape.y + shape.height / 2;
          ctx.fillText(
            shape.name,
            centerX - textWidth / 2,
            centerY + textHeight / 2
          );
        }
      } else if (shape.type === "text") {
        ctx.fillStyle = selectedShape && selectedShape.id === shape.id ? "#6366F1" : "#000000"
        ctx.font = "16px Arial"
        ctx.fillText(shape.text, shape.x, shape.y)
      }
      else if(shape.type === "circle"){
        console.log(shape)
        if (shape.tag && tagBorderStyles[shape.tag]) {
          ctx.strokeStyle = tagBorderStyles[shape.tag].color;
          ctx.setLineDash(tagBorderStyles[shape.tag].style);
        } else if (selectedShape && selectedShape.id === shape.id) {
          ctx.strokeStyle = "#6366F1";
          ctx.setLineDash([]); // solid line for selected shape
        } else {
          ctx.strokeStyle = "#000000";
          ctx.setLineDash([]); // solid line for untagged shapes
        }
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        if (shape.isColored) {
          ctx.fillStyle = shape.color;
          ctx.fill();
        }
        ctx.stroke();
        if (shape.name) {
          ctx.fillStyle = "#000000"
          ctx.font = "14px Arial"
          const textWidth = ctx.measureText(shape.name).width;
          const textHeight = 14; // Approximate text height for 14px font
          const centerX = shape.x;
          const centerY = shape.y;
          ctx.fillText(
            shape.name,
            centerX - textWidth / 2,
            centerY + textHeight / 2
          );
        }
      }
    })

    

   
    if (drawingState.isDrawing && (selectedTool === "rectangle" || selectedTool === "walls")) {
      const width = drawingState.currentX - drawingState.startX
      const height = drawingState.currentY - drawingState.startY

      ctx.strokeStyle = "rgba(99, 102, 241, 0.6)"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.strokeRect(drawingState.startX, drawingState.startY, width, height)

      ctx.fillStyle = "rgba(99, 102, 241, 0.1)"
      ctx.fillRect(drawingState.startX, drawingState.startY, width, height)

      ctx.setLineDash([])
    }

    if(drawingState.isDrawing && selectedTool === "circle"){
      const radius = Math.sqrt(
        Math.pow(drawingState.currentX - drawingState.startX, 2) +
        Math.pow(drawingState.currentY - drawingState.startY, 2)
      );
      ctx.strokeStyle = "rgba(99, 102, 241, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(drawingState.startX, drawingState.startY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // drawRulers(ctx);

    // if(clickPosition){
    //   const { x: canvasX, y: canvasY } = clickPosition;
    //   console.log(canvasX, canvasY)
    //   const size = 5; // Length of half the plus lines

    //   ctx.strokeStyle = "red";
    //   ctx.lineWidth = 2;
  
    //   // Vertical line
    //   ctx.beginPath();
    //   ctx.moveTo(canvasX, canvasY - size);
    //   ctx.lineTo(canvasX, canvasY + size);
    //   ctx.stroke();
  
    //   // Horizontal line
    //   ctx.beginPath();
    //   ctx.moveTo(canvasX - size, canvasY);
    //   ctx.lineTo(canvasX + size, canvasY);
    //   ctx.stroke();
    // }

    // Rest of your existing drawing code...
    ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [shapes, ctx, drawingState, selectedShape]);

  const getCustomCoordinates = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const x = e.clientX - rect.left - canvasSize.width / 2
    const y = e.clientY - rect.top - canvasSize.height / 2
    return { x, y }
  }

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
          // Allow hovering on both regular rectangles and open space rectangles
          if (!shape.isBricked) {
            return shape;
          }
        }
      
      } else if (shape.type === "text") {
        const textWidth = ctx.measureText(shape.text).width
        if (x >= shape.x && x <= shape.x + textWidth && y >= shape.y - 16 && y <= shape.y) {
          return shape
        }
      }
      else if(shape.type === "circle"){
        if (Math.sqrt(Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2)) <= shape.radius) {
          return shape
        }
      }
    }
    return null
  }

  const handleEditShape = () => {
    const clickedShape = hoveredShape;
    setHoveredShape(null);
    setSelectedShape(clickedShape)
        
    // Calculate the center of the rectangle properly for dialog positioning
    const normalizedRect = {
      x: clickedShape.width < 0 ? clickedShape.x + clickedShape.width : clickedShape.x,
      y: clickedShape.height < 0 ? clickedShape.y + clickedShape.height : clickedShape.y,
      width: Math.abs(clickedShape.width),
      height: Math.abs(clickedShape.height)
    }
    
    const centerX = normalizedRect.x + (normalizedRect.width / 2)
    const centerY = normalizedRect.y + (normalizedRect.height / 2)
    
    setShapeDialog({
      isOpen: true,
      x: centerX + canvasSize.width / 2,
      y: centerY + canvasSize.height / 2,
      shapeId: clickedShape.id,
      name: clickedShape.name || "",
      // instruction: clickedShape.instruction || "",
    })
  }

  const startDrawing = (e) => {
    if (!ctx) return

    const { x: canvasX, y: canvasY } = getCustomCoordinates(e)

    if (selectedTool === "pointer") {
      const clickedShape = findShapeAtPosition(canvasX, canvasY)
      setHoveredShape(null)
      if (clickedShape && !clickedShape.isBricked && clickedShape.type === "rectangle") {
        setSelectedShape(clickedShape)
        
        // Calculate the center of the rectangle properly for dialog positioning
        const normalizedRect = {
          x: clickedShape.width < 0 ? clickedShape.x + clickedShape.width : clickedShape.x,
          y: clickedShape.height < 0 ? clickedShape.y + clickedShape.height : clickedShape.y,
          width: Math.abs(clickedShape.width),
          height: Math.abs(clickedShape.height)
        }
        
        const centerX = normalizedRect.x + (normalizedRect.width / 2)
        const centerY = normalizedRect.y + (normalizedRect.height / 2)
        
        setShapeDialog({
          isOpen: true,
          x: centerX + canvasSize.width / 2,
          y: centerY + canvasSize.height / 2,
          shapeId: clickedShape.id,
          name: clickedShape.name || "",
          // instruction: clickedShape.instruction || "",
          // tag: clickedShape.tag || "",
        // visibility: clickedShape.visibility || "",
        })
      } else if(clickedShape && clickedShape.type === "circle"){
        setSelectedShape(clickedShape)
        console.log(clickedShape)
        
        // Calculate the center of the circle properly for dialog positioning
        const centerX = clickedShape.x + clickedShape.radius;
        const centerY = clickedShape.y + clickedShape.radius;
        console.log(centerX + canvasSize.width/2)
        console.log(centerY)
        
        setShapeDialog({
          isOpen: true,
          x: centerX + canvasSize.width / 2,
          y: centerY + canvasSize.height / 2,
          shapeId: clickedShape.id,
          name: clickedShape.name || "",
          // instruction: clickedShape.instruction || "",
          // tag: clickedShape.tag || "",
          // visibility: clickedShape.visibility || "",
        })
      }
      else {
        setSelectedShape(null)
        setShapeDialog({ ...shapeDialog, isOpen: false })
      }
    } else if (selectedTool === "rectangle" || selectedTool === "walls") {
      setDrawingState({
        isDrawing: true,
        startX: canvasX,
        startY: canvasY,
        currentX: canvasX,
        currentY: canvasY,
      })
      setSelectedShape(null)
      setShapeDialog({ ...shapeDialog, isOpen: false })
    } else if (selectedTool === "text") {
      setTextInput({
        isActive: true,
        x: canvasX,
        y: canvasY,
        text: "",
      })
      setSelectedShape(null)
      setShapeDialog({ ...shapeDialog, isOpen: false })
    }
    else if(selectedTool === "circle"){
      setDrawingState({
        isDrawing: true,
        startX: canvasX,
        startY: canvasY,
        currentX: canvasX,
        currentY: canvasY,
      })
      setSelectedShape(null)
      setShapeDialog({ ...shapeDialog, isOpen: false })
    }
  }

  const draw = (e) => {
    if (!drawingState.isDrawing || !ctx || !canvasRef.current) return

    const { x: canvasX, y: canvasY } = getCustomCoordinates(e)

    if (selectedTool === "rectangle" || selectedTool === "walls" || selectedTool === "circle") {
      setDrawingState({
        ...drawingState,
        currentX: canvasX,
        currentY: canvasY,
      })
    }
  }

  const erasePlusAt = (x, y, size = 6) => {
    // Slightly larger box than plus to fully clear it
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 498 - size, y + 248 - size, size * 3, size * 3);
  };
  

  // const addStartPoint = (e) => {
  //   if(clickPosition) {
  //     erasePlusAt(clickPosition.x, clickPosition.y, 5);
  //   }
  //   const { x: canvasX, y: canvasY } = getCustomCoordinates(e)
  //   const size = 5; // Length of half the plus lines

  //   ctx.strokeStyle = "red";
  //   ctx.lineWidth = 2;

  //   // Vertical line
  //   ctx.beginPath();
  //   ctx.moveTo(canvasX + 500, canvasY + 250 - size);
  //   ctx.lineTo(canvasX + 500, canvasY + 250 + size);
  //   ctx.stroke();

  //   // Horizontal line
  //   ctx.beginPath();
  //   ctx.moveTo(canvasX + 500 - size, canvasY + 250);
  //   ctx.lineTo(canvasX + 500 + size, canvasY + 250);
  //   ctx.stroke();

  //   setClickPosition({ x: canvasX, y: canvasY });
  // }

  const handleCanvasClick = (e) => {
    // if(selectedTool === "start-point"){
    //   addStartPoint(e);
    //   return;
    // }
    if (selectedTool !== "delete") return;

    const { x: canvasX, y: canvasY } = getCustomCoordinates(e)

    const clickedRect = shapes.find(
      (r) =>
        canvasX >= r.x &&
        canvasX <= r.x + r.width &&
        canvasY >= r.y &&
        canvasY <= r.y + r.height
    );

    const clickedCircle = shapes.find(
      (c) =>
        Math.sqrt(Math.pow(canvasX - c.x, 2) + Math.pow(canvasY - c.y, 2)) <= c.radius
    )

    if (clickedRect) {
      // Remove the rectangle
      setShapes((prevRects) =>
        prevRects.filter((r) => r.id !== clickedRect.id)
      );
    }

    if(clickedCircle){
      // Remove the circle
      setShapes((prevCircles) =>
        prevCircles.filter((c) => c.id !== clickedCircle.id)
      );
    }

  };

  const handleFill = (e) => {
    if (selectedTool !== "fill") return;
    const { x: canvasX, y: canvasY } = getCustomCoordinates(e)

    const clickedRect = shapes.find(
      (r) =>
        canvasX >= r.x &&
        canvasX <= r.x + r.width &&
        canvasY >= r.y &&
        canvasY <= r.y + r.height
    );

    const clickedCircle = shapes.find(
      (c) =>
        Math.sqrt(Math.pow(canvasX - c.x, 2) + Math.pow(canvasY - c.y, 2)) <= c.radius
    )
    
    if (clickedRect && !clickedRect.isBricked) {
      // Update the rectangle's color property
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          shape.id === clickedRect.id
            ? { ...shape, color: fillColor, isColored: true }
            : shape
        )
      );
      // Fill the rectangle with a color
      ctx.fillStyle = fillColor;
      ctx.fillRect(clickedRect.x + canvasSize.width / 2, clickedRect.y + canvasSize.height / 2, clickedRect.width, clickedRect.height);
    }

    if(clickedCircle){
      // Update the circle's color property
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          shape.id === clickedCircle.id
            ? { ...shape, color: fillColor, isColored: true }
            : shape
        )
      );
      // Fill the circle with a color
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(clickedCircle.x + canvasSize.width / 2, clickedCircle.y + canvasSize.height / 2, clickedCircle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // const drawCircle = (e) => {

  //   const { x: canvasX, y: canvasY } = getCustomCoordinates(e)

  //   const radius = Math.sqrt(
  //     Math.pow(canvasX - drawingState.startX, 2) +
  //     Math.pow(canvasY - drawingState.startY, 2)
  //   );
  //   if(radius > 5){
  //     const newCircle = {
  //       id: nextId,
  //       type: "circle",
  //       x: drawingState.startX,
  //       y: drawingState.startY,
  //       radius: radius,
  //       isColored: false,
  //     }

  //     setShapes([...shapes, newCircle]);

  //       // Add entry in availableInstructions for the new shape
  //     if (instruction_data) {
  //       setAvailableInstructions(prev => ({
  //         ...prev,
  //         [nextId]: instruction_data
  //           .map(item => item.id)
  //           .filter(id => !Object.values(selectedInstructions).includes(id))
  //       }));
  //     }
      
  //     setNextId(nextId + 1)
  //   }
  //   setDrawingState({
  //     isDrawing: false,
  //     startX: 0,
  //     startY: 0,
  //     currentX: 0,
  //     currentY: 0,
  //   })
  // }

  const stopDrawing = (e) => {
    if (!ctx || !drawingState.isDrawing || !canvasRef.current || (selectedTool !== "rectangle" && selectedTool !== "walls" && selectedTool !== "circle")) return;

    if(selectedTool === "circle"){
      drawCircle(e);
      return;
    }

    const { x: canvasX, y: canvasY } = getCustomCoordinates(e)
    const width = canvasX - drawingState.startX
    const height = canvasY - drawingState.startY
    
    // Only create rectangle if it has a reasonable size
    if (Math.abs(width) > 5 && Math.abs(height) > 5 && selectedTool !== "circle") {
      // Calculate the corner coordinates for vertices correctly
      const x1 = drawingState.startX;
      const y1 = drawingState.startY;
      const x2 = canvasX;
      const y2 = canvasY;
      
      // Calculate vertices in clockwise order regardless of drawing direction
      const vertices = [
        [Math.min(x1, x2), Math.min(y1, y2)],
        [Math.min(x1, x2), Math.max(y1, y2)],
        [Math.max(x1, x2), Math.max(y1, y2)],
        [Math.max(x1, x2), Math.min(y1, y2)],
      ];
      
      const newRectangle = {
        id: nextId,
        type: "rectangle",
        x: drawingState.startX,
        y: drawingState.startY,
        width: width,
        height: height,
        vertices: vertices,
        isColored: false,
        // isBricked: selectedTool === "walls",
        // isOpenSpace: isOpenSpaceMode, // Add this property
      };

      setShapes([...shapes, newRectangle]);

      // Add entry in availableInstructions for the new shape
      // if (instruction_data) {
      //   setAvailableInstructions(prev => ({
      //     ...prev,
      //     [nextId]: instruction_data
      //       .map(item => item.id)
      //       .filter(id => !Object.values(selectedInstructions).includes(id))
      //   }));
      // }
      
      setNextId(nextId + 1)
    }

    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    })
  };

  const handleHover = (e) => {
    if(!ctx || !canvasRef.current || selectedTool !== "pointer") return;
    const { x: mouseX, y: mouseY } = getCustomCoordinates(e);

    let foundShape = null;

    for (let shape of shapes) {
      if (
        mouseX >= shape.x &&
        mouseX <= shape.x + shape.width &&
        mouseY >= shape.y &&
        mouseY <= shape.y + shape.height
      ) {
        foundShape = shape;
        break;
      }
    }
    if(foundShape?.isBricked || foundShape?.isOpenSpace){
      return;
    }
    setHoveredShape(foundShape);
  };

  const handleTextSubmit = (text) => {
    if (text.trim() === "") {
      setTextInput({ isActive: false, x: 0, y: 0, text: "" });
      return
    }

    // Add new text to shapes
    const newText = {
      id: nextId,
      type: "text",
      x: textInput.x,
      y: textInput.y,
      text: text,
    }

    setShapes([...shapes, newText]);
    setNextId(nextId + 1);
    setTextInput({ isActive: false, x: 0, y: 0, text: "" });
  }

  const handleTagChange = (e) => {
    setShapeDialog({ 
      ...shapeDialog, 
      tag: e.target.value 
    });
  }

  const handleVisibilityChange = (e) => {
    setShapeDialog({ 
      ...shapeDialog, 
      visibility: e.target.value 
    });
  }

  const handleShapeDialogSave = () => {
    // Update the shape with the new name and instruction

    const selectedTagOption = tagOptions.find(option => option.id === shapeDialog.tag);

    const updatedShapes = shapes.map((shape) => {
      if (shape.id === shapeDialog.shapeId) {
        return {
          ...shape,
          name: shapeDialog.name || "N/A",
          // instruction: shapeDialog.instruction || "N/A",
          // tag: shapeDialog.tag || "",
          // visibility: shapeDialog.visibility || "",
          // Apply color based on visibility if selected
          // color: selectedTagOption ? selectedTagOption.color : shape.color,
          isColored: selectedTagOption ? true : shape.isColored,
        }
      }
      return shape
    })

    setShapes(updatedShapes)
    setShapeDialog({ ...shapeDialog, isOpen: false })

    console.log("Shape updated:", {
      shapeId: shapeDialog.shapeId,
      name: shapeDialog.name,
      instruction: shapeDialog.instruction,
    })
  }

  const closeShapeDialog = () => {
    // Reset to previous instruction if dialog is closed without saving
    setShapeDialog({ ...shapeDialog, isOpen: false })
  }

  const handleImageUpload = (file) => {
    if (file) {
      setUploadImage(file)
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  const clearCanvas = () => {
    setShapes([])
    setSelectedShape(null)
    setShapeDialog({ ...shapeDialog, isOpen: false })

    setSelectedTool("rectangle")
    // setBackgroundImage(null)
    // setUploadImage(null)
  }

  const logRectanglesWithVertices = () => {
    const regularRectangles = shapes.filter(
      (shape) => shape.type === "rectangle" && !shape.isOpenSpace
    );
  
    const rectangleData = {};
  
    regularRectangles.forEach((rect) => {
      rectangleData[rect.name || `Region ${rect.id}`] = {
        vertices: rect.vertices,
      };
    });
  
    console.log("Rectangle Vertices Data:", rectangleData);
  };

  const saveShapes = () => {
    logRectanglesWithVertices();
    const canvas = canvasRef.current;
    const canvasSnapshot = canvas.toDataURL("image/png");
    const regularRectangles = shapes.filter(shape => 
      shape.type === "rectangle" && !shape.isOpenSpace
    );

    // const circles = shapes.filter(shape => shape.type === "circle");

    // const openSpaceRectangles = shapes.filter(shape => 
    //   shape.type === "rectangle" && shape.isOpenSpace
    // );
    
   
      const scaledRectangles = regularRectangles.map(rect => ({
        id: rect.id,
        vertices: rect.vertices,
        name: rect.name,
        isBricked: rect.isBricked,
        isColored: rect.isColored,
        color: rect.color,
        instructionData: rect.instruction && instruction_data.find(item => 
          item.id === rect.instruction
        ),
        tag: rect.tag || "",
        visibility: rect.visibility || "",
      }));
      
      // const circlesData = circles.map(circle => ({
      //   id: circle.id,
      //   x: circle.x,
      //   y: circle.y,
      //   radius: circle.radius,
      //   name: circle.name,
      //   isColored: circle.isColored,
      //   color: circle.color,
      //   tag: circle.tag || "",
      //   visibility: circle.visibility || "",
      //   instructionData: circle.instruction && instruction_data.find(item => 
      //     item.id === circle.instruction
      //   ),

      // }))
 
    

    
      

    // if(!clickPosition){
    //   setShowStatusModal(true);
    //   setErrorMessage("Please click on the image to set the start point")
    //   return;
    // }


    // if (onSaveShapes) {
    //   onSaveShapes({
    //     // shapes: scaledRectangles,
    //     // circles: circlesData,
    //     snapshot: canvasSnapshot,
    //     image: backgroundImage,
    //   });
    //   onClose();
    // }
  };


 
  return (
    <div className="relative w-full h-[calc(100vh-1rem)] flex flex-col items-center ">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`bg-white ${cursorMap[selectedTool] || "cursor-default"}`}
          onMouseDown={(e) => {
            handleCanvasClick(e);
            startDrawing(e); 
            handleFill(e);
          }}
          onMouseMove={(e) => {
            draw(e);
            handleHover(e);
          }}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          muted
          autoPlay
        />
        {textInput.isActive && (
          <div
            className="absolute bg-white p-2 rounded shadow-md"
            style={{
              left: textInput.x + canvasSize.width / 2,
              top: textInput.y + canvasSize.height / 2,
            }}
          >
            <input
              type="text"
              className="border p-1 text-sm"
              placeholder="Enter text"
              autoFocus
              onChange={(e) =>
                setTextInput({ ...textInput, text: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTextSubmit(textInput.text);
                } else if (e.key === "Escape") {
                  setTextInput({ isActive: false, x: 0, y: 0, text: "" });
                }
              }}
            />
            <div className="flex mt-1 gap-1">
              <button
                className="bg-gray-200 text-xs px-2 py-1 rounded"
                onClick={() => handleTextSubmit(textInput.text)}
              >
                Add
              </button>
              <button
                className="bg-gray-200 text-xs px-2 py-1 rounded"
                onClick={() =>
                  setTextInput({ isActive: false, x: 0, y: 0, text: "" })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {shapeDialog.isOpen && (
          <div
            className="absolute bg-white p-6 rounded-xl shadow-lg w-[350px]"
            style={{
              left: `${shapeDialog.x +12  }px`,
              top: `${shapeDialog.y - 110}px`,
              transform: "translate(-50%, -50%)",
              border: "1px solid #E5E7EB",
            }}
          >
            <div className="flex flex-col gap-4">
                <>
                  <div className="flex items-center justify-around">
                        <label className="font-medium text-gray-700">Region Name: </label>
                        <div className="">
                          <input
                            id="storeName"
                            type="text"
                            placeholder="Enter region name"
                            value={shapeDialog.name}
                            onChange={(e) => setShapeDialog({ ...shapeDialog, name: e.target.value })}
                            className="w-full flex-1 border-b border-gray-300 px-1 py-1 focus:outline-none focus:border-indigo-500 text-black text-sm"
                          />
                        </div>
                      </div>
                </>
            
              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm text-[black]"
                  onClick={closeShapeDialog}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 bg-[#6366F1] text-white rounded-md text-sm"
                  onClick={handleShapeDialogSave}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        
        {hoveredShape && (
          <div
          style={{
            position: "absolute",
            left: hoveredShape.x + hoveredShape.width + 2 + canvasSize.width / 2 +35 > canvasSize.width ? hoveredShape.x + canvasSize.width/2 - 33 : hoveredShape.x + hoveredShape.width -35 + canvasSize.width / 2,
            top: hoveredShape.y + canvasSize.height / 2 + 2,
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
              onClick={() => {

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
              onClick={() => {
                setShapes((prevShapes) =>
                  prevShapes.filter((shape) => shape.id !== hoveredShape.id)
                );
                setHoveredShape(null);
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
      </div>
      <ToolBar
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        clearCanvas={clearCanvas}
        saveShapes={saveShapes}
        handleImage={handleImageUpload}
        isOpenSpaceMode={isOpenSpaceMode}
        setIsOpenSpaceMode={setIsOpenSpaceMode}
      />
      {selectedTool === "fill" && (
      <>
      
        <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md z-10 flex items-center">
          <label className="text-sm font-medium text-gray-700">Fill Color:</label>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="ml-2 w-8 h-8 border-none cursor-pointer"
          />
        </div>
      </>
      )}
    </div>
  );
}