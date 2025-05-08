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
import { Edit2, Loader2, Play, RotateCcw } from 'lucide-react';
import InstructionModal from './InstructionModal';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


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
  const [socket, setSocket] = useState(null);
  const logsContainerRef = useRef(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [instructionset, setInstructionset] = useState('');
  const [instrucLoader, setInstrucLoader] = useState(false);
  const socketRef = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const { cameraId } = useParams();
  const { state } = useLocation();
  const { cameraData } = state || {};


    useEffect(() => {
      socketRef.current = io(import.meta.env.VITE_API_URL);
  
      // whenever the server sends us new logs, update state
      socketRef.current.on("anomaly_alert", (payload) => {
        if (Array.isArray(payload)) {
          setLogs(payload);
        }
      });
      socketRef.current.on("frame", (data) => {
        const blob = new Blob([data], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setStreamUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      });
      
      return () => {
        socketRef.current.disconnect();
      };
    }, []);

    
  useEffect(() => {
    console.log("Streaming for camera:", cameraId, "with data:", cameraData);
  }, [cameraId, cameraData]);

  console.log("Data from location:", data);
  const mockLogs = [
    {
      person_id: 1,
      camera_id: 0,
      roi: "entrance",
      event: "entry",
      timestamp: "2025-05-01T16:43:58.851",
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
  useEffect(() => {
    setLogs(mockLogs);

    const interval = setInterval(() => {
      // Rotate the logs array to simulate updates
      setLogs((prevLogs) => {
        const rotated = [...prevLogs];
        const last = rotated.pop();
        if (last) rotated.unshift(last);
        return rotated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
      // Rotate the logs array to simulate updates
      setLogs((prevLogs) => {
        const rotated = [...prevLogs];
        const last = rotated.pop();
        if (last) rotated.unshift(last);
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

  const handleSaveInstruction = (instruction) => {
    if (!socketRef.current) {
        console.error("Socket connection not established");
        return;
    }
    
    setInstructionset(instruction);
    setInstrucLoader(true);
    socketRef.current.emit("instructions_changed", instruction);
    setShowInstructionModal(false);
};

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
    if (!socketRef.current) return;
    socketRef.current.emit("start_tracking", { cameraId });
    setIsTracking(true);
  };
  const handleReset = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("end_tracking");
    setIsTracking(false);
    setStreamUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };
  
   
  return (
    <div className="flex flex-col h-screen bg-[#F5F9FF]">
      <header className="flex items-center p-4 ">
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

   
          <div className="flex-1 flex justify-center items-center gap-3 mt-5">
            <button
              onClick={handleStart}
              disabled={isTracking}
              className={`flex items-center gap-2 px-4 py-2 rounded-[4rem] font-medium transition-colors
                ${isTracking 
                  ? 'bg-[#717AEA] text-white hover:bg-[#717AEA]' 
                  : 'bg-[#717AEA] text-white hover:bg-[#717AEA]'}`}
            >
              {isTracking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isTracking ? 'Started' : 'Start'}
            </button>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 border border-[#717AEA] rounded-[4rem] 
                        text-[#7900F3] font-medium hover:bg-[#7900F3]/5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

        {/* Add empty div to balance the layout */}
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
   
          </header>

      <div className="flex flex-1 p-4 pt-0 gap-4 overflow-hidden ">
        {/* Left Section */}
        {/* <div className="bg-white w-full rounded-[26px] p-4 flex flex-col flex-1 overflow-hidden">

          <div className="flex justify-between">
         

            <div className="w-full flex justify-center p-4">
          <img
            ref={imgRef}
            src={streamUrl}
            width={640}
            height={480}
            alt="Live stream"
            className="rounded-xl border"
          />
        </div>

          </div>
        </div> */}
        <div className="bg-white w-full rounded-[26px] p-4 flex flex-col flex-1  justify-center
        overflow-hidden">
  <div className="flex justify-between">
    <div className="w-full flex flex-col justify-center items-center p-4">
      {streamUrl ? (
        <img
          ref={imgRef}
          src={streamUrl}
          width={640}
          height={480}
          alt="Live stream"
          className="rounded-xl border"
        />
      ) : (
        <div className="flex flex-col items-center ">
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
      )}
    </div>
  </div>
</div>

        {/* Right Section with Instructions and AI Analysis */}
        <div className="flex flex-col gap-4 w-[360px]">
          {/* Instructions Card */}
          <div className="bg-white rounded-[26px] max-h-[380px] flex flex-col">
            <div
         
             className="flex justify-between items-center p-4 pt-[16px] pb-[13px] border-b border-[#EFF4FE]">
              <h2 className="font-[600] text-[16px]">Instructions</h2>
              {instrucLoader ? (
                <Loader2 className="animate-spin text-indigo-500 w-4 h-4" />
              ) : (
                <button
                  className="bg-[#EBECFF] p-2 rounded"
                  onClick={() => setShowInstructionModal(true)}
                >
                  <Edit2 className="w-4 h-4 text-[#717AEA]" />
                </button>
              )}
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
          </div>

          {/* AI Analysis Card */}
          <div className="bg-white rounded-[26px]  flex flex-col max-h-[440px]">
            <div className="flex items-center justify-between p-4 pt-[24px] pb-[13px] mb-[13px] border-b border-[#EFF4FE]">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2">
                  <img src={ai} alt="AI" className="w-4 h-4" />
                </div>
                <h2 className="font-[400] text-[#1B1F4F] text-[14px]">AI Analysis</h2>
              </div>
            </div>

            {/* Logs Display with custom scrollbar */}
        
            <div
              ref={logsContainerRef}
         
              className="flex-1 overflow-y-auto p-4  hide-scrollbar scroll-smooth"
            >
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <div
                  key={`${log.person_id}-${log.timestamp}-${idx}`}
                  className={
                    `mb-6 p-4 bg-[#F5F9FF] rounded-lg 
                     border-2 
                     ${idx === 0 
                       ? 'border-blue-500'   
                       : 'border-transparent'} 
                     transition-all duration-500 ease-in-out`
                  }
                >
                    <div className="flex justify-between items-start">
                      <span className="text-[#464646] text-[13.32px] font-[400]">Camera:</span>
                      <span className="text-[#464646] text-[13.32px] font-[600]">
                        {log.camera_id}
                      </span>
                    </div>
                    <div className="space-y-0 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#464646] text-[13.32px] font-[400]">Region:</span>
                        <span className="text-[#464646] text-[13.32px] font-[600]">
                          {log.roi}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#464646] text-[13.32px] font-[400]">Event:</span>
                        <span
                          // className={`font-medium ${
                          //   log.event === "entry"
                          //     ? "text-green-600"
                          //     : log.event === "exit"
                          //     ? "text-red-600"
                          //     : "text-blue-600"
                          // }`}
                          className="text-[#F20A0A] text-[13.32px] font-[700]"
                        >
                          {log.event}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#464646] text-[13.32px] font-[400]">Timestamp:</span>
                        <span className="text-[#464646] text-[13.32px] font-[600]">
                          {format(new Date(log.timestamp), "EEE, HH:mm:ss")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 mt-4">
                  Waiting for events...
                </div>
              )}
            </div>

           
          </div>
        </div>
      </div>

      {/* Instruction Modal */}
      {showInstructionModal && (
        <InstructionModal
          onClose={() => setShowInstructionModal(false)}
          onSave={handleSaveInstruction}
          data={instructionset}
        />
      )}
    </div>
  );
};

export default LiveAi;
