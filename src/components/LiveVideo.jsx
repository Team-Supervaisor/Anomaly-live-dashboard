import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns"; // For timestamp formatting
import { io } from "socket.io-client";
import logo from "../assets/logo.png";
import ai from "../assets/ai.png";
import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Hls from "hls.js";
import axios from "axios";
import { Loader2, Play } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';



const LiveVideo = () => {
  const location = useLocation();
  const { data } = location.state || {};
  const [logs, setLogs] = useState([]);
  const [socket, setSocket] = useState(null);
  const logsContainerRef = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const socketRef = useRef(null);
  const imgRef = useRef(null);
  const [framesList, setFramesList] = useState([]);

  // console.log("Data from location:", data);
  // Mock data for testing
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

  // const gridClasses = () => {
  //   if (!data || !data.hls_urls) return "grid-cols-1";

  //   const len = Object.keys(data.hls_urls).length;
  //   if (len === 1) return "grid-cols-1 grid-rows-1";
  //   if (len === 2) return "grid-cols-2 grid-rows-1";
  //   if (len <= 4) return "grid-cols-2 grid-rows-2";
  //   if (len <= 6) return "grid-cols-3 grid-rows-2";
  //   return "grid-cols-1"; // fallback
  // };
  const gridClasses = (count) => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count <= 4) return "grid-cols-2 grid-rows-2";
    if (count <= 6) return "grid-cols-3 grid-rows-2";
    return "grid-cols-3 grid-rows-3"; // fallback for more videos
  };

  // useEffect(() => {
  //   const socketInstance = io(import.meta.env.VITE_API_URL);
  //   setSocket(socketInstance);

  //   socketInstance.emit("logs");


  //   socketInstance.on("log_update", (payload) => {
  //     // payload is coming in as an array:
  //     // [
  //     //   { person_id: 1, camera_id: "Video 1", roi: "inside", event: "entry", timestamp1: "2025-05-06T23:01:23.454" },
  //     //   …
  //     // ]
  //     setLogs(Array.isArray(payload) ? payload : []);
  //   });

  //   return () => {
  //     socketInstance.disconnect();
  //   };
  // }, []);

  // Simulate socket updates every 3 seconds
 

  // Add this effect to handle auto-scrolling
  useEffect(() => {
    if (logsContainerRef.current && logs.length > 0) {
      logsContainerRef.current.scrollTo({
        top: logsContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  

  // Scroll whenever logs update
  // useEffect(() => {
  //   setLogs(mockLogs);

  //   const interval = setInterval(() => {
  //     // Rotate the logs array to simulate updates
  //     setLogs((prevLogs) => {
  //       const rotated = [...prevLogs];
  //       const last = rotated.pop();
  //       if (last) rotated.unshift(last);
  //       return rotated;
  //     });
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, []);

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

  // Socket connection setup
 // Update the socket effect with enhanced logging
useEffect(() => {
  socketRef.current = io(import.meta.env.VITE_API_URL, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });

  socketRef.current.on("connect", () => {
    console.log("Socket connected");
  });

  // Listen for frames with logging
  // socketRef.current.on("frames", (data) => {
  //   console.log("Received frame data:", {
  //     // received: data,
  //     byteLength: data?.byteLength,
  //     // timestamp: new Date().toISOString()
  //   });

  //   if (!data || data.byteLength < 1000) {
  //     console.warn("Invalid frame data received");
  //     return;
  //   }

  //   const blob = new Blob([data], { type: "image/jpeg" });
  //   const url = URL.createObjectURL(blob);
  //   setStreamUrl(prev => {
  //     if (prev) URL.revokeObjectURL(prev);
  //     return url;
  //   });
  // });

  // Update the frames socket listener
socketRef.current.on("frames", (frames) => {
  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    console.warn("Invalid frames data received");
    return;
  }

  console.log("Received frames:", {
    count: frames.length,
    timestamp: new Date().toISOString()
  });

  // Process all frames into URLs
  const frameUrls = frames.map(frameData => {
    if (!frameData || frameData.byteLength < 1000) return null;
    const blob = new Blob([frameData], { type: "image/jpeg" });
    return URL.createObjectURL(blob);
  }).filter(Boolean); // Remove any null values

  // Update state with new frame URLs
  setFramesList(prevUrls => {
    // Clean up old URLs
    prevUrls.forEach(url => URL.revokeObjectURL(url));
    return frameUrls;
  });
});

  // Listen for logs with enhanced logging
  socketRef.current.on("logs", (logData) => {
    console.log("Received log data:", {
      data: logData,
      // type: logData?.event_type,
      // timestamp: new Date().toISOString()
    });
    
    // Append new log to existing logs
    setLogs(prevLogs => {
      // Keep only last 80 logs to prevent too much memory usage
      const updatedLogs = [...prevLogs, logData].slice(-80);
      return updatedLogs;
    });
  });

  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };
}, []);

  const handleStart = () => {
    if (socketRef.current) {
      console.log("Starting tracking...");
      socketRef.current.emit("start_tracking");
      setIsTracking(true);
    }
  };

  const formatTimeStamp = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, "EEE, HH:mm:ss");
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };
  

  return (
    <div className="flex flex-col h-screen bg-[#F5F9FF]">
       <header className="flex items-center justify-between p-4 pb-2 relative">
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
        
        {/* Center the button absolutely */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <button
            onClick={handleStart}
            disabled={isTracking}
            className={`flex items-center gap-2 px-4 py-2 mt-5 rounded-[4rem] font-medium transition-colors
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
        </div>
        
        {/* Add an empty div to maintain flex spacing */}
        <div className="flex-none w-[100px]"></div>
      </header>

      <div className="flex flex-1 p-4 gap-4 overflow-hidden mt-2">
        {/* Left Section */}
        <div className="bg-white w-full rounded-[26px] p-4 flex flex-col flex-1 overflow-hidden">
  {framesList.length > 0 ? (
    <div className={`grid gap-4 h-full ${gridClasses(framesList.length)}`}>
      {framesList.map((frameUrl, index) => (
        <div 
          key={`frame-${index}`} 
          className="relative aspect-video bg-gray-50 rounded-xl overflow-hidden"
        >
          <img
            src={frameUrl}
            className="w-full h-full object-cover rounded-xl"
            alt={`Video stream ${index + 1}`}
            loading="lazy"
          />
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-sm rounded">
            Stream {index + 1}
          </div>
        </div>
      ))}
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

        {/* AI Analysis Card */}
        <div className="bg-white rounded-[26px] p-4 flex flex-col w-[360px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2">
                <img src={ai} alt="AI" className="w-4 h-4" />
              </div>
              <h2 className="font-medium text-lg">AI Analysis</h2>
            </div>
          </div>

          <div 
            ref={logsContainerRef}
            className="space-y-4 bg-[#EFF4FF] p-[12px] rounded-[12px] overflow-y-auto scrollbar-hidden flex-1"
          >
            <div className="flex flex-col gap-2">
          {logs.map((log, index) => (
            <div
              key={`${log.person_id}-${log.event_type}-${index}`}
              className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]"
            >
              <div className="flex gap-2 mb-1">
                <span className="text-black-700 font-semibold">
                  {log.camera_id}
                </span>
              </div>

              <ul className="rounded-md p-2 mt-1 text-black list-disc list-inside">
                <li>Camera: {log.camera_id}</li>
                <li>Region: {log.roi}</li>
                {log.event_type && <li>Event Type: {log.event_type}</li>}
                {log.person_id && (
                  <li>Person ID: {log.person_id}</li>
                )}
                {log.event_type === "region" ? (
                  log.timestamp && <li>Time: {formatTimeStamp(log.timestamp)}</li>
                ) : (
                  <>
                    {log.start_timestamp && (
                      <li>Start: {formatTimeStamp(log.start_timestamp)}</li>
                    )}
                    {log.end_timestamp && (
                      <li>End: {formatTimeStamp(log.end_timestamp)}</li>
                    )}
                  </>
                )}
              </ul>

              <div className="bg-[#EEEFFF] rounded-md p-2 mt-1 flex justify-center items-center gap-2">
                <span className="text-[#5A62C8]">
                  {log?.event_value?.charAt(0).toUpperCase() + log?.event_value?.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveVideo;
