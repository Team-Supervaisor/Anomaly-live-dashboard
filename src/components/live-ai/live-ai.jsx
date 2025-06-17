import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import logo from "../../assets/logo.png";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import FullscreenToggle from "../ui/Fullscreentoggle";

const LiveAi = () => {
  const [framesList, setFramesList] = useState([]);
  const [isTracking, setIsTracking] = useState(false);

  const socketRef = useRef(null);
  const socketRef2 = useRef(null);
  const ctrlSocketRef = useRef(null);

  const gridClasses = (count) => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count <= 4) return "grid-cols-2 grid-rows-2";
    if (count <= 6) return "grid-cols-3 grid-rows-2";
    return "grid-cols-3 grid-rows-3";
  };

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current.on("frames", (frames) => {
      console.log(frames)
      if (!frames || !Array.isArray(frames)) return;
      const urls = frames
        .map((data) => {
          if (!data || data.byteLength < 1000) return null;
          const blob = new Blob([data], { type: "image/jpeg" });
          return URL.createObjectURL(blob);
        })
        .filter(Boolean);
      setFramesList((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return urls;
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    socketRef2.current = io(import.meta.env.VITE_API_URL1, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });

    socketRef2.current.on("anomaly_alert", (arg1, arg2) => {
      console.log(arg1, arg2)
      const payload =
        typeof arg2 === "undefined" && typeof arg1 === "object" ? arg1 : arg2;
      const newItems = [];
      if (payload.anomaly_time && payload.anomaly_action) {
        newItems.push({ ...payload.anomaly_time, type: "Operation" });
        newItems.push({ ...payload.anomaly_action, type: "ActionAnomaly" });
      } else {
        newItems.push({ ...payload });
      }
    });

       socketRef2.current.on("anomaly_appear", (data) => {
        console.log(data, "anomaly_appear")
    });
  
    socketRef2.current.on("instructions_changed", (data) => {
      console.log(data, "instructions changed")
    });


    return () => {
      socketRef2.current.disconnect();
    };
  }, []);

  const handleStart = () => {
    const ctrlSocket = io(import.meta.env.VITE_API_URL1, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });
    ctrlSocket.on("connect", () => {
      socketRef.current?.emit("tracking_start");
      setIsTracking(true);
    });
    ctrlSocketRef.current = ctrlSocket;
  };

  const handleReset = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/reset`, { method: 'GET' });
    } catch (err) {
      console.error('Error calling /reset:', err);
    }
    if (ctrlSocketRef.current) {
      ctrlSocketRef.current.emit('frontend-disconnect');
      ctrlSocketRef.current.disconnect();
      ctrlSocketRef.current = null;
    }
    setIsTracking(false);
    setFramesList((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F9FF]">
      <header className="flex items-center p-4">
        <Link to="/" className="flex-none">
          <div className="flex items-center space-x-2">
            <img className="h-8 w-8" src={logo} alt="Logo" />
            <h2 className="text-[22px] text-black font-medium">Tracking Dashboard</h2>
          </div>
        </Link>
        <div className="flex-1 flex justify-center items-center gap-3 mt-5">
          <button
            onClick={handleStart}
            disabled={isTracking}
            className="flex items-center gap-2 px-4 py-2 rounded-[4rem] bg-[#717AEA] text-white"
          >
            {isTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isTracking ? 'Started' : 'Start'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border rounded-[4rem] text-[#717171] hover:bg-[#7171711A]"
          >
            <RotateCcw className="w-4 h-4 text-[#717171]" /> Reset
          </button>
        </div>
        <div className="p-3">
          <FullscreenToggle />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-[#F20A0A] bg-[#FFDDDB] text-[#F20A0A] rounded-[100px]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F20A0A] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F20A0A]" />
          </span>
          Live AI
        </button>
      </header>

      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        <div className="bg-white w-full rounded-[26px] p-4 flex flex-col flex-1 overflow-hidden">
          {framesList.length > 0 ? (
            <div className={`grid gap-4 h-full ${gridClasses(framesList.length)}`}>
              {framesList.map((url, index) => (
                <div key={index} className="relative aspect-video bg-gray-50 rounded-xl overflow-hidden">
                  <img src={url} className="w-full h-full object-cover rounded-xl" alt={`Stream ${index + 1}`} />
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-sm rounded">Stream {index + 1}</div>
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
      </div>
    </div>
  );
};

export default LiveAi;

