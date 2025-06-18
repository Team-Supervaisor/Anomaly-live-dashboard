import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import logo from "../../assets/logo.png";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import FullscreenToggle from "../ui/Fullscreentoggle";
import "./LiveAi.css"; // contains .fade-in-down keyframes

const LiveAi = () => {
  const [framesList, setFramesList] = useState([]);
  const [logsList, setLogsList]     = useState([]);
  const [isTracking, setIsTracking] = useState(false);

  const socketRef     = useRef(null);
  const ctrlSocketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("frames", (frames) => {
      if (!Array.isArray(frames)) return;
      const urls = frames
        .map((data) => (
          data && data.byteLength > 1000
            ? URL.createObjectURL(new Blob([data], { type: "image/jpeg" }))
            : null
        ))
        .filter(Boolean);
      setFramesList((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return urls;
      });
    });

    socket.on("logs", (logEntry) => {
      setLogsList((prev) => [logEntry, ...prev]);
    });

    const ctrlSocket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    ctrlSocket.on("connect", () => {
      socket.emit("tracking_start");
      setIsTracking(true);
    });
    ctrlSocketRef.current = ctrlSocket;

    return () => {
      socket.disconnect();
      ctrlSocket.emit("frontend-disconnect");
      ctrlSocket.disconnect();
      setFramesList((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return [];
      });
      setLogsList([]);
    };
  }, []);

  const handleStart = () => {
    if (ctrlSocketRef.current && !isTracking) {
      socketRef.current.emit("tracking_start");
      setIsTracking(true);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/reset`, { method: 'GET' });
    } catch (err) {
      console.error("Error calling /reset:", err);
    }
    if (ctrlSocketRef.current) {
      ctrlSocketRef.current.emit("frontend-disconnect");
      ctrlSocketRef.current.disconnect();
    }
    setIsTracking(false);
    setFramesList((prev) => {
      prev.forEach(URL.revokeObjectURL);
      return [];
    });
    setLogsList([]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F9FF]">
      {/* Header */}
      <header className="flex items-center p-4 bg-white shadow">
        <Link to="/" className="flex-none">
          <div className="flex items-center space-x-2">
            <img className="h-8 w-8" src={logo} alt="Logo" />
            <h2 className="text-xl font-medium text-black">
              Tracking Dashboard
            </h2>
          </div>
        </Link>
        <div className="flex-1 flex justify-center items-center gap-3">
          <button
            onClick={handleStart}
            disabled={isTracking}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#717AEA] text-white disabled:opacity-50"
          >
            {isTracking 
              ? <Loader2 className="w-4 h-4 animate-spin" /> 
              : <Play className="w-4 h-4"/>}
            {isTracking ? "Started" : "Start"}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border rounded-full text-gray-600 hover:bg-gray-100"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <FullscreenToggle />
          <button className="flex items-center gap-2 px-4 py-2 border border-red-600 bg-red-100 text-red-600 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            Live AI
          </button>
        </div>
      </header>

      {/* Main: videos over logs on small, side‑by‑side on md+ */}
      <div className="flex flex-col md:flex-row flex-1 p-4 gap-4 overflow-hidden">
        {/* Video Grid */}
        <div className="bg-white rounded-2xl p-4 flex-1 overflow-auto w-full md:w-3/4">
          {framesList.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {framesList.map((url, idx) => (
                <div key={idx} className="relative aspect-video bg-gray-50 rounded-xl overflow-hidden">
                  <img
                    src={url}
                    className="w-full h-full object-cover"
                    alt={`Stream ${idx + 1}`}
                  />
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-sm rounded">
                    Stream {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <DotLottieReact
                src="https://lottie.host/444798af-70b8-4920-a17d-c009411cfb64/a81fXDiwEN.lottie"
                loop autoplay
                className="w-32 h-32"
              />
              <p className="mt-4 text-gray-600 text-lg">AI analyzing video</p>
            </div>
          )}
        </div>

        {/* Live View */}
        <div className="bg-white rounded-2xl p-4 overflow-auto w-full md:w-1/4 h-64 md:h-auto">
          <h3 className="text-lg font-medium mb-4">Live View</h3>
          {logsList.length === 0 ? (
            <p className="text-gray-500">No events yet.</p>
          ) : (
            <div className="space-y-4">
              {logsList.map((log, idx) => {
                const typeLabel =
                  log.event_type.charAt(0).toUpperCase() + log.event_type.slice(1);

                return (
                  <div
                    key={idx}
                    className="fade-in-down bg-gray-50 shadow rounded-lg p-4 flex items-start space-x-3"
                  >
                    <span className="flex-none w-3 h-3 bg-red-500 rounded-full animate-pulse mt-1" />
                    <div className="flex-1 space-y-1">
                      <p>
                        <span className="font-semibold">Person ID:</span> {log.person_id}
                      </p>
                      <p>
                        <span className="font-semibold">Type:</span> {typeLabel}
                      </p>
                      <p>
                        <span className="font-semibold">Event:</span> {log.event_value}
                      </p>
                      <p>
                        <span className="font-semibold">Region:</span> {log.roi || "N/A"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAi;
