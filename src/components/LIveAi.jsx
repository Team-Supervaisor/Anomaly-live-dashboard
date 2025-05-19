import React, { useEffect, useState, useRef } from "react";
import { useLocation,useParams } from "react-router-dom";
import { format } from "date-fns"; // For timestamp formatting
import { io } from "socket.io-client";
import logo from "../assets/logo.png";
import ai from "../assets/ai.png";
import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Hls from "hls.js";
import axios from "axios";
import { Edit2, Trash2, Loader2, ChevronUp, ChevronDown,  Play, RotateCcw } from 'lucide-react';
import InstructionModal from './InstructionModal';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import AiModal from "./AiModal";
import FullscreenToggle from "./ui/Fullscreentoggle";
import InstructionsChat from "./InstructionsChat";


const playbackPositions = {};

const VideoCanvasPlayer = ({ hlsUrl, id }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hlsRef = useRef(null);
  
  const playbackStateRef = useRef({
    currentTime: playbackPositions[id] || 0,
    isInitialized: false,
  });
  // State to hold the latest frame URL

  // HLS setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    if (Hls.isSupported()) {
      // Store current time before setting up new HLS instance
      if (hlsRef.current && videoRef.current) {
        playbackStateRef.current.currentTime = videoRef.current.currentTime;
        playbackPositions[id] = videoRef.current.currentTime;
      }

      const hls = new Hls({
        maxBufferSize: 30 * 1000 * 1000, // 30MB buffer
        maxBufferLength: 60, // 60 seconds buffer
        enableWorker: true, // Enable web worker
        lowLatencyMode: true, // Enable low latency mode
        backBufferLength: 90, // 90 seconds backward buffer
        startPosition: playbackStateRef.current.currentTime, // Start from saved position
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        // Only set the time if we've played before
        if (
          playbackStateRef.current.isInitialized &&
          playbackStateRef.current.currentTime > 0
        ) {
          video.currentTime = playbackStateRef.current.currentTime;
        }

        video
          .play()
          .then(() => {
            playbackStateRef.current.isInitialized = true;
          })
          .catch((err) => console.error("Play failed:", err));
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

      // Store current time periodically to maintain position
      const timeUpdateHandler = () => {
        if (video.currentTime > 0) {
          playbackStateRef.current.currentTime = video.currentTime;
          playbackPositions[id] = video.currentTime;
        }
      };

      video.addEventListener("timeupdate", timeUpdateHandler);

      return () => {
        video.removeEventListener("timeupdate", timeUpdateHandler);
        // Don't destroy HLS here to maintain state between renders
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        if (playbackStateRef.current.currentTime > 0) {
          video.currentTime = playbackStateRef.current.currentTime;
        }
        video.play().catch((err) => console.error("Play failed:", err));
      });
    }
  }, [hlsUrl, id]); // Re-run if URL changes

  // Save playback position before unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        if (currentTime > 0) {
          playbackStateRef.current.currentTime = currentTime;
          playbackPositions[id] = currentTime;
        }
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [id]);

  return (
    <div className="relative w-full h-full max-h-full rounded-xl overflow-hidden bg-black">

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
};

const LiveAi = () => {
  const [streamUrl, setStreamUrl] = useState(null);
  const imgRef = useRef(null);
  
  // const wsRef = useRef(null);
  const location = useLocation();
  const { data } = location.state || {};
  const [logs, setLogs] = useState([]);
  const ctrlSocketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const logsContainerRef = useRef(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [instructionset, setInstructionset] = useState('');
  const [instrucLoader, setInstrucLoader] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [aiData, setAiData] = useState({});
  const socketRef = useRef(null);
  const [aiAnalyzeitem, setAiAnalyzeitem] = useState([]);
  const socketRef2 = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const { cameraId } = useParams();
  const { state } = useLocation();
  const { cameraData } = state || {};
  const anomalyScrollContainerRef = useRef(null);
  const [showAllAnamoly, setShowAllAnamoly] = useState(false);
  const [loader,setLoader] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);



  const handleAnomalyAlert = data => {
    console.log("Anomaly alert received:", data);
    setAiAnalyzeitem(prev => [...prev, data]);
    setLoader(false);
  };
  

  useEffect(() => {
    // — Primary socket (frame feeds only)
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
  
    socketRef.current.on("connect", () => {
      console.log("✅ Primary socket connected (ready to emit tracking_start)");
    });
    
    socketRef.current.on("frame", (data) => {
          // log the raw payload size so you can spot zero-length or tiny frames
    console.log("🔍 Incoming frame byte length:", data.byteLength);

    // skip any payload that looks too small to be a valid JPEG
    if (!data || data.byteLength < 1000) {
      console.warn("⚠️ Suspiciously small frame, skipping render");
      return;
    }
      const blob = new Blob([data], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setStreamUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    });
  
    // — Secondary socket (instructions_changed + anomaly alerts)
    socketRef2.current = io(import.meta.env.VITE_API_URL1, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });
  
    socketRef2.current.on("connect", () => {
      console.log("📡 Instruction socket connected on port 8000");
      console.log("👂 Listening for anomaly_alert events");
    });
    socketRef2.current.on("connect_error", (err) => {
      console.error("Instruction socket error:", err);
    });
  
    // KEEP this listener alive for anomaly_alert:
    socketRef2.current.on("anomaly_alert", (arg1, arg2) => {
      console.log("🔔 Received anomaly_alert event");
      console.log("New alert", arg1);
      console.log("New alert", arg2);
    
      // 1) pick the real payload (socket.io sometimes puts it in arg2)
      const payload = (typeof arg2 === "undefined" && typeof arg1 === "object")
        ? arg1
        : arg2;
      console.log("▶️ anomaly_alert payload:", payload);
    
      // 2) build an array of one or two normalized anomaly items
      const newItems = [];
    
      // nested case: both anomaly_time + anomaly_action present
      if (payload.anomaly_time && payload.anomaly_action) {
        newItems.push({
          ...payload.anomaly_time,
          type: payload.anomaly_time.type || "Operation",
        });
        newItems.push({
          ...payload.anomaly_action,
          type: payload.anomaly_action.type || "ActionAnomaly",
        });
      }
      // flat case: a single anomaly object
      else {
        const item = { ...payload };
        // strip any "Action<<sep>>" prefix on op
        if (typeof item.op === "string" && item.op.includes("<<sep>>")) {
          item.op = item.op.split("<<sep>>")[1];
        }
        newItems.push(item);
      }
    
      // 3) append all new items at once
      setAiAnalyzeitem(prev => [...prev, ...newItems]);
      setLoader(false);
    
      console.log("Anomaly data queued:", newItems);
    });    // If you also want to listen for a differently-named event like "anomaly_appear":
    socketRef2.current.on("anomaly_appear", (data) => {
      console.log("🔔 Received anomaly_appear event:", data);
      // handle it just like anomaly_alert, or however you need:
      setAiAnalyzeitem(prev => [...prev, data]);
      setLoader(false);
    });
  
    socketRef2.current.on("instructions_changed", (data) => {
      setInstrucLoader(false);
      console.log("📝 Instructions:", data);
    });
  
    return () => {
      socketRef2.current.off("anomaly_alert");
      socketRef2.current.off("anomaly_appear");
      socketRef2.current.off("instructions_changed");
      socketRef2.current.disconnect();
    };
  }, []);
  
  

  useEffect(() => {
    if (anomalyScrollContainerRef.current && aiAnalyzeitem.length > 0) {
      // Using smooth scroll behavior
      anomalyScrollContainerRef.current.scrollTo({
        top: anomalyScrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [aiAnalyzeitem]);
  

  useEffect(() => {
    console.log("Streaming for camera:", cameraId, "with data:", cameraData);
  }, [cameraId, cameraData]);

  // console.log("Data from location:", data);
  const mockLogs = [
    {
      person_id: 1,
      camera_id: 0,
      roi: "entrance",
      event: "entry",
      timestamp: "2025-05-01T16:43:58.851wewewe",
    },
    {
      person_id: 2,
      camera_id: 0,
      roi: "entrance",
      event: "entry",
      timestamp: "2025-05-01T16:43:59.642",
    },
    {
      person_id: 1,
      camera_id: 0,
      roi: "exit",
      event: "exit",
      timestamp: "2025-05-01T16:44:30.123",
    },
    {
      person_id: 3,
      camera_id: 1,
      roi: "restricted_area",
      event: "entry",
      timestamp: "2025-05-01T16:45:12.445",
    },
    {
      person_id: 4,
      camera_id: 1,
      roi: "restricted_area",
      event: "exit",
      timestamp: "2025-05-01T16:45:30.123",
    },
    {
      person_id: 5,
      camera_id: 2,
      roi: "entrance",
      event: "entry",
      timestamp: "2025-05-01T16:46:12.445",
    },
    {
      person_id: 6,
      camera_id: 2,
      roi: "entrance",
      event: "entry",
      timestamp: "2025-05-01T16:46:30.123",
    },
    {
      person_id: 7,
      camera_id: 3,
      roi: "restricted_area",
      event: "entry",
      timestamp: "2025-05-01T16:47:12.445",
    },
    {
      person_id: 8,
      camera_id: 3,
      roi: "restricted_area",
      event: "exit",
      timestamp: "2025-05-01T16:47:30.123",
    },
  ];

  const handleRefreshAi = () => {
    setAiAnalyzeitem([]);
    setLoader(false);
  };
  // useEffect(() => {
  //   const startStream = async () => {
  //     const apiUrl = import.meta.env.VITE_API_URL;
  //     try {
  //       await axios.post(`${apiUrl}/start_tracking`);
  //       console.log("Stream started successfully");
  //     } catch (error) {
  //       console.error("Failed to start stream:", error);
  //     }
  //   };

  //   startStream();
  // }, []);

  // Helper function to convert data object to array format
  const formatVideoData = (data) => {
    if (!data || !data.hls_urls) return [];

    return Object.entries(data.hls_urls).map(([videoName, hlsUrl]) => ({
      videoName,
      hlsUrl,
      path: data.video_paths[videoName],
    }));
  };

  const gridClasses = () => {
    if (!data || !data.hls_urls) return "grid-cols-1";

    const len = Object.keys(data.hls_urls).length;
    if (len === 1) return "grid-cols-1 grid-rows-1";
    if (len === 2) return "grid-cols-2 grid-rows-1";
    if (len <= 4) return "grid-cols-2 grid-rows-2";
    if (len <= 6) return "grid-cols-3 grid-rows-2";
    return "grid-cols-1"; // fallback
  };

//   useEffect(() => {
//     const socketInstance = io(import.meta.env.VITE_API_URL);
//     setSocket(socketInstance);
//     socketRef.current = socketInstance; // Store socket in ref

//     // Initialize socket events
//     socketInstance.emit("logs");

//     socketInstance.on("log_update", (payload) => {
//       // payload is coming in as an array:
//       // [
//       //   { person_id: 1, camera_id: "Video 1", roi: "inside", event: "entry", timestamp1: "2025-05-06T23:01:23.454" },
//       //   …
//       // ]
//       setLogs(Array.isArray(payload) ? payload : []);
//     });

//     // Add instruction events
//     socketInstance.on("instruction_saved", () => {
//         setInstrucLoader(false); // Turn off loader when save is confirmed
//     });

//     return () => {
//         socketInstance.disconnect();
//     };
// }, []);

  // Simulate socket updates every 3 seconds
 

  // Add this effect to handle auto-scrolling
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Scroll whenever logs update
  useEffect(() => {
    setLogs(mockLogs);
  
    const interval = setInterval(() => {
      setLogs(prevLogs => {
        const rotated = [...prevLogs];
        const last = rotated.pop();
        if (last) {
          // Add animation classes when inserting new log
          last.isNew = true;
          rotated.forEach(log => log.isNew = false); // Ensure only the new log has the class
          rotated.unshift(last);
        }
        return rotated;
      });
    }, 3000);
  
    return () => clearInterval(interval);
  }, []);

  // Function to format the timestamp
  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), "HH:mm:ss");
  };

  // Function to get event color
  const getEventColor = (event) => {
    switch (event) {
      case "entry":
        return "text-green-600";
      case "exit":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  // const handleSaveInstruction = (instruction) => {
  //   const instrSocket = socketRef2.current;
  //   if (!instrSocket || !instrSocket.connected) {
  //     console.error("Socket for instructions not connected");
  //     return;
  //   }

  //   setInstructionset(instruction);
  //   setInstrucLoader(true);

  //   instrSocket.emit(
  //     "instructions_changed",
  //     instruction,
  //     (acknowledgement) => {
  //       console.log("Server ACK:", acknowledgement);
  //       setInstrucLoader(false);
  //       setShowInstructionModal(false);
  //     }
  //   );
  // };

  const formatInstructionHtml = (markdown) => {
    if (!markdown) return "<p>N/A</p>";
    let html = markdown
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    const lines = html.split("\n");
    let out = "",
      inUl = false,
      inOl = false;
    lines.forEach((line) => {
      if (/^- /.test(line)) {
        if (!inUl) {
          out += "<ul>";
          inUl = true;
        }
        out += `<li>${line.slice(2)}</li>`;
      } else if (/^\d+\. /.test(line)) {
        if (!inOl) {
          out += "<ol>";
          inOl = true;
        }
        out += `<li>${line.replace(/^\d+\. /, "")}</li>`;
      } else {
        if (inUl) {
          out += "</ul>";
          inUl = false;
        }
        if (inOl) {
          out += "</ol>";
          inOl = false;
        }
        out += `<p>${line || "<br/>"}</p>`;
      }
    });
    if (inUl) out += "</ul>";
    if (inOl) out += "</ol>";
    return out;
  };

  const handleStart = () => {
    const ctrlSocket = io("http://localhost:8000", {
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });
  
    ctrlSocket.on("connect", () => {
      ctrlSocket.emit("frontend_connect", { cameraId });
      console.log("Sent frontend_connect");
  
      // ctrlSocket.emit("tracking_start", { cameraId }, (ack) => {
      //   console.log("tracking_start ack:", ack);
      // });
      console.log("Sent tracking_start");
  
       if (socketRef.current) {
        socketRef.current.emit("tracking_start");
        setIsTracking(true);
        console.log("start_tracking emitted on primary socket");
       }
    });
  
    ctrlSocket.on("connect_error", (err) => {
      console.error("Control socket connection error:", err);
    });
  
    ctrlSocketRef.current = ctrlSocket;
  };
  

  const handleReset = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/reset`,
        { method: 'GET' }
      );
      if (!res.ok) {
        console.error('Backend reset failed:', await res.text());
      } else {
        console.log('Backend reset successful');
      }
    } catch (err) {
      console.error('Error calling /reset:', err);
    }
  
    if (ctrlSocketRef.current) {
      ctrlSocketRef.current.emit('frontend-disconnect');
      ctrlSocketRef.current.disconnect();
      ctrlSocketRef.current = null;
      console.log('Sent frontend-disconnect and disconnected control socket');
    }
  
    setIsTracking(false);
    if (streamUrl) {
      URL.revokeObjectURL(streamUrl);
      setStreamUrl(null);
    }
  };


  const openAimodal = (item) => {
    console.log("AI Modal item:", item);
    setAiData(item);
    setAiModal(true);
  };
  // const handleSaveAiModal = (instruction) => {
  //   console.log("Saved instruction:", instruction);
  //   //emit soccket
  //   socketRef.current.emit("feedback", instruction);
  //   setAiModal(false);
  // };

  const handleSaveAiModal = (instruction) => {
    if (!socketRef2.current || !socketRef2.current.connected) {
      console.error("Feedback socket not connected");
      return;
    }
  
    console.log("Sending feedback:", instruction);
    

    socketRef2.current.emit("feedback", instruction, (acknowledgement) => {
      console.log("Feedback acknowledgement:", acknowledgement);
      setAiModal(false);
    });
  };



  // useEffect(() => {
  //   if (aiAnalyzeitem.length > 0) {
  //     // Mark the newest item for animation
  //     setAiAnalyzeitem(prevItems => {
  //       const newItems = [...prevItems];
  //       newItems[newItems.length - 1] = {
  //         ...newItems[newItems.length - 1],
  //         isNew: true
  //       };
  //       // Remove isNew from other items
  //       return newItems.map((item, index) => ({
  //         ...item,
  //         isNew: index === newItems.length - 1
  //       }));
  //     });
  //   }
  // }, [aiAnalyzeitem.length]);


  useEffect(() => {
    if (aiAnalyzeitem.length > 0) {
      setAiAnalyzeitem(prevItems => {
        const newItems = [...prevItems];
        // Update the last item to include log ID and animation
        newItems[newItems.length - 1] = {
          ...newItems[newItems.length - 1],
          logId: prevItems.length,
          isNew: true
        };
        // Remove animation from other items
        return newItems.map((item, index) => ({
          ...item,
          logId: index + 1,
          isNew: index === newItems.length - 1
        }));
      });
    }
  }, [aiAnalyzeitem.length]);
   
  // const handleSendMessage = () => {
  //   if (newMessage.trim()) {
  //     setMessages(prev => [...prev, {
  //       id: Date.now(),
  //       text: newMessage,
  //       number: prev.length + 1
  //     }]);handleSaveInstruction
  //     setNewMessage('');
  //   }
  // };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socketRef2.current?.connected) {
      console.error("Empty message or socket not connected");
      return;
    }
  
    setInstrucLoader(true);
  
    // Send instruction through socket
    socketRef2.current.emit(
      "instructions_changed",
      newMessage.trim(),
      (acknowledgement) => {
        console.log("Server ACK:", acknowledgement);
        
        // After successful socket emission, add to UI with animation
        const newMsg = {
          id: Date.now(),
          text: newMessage.trim(),
          number: messages.length + 1,
          isNew: true
        };
        
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setInstrucLoader(false);
        setInstructionset(newMessage.trim());
  
        // Remove animation class after it completes
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMsg.id ? { ...msg, isNew: false } : msg
            )
          );
        }, 300);
      }
    );
  };


  const handleDeleteMessage = (messageId) => {
    setDeletingMessageId(messageId);
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setDeletingMessageId(null);
    }, 300);
  };
  
  const handleEditMessage = (message) => {
    setShowInstructionModal(true);
    setEditingMessage(message);
  };

  const handleSaveInstruction = (instruction) => {
    const instrSocket = socketRef2.current;
    if (!instrSocket || !instrSocket.connected) {
      console.error("Socket for instructions not connected");
      return;
    }
  
    setInstrucLoader(true);
  
    instrSocket.emit(
      "instructions_changed",
      instruction,
      (acknowledgement) => {
        console.log("Server ACK:", acknowledgement);
        
        if (editingMessage) {
          // Update existing message after successful socket emission
          setMessages(prev => prev.map(msg => 
            msg.id === editingMessage.id 
              ? { ...msg, text: instruction }
              : msg
          ));
          setEditingMessage(null);
        }
  
        setInstructionset(instruction);
        setInstrucLoader(false);
        setShowInstructionModal(false);
        setNewMessage('');
      }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F9FF]">
          <header className="flex items-center justify-between px-[41px] py-[10px] pl-[12px] bg-white">
            {/* Left section - Logo and Title */}
            <Link to="/" className="flex-none">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="rounded">
                  <img className="h-8 w-8" src={logo} alt="Logo" />
                </div>
                <h2 className="text-[22px] text-black font-medium">
                  Tracking Dashboard
                </h2>
              </div>
            </Link>

          {/* Right section - Fullscreen and Live AI */}
          <div className="flex items-center gap-4">
            <div className="p-3">
              <FullscreenToggle />
            </div>
            
            <button
              style={{padding: "8px 18px"}}
              className="flex items-center justify-center 
                        border border-[#F20A0A] rounded-[100px] bg-[#FFDDDB]
                        text-[#F20A0A] font-medium text-base hover:bg-[#FFE8E7] 
                        transition-colors gap-[10px]"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full 
                                rounded-full bg-[#F20A0A] opacity-75">
                </span>
                <span className="relative inline-flex rounded-full h-3 w-3 
                                bg-[#F20A0A]">
                </span>
              </span>
              Live AI
            </button>
          </div>
        </header>

      <div className="flex flex-1 p-4 pt-0 gap-4 overflow-hidden mt-8">
        {/* Left Section */}
        <div className="w-full">
  <div className="bg-white w-full rounded-[26px] overflow-hidden">
    {streamUrl ? (
      <div className="w-full h-full relative">
        <img
          ref={imgRef}
          src={streamUrl}
          className="w-full h-full rounded-xl"
          alt="Live stream"
        />
        <div className="absolute top-2 left-2 bg-white text-black px-2 py-1 rounded text-sm font-medium">
          Video Canvas 1
        </div>
      </div>
    ) : (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-[120px] h-[120px]">
            <DotLottieReact
              src="https://lottie.host/444798af-70b8-4920-a17d-c009411cfb64/a81fXDiwEN.lottie"
              loop
              autoplay
            />
          </div>
          <span className="text-gray-600 text-lg font-medium mt-1">
            AI analyzing video
          </span>
        </div>
      </div>
    )}
  </div>

  {streamUrl && (
  <div className="mt-4 flex items-center justify-center backdrop-blur-md bg-white/70 h-[80px] rounded-[100px] w-full max-w-[500px] mx-auto gap-6 border border-white/40 shadow-lg">
    <div className="flex items-center gap-2">
      <div className="relative group">
        <button className="flex items-center gap-2 text-[16px] font-medium">
          Video Canvas 1
          <div className="w-8 h-8 flex items-center justify-center bg-[#EDEEFF]/80 backdrop-blur-sm rounded-full">
            {isDropdownOpen ? (
              <ChevronUp className="w-4 h-4 text-[#717AEA]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#717AEA]" />
            )}
          </div>
        </button>
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white/80 backdrop-blur-md rounded-lg shadow-lg py-2 border border-white/40">
            <button className="w-full text-left px-4 py-2 hover:bg-[#EDEEFF]/70 text-[16px]">
              Video Canvas 1
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-[#EDEEFF]/70 text-[16px]">
              Video Canvas 2
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-[#EDEEFF]/70 text-[16px]">
              Video Canvas 3
            </button>
          </div>
        )}
      </div>
    </div>

    <div className="w-[1px] h-[51px] bg-[#DEDEDE]/50" />

    <div className="flex items-center gap-6">
      <button
        onClick={handleStart}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isTracking
            ? "bg-[#717AEA]/90 backdrop-blur-sm text-white shadow-md"
            : "bg-[#EDEEFF]/80 backdrop-blur-sm text-[#717AEA] hover:bg-[#717AEA]/80 hover:text-white shadow-md"
        }`}
      >
        <Play className="w-5 h-5" />
      </button>

      <button
        onClick={handleReset}
        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#EDEEFF]/80 backdrop-blur-sm text-[#717AEA] hover:bg-[#717AEA]/80 hover:text-white transition-colors shadow-md"
      >
        <RotateCcw className="w-5 h-5" />
      </button>
    </div>
  </div>
)}
</div>

        {/* Right Section with Instructions and AI Analysis */}
        <div className="flex flex-col gap-4 w-[650px]">
          {/* Instructions Card */}

          <div className="bg-white rounded-[26px] max-h-[330px] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 pt-[16px] pb-[13px] border-[#EFF4FE]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center">
                  <img src="/add_notes.svg" alt="Notes" className="w-10 h-10" />
                </div>
                <h2 className="font-[600] text-[16px]">Instructions</h2>
              </div>
              <button
              // onClick={() => setShowInstructionModal(true)}
              className="p-2 rounded hover:bg-gray-100 transition"
            >
              <img src="/expand_content.svg" alt="Expand" className="w-5 h-5" />
            </button>


            </div>
            <InstructionsChat 
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              hoveredMessage={hoveredMessage}
              setHoveredMessage={setHoveredMessage}
              deletingMessageId={deletingMessageId}
              handleSendMessage={handleSendMessage}
              handleEditMessage={handleEditMessage}
              handleDeleteMessage={handleDeleteMessage}
              formatInstructionHtml={formatInstructionHtml}
            />

 


 
          </div>
          {/* <div className="bg-white rounded-[26px] max-h-[380px] flex flex-col">
            <div
         
             className="flex justify-between items-center p-4 pt-[16px] pb-[13px]  border-[#EFF4FE]">
                 <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center">
              <img src="/add_notes.svg" alt="Notes" className="w-10 h-10" />
            </div>
            <h2 className="font-[600] text-[16px]">Instructions</h2>
          </div>
  
          <button
              className=""
              // onClick={() => setShowInstructionModal(true)}
            >
              <img 
                src="/expand_content.svg"
                alt="Expand" 
                className="w-4 h-4"
              />
          </button>
            </div>
            <div className="w-full h-[12px]"></div>
            <div className="pt-0 pr-[4px] pl-[4px] pb-[12px]">
            <div
              onClick={() => setShowInstructionModal(true)}
              className="max-h-96 overflow-y-auto p-[14.34px] rounded-lg scrollbar-hidden cursor-pointer"
              dangerouslySetInnerHTML={{
                __html: formatInstructionHtml(instructionset),
              }}
            />

            </div>
          </div> */}

           {/* Analysis Card */}
                <div className="bg-white rounded-[26px] p-4 max-h-[380px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div
                  className="flex items-center cursor-pointer"
                  onClick={() => setShowAllAnamoly(true)}
                  >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2">
                    <img src="/analysis.svg" alt="AI" className="w-10 h-10" />
                  </div>
                  <h2 
                    className="font-medium text-lg"
                    style={{ 
                    background: 'linear-gradient(90deg, #4F4FDC 0%, #717AEA 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                    }}
                  >
                    AI Analysis
                  </h2>
                  {loader && (
                    <Loader2 className="animate-spin text-indigo-500 w-4 h-4 ml-2" />
                  )}
                  </div>
                  <button
                  onClick={handleRefreshAi}
                  className="p-2 bg-[#EBECFF] rounded hover:bg-[#DDE2FD] transition"
                  title="Refresh AI analysis"
                  >
                  <RefreshCw className="w-5 h-5 text-[#5A62C8]" />
                  </button>
                </div>

                {/* Scrollable Content */}
            <div
              ref={anomalyScrollContainerRef}
              // className="p-[8px] rounded-[12px] overflow-y-auto scrollbar-hidden flex-1"
              className="p-3 rounded-xl overflow-y-auto scrollbar-hidden flex-1"
            >
              <div className="logs-container">
                {aiAnalyzeitem.map((item, index) => (
                  <div
                    key={index}
                    className={`log-item relative ${item.isNew ? 'new-log' : ''}`}
                    style={{
                      width: '421px',
                      marginLeft: '8px',
                      borderRadius: '14px',
                      background: 'linear-gradient(90deg, rgba(113, 122, 234, 0.2) 0%, rgba(113, 122, 234, 0.08) 100%)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                   <span className="absolute top-2 left-2 inline-flex px-2 py-1 rounded-full bg-[#717AEA14] text-[#3B3BC6] text-xs">
                    Log ID: {item.logId}
                  </span>
                  <div className="mt-8">
                    {item.type === "Operation" ? (
                      <div className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]">
                        <div onClick={() => setShowAllAnamoly(true)} className="flex gap-2 mb-1 cursor-pointer">
                          <span className="font-medium">{index + 1}.</span>
                          <span className="text-black-700 font-semibold">{item.cp}</span>
                        </div>
                        <ul onClick={() => setShowAllAnamoly(true)} className="rounded-md p-2 mt-1 text-black list-disc list-inside cursor-pointer">
                          <li>Checkpoint: {item.cp}</li>
                          <li>Operation: {item.op}</li>
                          <li>Expected: {item.exp}</li>
                          <li>Actual: {item.act.toFixed(4)}</li>
                          <li>Deviation (sec): {item.dev_sec.toFixed(4)}</li>
                          <li>Operation ID: {item.OpID}</li>
                        </ul>
                        <div className="bg-[#EEEFFF] rounded-md p-2 mt-1 cursor-pointer flex justify-center items-center gap-2"
                            onClick={() => openAimodal(item)}>
                          <span className="text-[#5A62C8]">{item.type}</span>
                          <button className="text-xs text-[#5A62C8]">×</button>
                        </div>
                      </div>
                    ) : item.type === "Time Event" ? (
                      // Time Event content
                      <div className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]">
                        <div onClick={() => setShowAllAnamoly(true)} className="flex gap-2 mb-1 cursor-pointer">
                          <span className="font-medium">{index + 1}.</span>
                          <span className="text-black-700 font-semibold">{item.type}</span>
                        </div>
                        <p>{item.reason}</p>
                        <div className="bg-[#EEEFFF] rounded-md p-2 mt-1 cursor-pointer flex justify-center items-center gap-2"
                            onClick={() => openAimodal(item)}>
                          <span className="text-[#5A62C8]">{item.type}</span>
                          <button className="text-xs text-[#5A62C8]">×</button>
                        </div>
                      </div>
                    ) : item.type === "Checkpoint" ? (
                      // Checkpoint content
                      <div
                      key={index}
                      className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]"
                    >
                      <div
                        onClick={() => setShowAllAnamoly(true)}
                        className="flex gap-2 mb-1 cursor-pointer"
                      >
                        <span className="font-medium">{index + 1}.</span>
                        <span className="text-black-700 font-semibold">
                          {item.type}
                        </span>
                      </div>

                      <ul
                        onClick={() => setShowAllAnamoly(true)}
                        className="rounded-md p-2 mt-1 text-black list-disc list-inside cursor-pointer"
                      >
                        {/* Extra section as a list item */}
                        {/* <li>
                          <span className="font-medium">Extra:</span>
                          <ul className="list-disc list-inside ml-4 mt-1">
                            {item.extra.length > 0 ? (
                              item.extra.map((cp, i) => (
                                <li key={`extra-${i}`}>{cp}</li>
                              ))
                            ) : (
                              <li>N/A</li>
                            )}
                          </ul>
                        </li> */}

                        {/* Order section as a list item */}
                        <li>
                          <span className="font-medium">Order:</span>
                          <div className="flex flex-wrap items-center ml-5 mt-1">
                            {item.order.map((cp, i) => (
                              <React.Fragment key={`order-${i}`}>
                                <span>{cp}</span>
                                {i !== item.order.length - 1 && (
                                  <span className="mx-1">→</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </li>

                        {/* Current Anomaly section as a list item */}
                        <li>
                          <span className="font-medium">
                            Current Anomaly:
                          </span>
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>
                              Position: {item.current_anomaly.position}
                            </li>
                            <li>
                              Expected: {item.current_anomaly.expected}
                            </li>
                            <li>Actual: {item.current_anomaly.actual}</li>
                          </ul>
                        </li>
                      </ul>

                      <div
                        className="bg-[#EEEFFF] rounded-md p-2 mt-1 cursor-pointer flex justify-center items-center gap-2"
                        onClick={() => openAimodal(item)}
                      >
                        <span className="text-[#5A62C8]">
                          {item.type}
                        </span>
                        <button className="text-xs text-[#5A62C8]">
                          ×
                        </button>
                      </div>
                    </div>
                    ) : item.type === "ActionAnomaly" ? (
                      // ActionAnomaly content
                      <div
                        key={index}
                        className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]"
                      >
                        <div
                          onClick={() => setShowAllAnamoly(true)}
                          className="flex gap-2 mb-1 cursor-pointer"
                        >
                          <span className="font-medium">{index + 1}.</span>
                          <span className="text-black-700 font-semibold">
                            {item.type}
                          </span>
                        </div>

                        <p>{item.detail}</p>
                        <div
                          className="bg-[#EEEFFF] rounded-md p-2 mt-1 cursor-pointer flex justify-center items-center gap-2"
                          onClick={() => openAimodal(item)}
                        >
                          <span className="text-[#5A62C8]">
                            {item.type}
                          </span>
                          <button className="text-xs text-[#5A62C8]">
                            ×
                          </button>
                        </div>
                      </div>
                    ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instruction Modal */}
      {showInstructionModal && (
        <InstructionModal
          onClose={() => {
            setShowInstructionModal(false);
            setEditingMessage(null);
          }}
          onSave={handleSaveInstruction}
          data={editingMessage?.text || ''}
        />
      )}


        {/* AI Modal */}
        {aiModal && (
        <AiModal
          data={aiData}
          onClose={() => setAiModal(false)}
          onSave={handleSaveAiModal}
        />
      )}
    </div>
  );
};

export default LiveAi;
