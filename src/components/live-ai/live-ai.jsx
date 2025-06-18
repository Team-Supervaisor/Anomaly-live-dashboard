import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import logo from "../../assets/logo.png";
import { Loader2, Play, RotateCcw, Users, Activity } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import FullscreenToggle from "../ui/Fullscreentoggle";
import "./LiveAi.css";

const LiveAi = () => {
  const [framesList, setFramesList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [isTracking, setIsTracking] = useState(false);

  const socketRef = useRef(null);
  const ctrlSocketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, { transports: ["websocket"], reconnectionAttempts: 5 });
    socketRef.current = socket;

    socket.on("frames", (frames) => {
      if (!Array.isArray(frames)) return;
      const urls = frames
        .map((data) => (data && data.byteLength > 1000 ? URL.createObjectURL(new Blob([data], { type: "image/jpeg" })) : null))
        .filter(Boolean);
      setFramesList((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return urls;
      });
    });

    socket.on("logs", (logEntry) => setLogsList((prev) => [logEntry, ...prev]));

    const ctrlSocket = io(import.meta.env.VITE_API_URL, { transports: ["websocket"], reconnectionAttempts: 5 });
    ctrlSocket.on("connect", () => {
      socket.emit("tracking_start");
      setIsTracking(true);
    });
    ctrlSocketRef.current = ctrlSocket;

    return () => {
      socket.disconnect();
      ctrlSocket.emit("frontend-disconnect");
      ctrlSocket.disconnect();
      setFramesList((prev) => { prev.forEach(URL.revokeObjectURL); return []; });
      setLogsList([]);
    };
  }, []);
  
  const regionMap = useMemo(() => {
    const map = {};
    logsList.forEach(({ roi, person_id, event_value }) => {
      if (!roi) return;
      if (!map[roi]) map[roi] = new Set();
      if (event_value === "entry") {
        map[roi].add(person_id);
      } else if (event_value === "exit") {
        map[roi].delete(person_id);
      }
    });
    return Object.fromEntries(
      Object.entries(map).map(([region, idSet]) => [region, Array.from(idSet)])
    );
  }, [logsList]);
  
  const totalEntriesByRegion = useMemo(() => {
    const totals = {};
    logsList.forEach(({ roi, event_value }) => {
      if (!roi || event_value !== "entry") return;
      totals[roi] = (totals[roi] || 0) + 1;
    });
    return totals;
  }, [logsList]);

  const totalPeople = Object.values(regionMap).reduce((sum, people) => sum + people.length, 0);

  const handleStart = () => {
    if (ctrlSocketRef.current && !isTracking) {
      socketRef.current.emit("tracking_start");
      setIsTracking(true);
    }
  };

  const handleReset = async () => {
    try { await fetch(`${import.meta.env.VITE_API_URL}/reset`, { method: 'GET' }); } catch (err) { console.error("Error calling /reset:", err); }
    if (ctrlSocketRef.current) {
      ctrlSocketRef.current.emit("frontend-disconnect");
      ctrlSocketRef.current.disconnect();
    }
    setIsTracking(false);
    setFramesList((prev) => { prev.forEach(URL.revokeObjectURL); return []; });
    setLogsList([]);
  };
  
  const HeatMap = () => {
    const width = 280;
    const height = 200;
    
    const regions = [
      { id: "R1", value: totalEntriesByRegion["Region 1"]?.length || 0, x: 70, y: 150, radius: Math.max((totalEntriesByRegion["Region 1"]?.length || 0) * 8, 20) },   
      { id: "R2", value: totalEntriesByRegion["Region 2"]?.length || 0, x: 200, y: 80, radius: Math.max((totalEntriesByRegion["Region 2"]?.length || 0) * 8, 20) },  
    ];

    return (
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-700">Heat Map</h3>
        </div>
        <svg width={width} height={height} className="border rounded">
          <rect width="100%" height="100%" fill="#f0f9ff" />
          <defs>
            {regions.map((r) => (
              <radialGradient
                key={r.id}
                id={`grad-${r.id}`}
                cx="50%"
                cy="50%"
                r="50%"
                fx="50%"
                fy="50%"
              >
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#eab308" />
              </radialGradient>
            ))}
          </defs>

          {regions.map((r) => (
            <g key={r.id}>
              <circle
                cx={r.x}
                cy={r.y}
                r={r.radius}
                fill={`url(#grad-${r.id})`}
                opacity={0.7}
              />
              <text
                x={r.x}
                y={r.y}
                fill="#fff"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                dy="0.35em"
              >
                {r.id}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F9FF]">
      <header className="flex items-center p-4 bg-white shadow">
        <Link to="/" className="flex-none">
          <div className="flex items-center space-x-2">
            <img className="h-8 w-8" src={logo} alt="Logo" />
            <h2 className="text-xl font-medium text-black">Tracking Dashboard</h2>
          </div>
        </Link>
        <div className="flex-1 flex justify-center items-center gap-3">
          <button onClick={handleStart} disabled={isTracking} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#717AEA] text-white disabled:opacity-50">
            {isTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {isTracking ? "Started" : "Start"}
          </button>
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 border rounded-full text-gray-600 hover:bg-gray-100">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <FullscreenToggle />
          <button className="flex items-center gap-2 px-4 py-2 border border-red-600 bg-red-100 text-red-600 rounded-full">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" /></span>
            Live AI
          </button>
        </div>
      </header>

      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        <div className="flex flex-col flex-1 gap-4">
          <div className="bg-white rounded-2xl p-4 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-medium">Live Video Feeds</h3>
            </div>
            
            {framesList.length >= 2 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {framesList.slice(0, 2).map((url, idx) => (
                  <div key={idx} className="relative bg-gray-50 rounded-xl overflow-hidden aspect-video">
                    <img src={url} alt={`Region ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1 text-sm rounded-full">
                      Region {idx + 1}
                    </div>
                    {/* Green dots overlay for detected regions */}
                    <div className="absolute top-3 right-3 flex gap-1">
                      {(regionMap[`Region ${idx + 1}`] || []).map((personId, i) => (
                        <div key={personId} className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <DotLottieReact src="https://lottie.host/444798af-70b8-4920-a17d-c009411cfb64/a81fXDiwEN.lottie" loop autoplay className="w-32 h-32" />
                <p className="mt-4 text-gray-600 text-lg">AI analyzing video feeds</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - People Count and Analytics */}
        <div className="w-80 flex flex-col gap-4">
          {/* People Count Dashboard */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-medium">People Count</h3>
              <span className="ml-auto bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium">Live</span>
            </div>
            
            {/* Region Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-700">Region 1</span>
                <span className="text-2xl font-bold text-blue-600">{regionMap["Region 1"]?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-700">Region 2</span>
                <span className="text-2xl font-bold text-green-600">{regionMap["Region 2"]?.length || 0}</span>
              </div>
            </div>

            {/* Total People */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Total People</span>
                <span className="text-3xl font-bold text-gray-800">{totalPeople}</span>
              </div>
            </div>
          </div>

          {/* Heat Map */}
          <HeatMap />

          {/* Live Activity Log */}
          <div className="bg-white rounded-2xl p-4 flex-1 overflow-hidden">
            <h3 className="text-lg font-medium mb-4">Live Activity</h3>
            <div className="overflow-y-auto h-full">
              {logsList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activity detected yet.</p>
              ) : (
                <div className="space-y-3">
                  {logsList.slice(0, 10).map((log, idx) => {
                    const typeLabel = log.event_value.charAt(0).toUpperCase() + log.event_value.slice(1);
                    const isEntry = log.event_value === "entry";
                    return (
                      <div key={idx} className="fade-in-down bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isEntry ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {typeLabel}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm"><span className="font-medium">Person:</span> {log.person_id}</p>
                        <p className="text-sm"><span className="font-medium">Location:</span> {log.roi || "Unknown"}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAi;