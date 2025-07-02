import React, { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { io } from "socket.io-client";
import logo from "../../assets/logo.png";
import ai from "../../assets/ai.png";
import { Link } from "react-router-dom";
import { Loader2, Play } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LiveVideo = () => {
  const [logs, setLogs] = useState([]);
  const logsContainerRef = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const socketRef = useRef(null);
  const [framesList, setFramesList] = useState([]);

  const gridClasses = (count) => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count <= 4) return "grid-cols-2 grid-rows-2";
    if (count <= 6) return "grid-cols-3 grid-rows-2";
    return "grid-cols-3 grid-rows-3";
  };

  // Add this effect to handle auto-scrolling
  useEffect(() => {
    if (logsContainerRef.current && logs.length > 0) {
      logsContainerRef.current.scrollTo({
        top: logsContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {});

    // Update the frames socket listener
    socketRef.current.on("frames", (frames) => {
      if (!frames || !Array.isArray(frames) || frames.length === 0) {
        console.warn("Invalid frames data received");
        return;
      }

      // Process all frames into URLs
      const frameUrls = frames
        .map((frameData) => {
          if (!frameData || frameData.byteLength < 1000) return null;
          const blob = new Blob([frameData], { type: "image/jpeg" });
          return URL.createObjectURL(blob);
        })
        .filter(Boolean);

      setFramesList((prevUrls) => {
        prevUrls.forEach((url) => URL.revokeObjectURL(url));
        return frameUrls;
      });
    });

    socketRef.current.on("logs", (logData) => {
      console.log(logData, "logs from socket");
      setLogs((prevLogs) => {
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
      if (!timestamp) return "N/A";
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "EEE, HH:mm:ss");
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid Date";
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
              ${
                isTracking
                  ? "bg-[#717AEA] text-white hover:bg-[#717AEA]"
                  : "bg-[#717AEA] text-white hover:bg-[#717AEA]"
              }`}
          >
            {isTracking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isTracking ? "Started" : "Start"}
          </button>
        </div>

        {/* Add an empty div to maintain flex spacing */}
        <div className="flex-none w-[100px]"></div>
      </header>

      <div className="flex flex-1 p-4 gap-4 overflow-hidden mt-2">
        {/* Left Section */}
        <div className="bg-white w-full rounded-[26px] p-4 flex flex-col flex-1 overflow-hidden">
          {framesList.length > 0 ? (
            <div
              className={`grid gap-4 h-full ${gridClasses(framesList.length)}`}
            >
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
                    {log.person_id && <li>Person ID: {log.person_id}</li>}
                    {log.event_type === "region" ? (
                      log.timestamp && (
                        <li>Time: {formatTimeStamp(log.timestamp)}</li>
                      )
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
                      {log?.event_value?.charAt(0).toUpperCase() +
                        log?.event_value?.slice(1)}
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
