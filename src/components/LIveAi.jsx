import React, { useEffect, useState, useRef } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import logo from "../assets/logo.png";
import ai from "../assets/ai.png";
import { RefreshCw, Edit2, Loader2, Play, RotateCcw } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import InstructionModal from './InstructionModal';
import AiModal from "./AiModal";
import FullscreenToggle from "./ui/Fullscreentoggle";

const LiveAi = () => {
  const [framesList, setFramesList] = useState([]);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [instructionset, setInstructionset] = useState('');
  const [instrucLoader, setInstrucLoader] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [aiData, setAiData] = useState({});
  const [aiAnalyzeitem, setAiAnalyzeitem] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [loader, setLoader] = useState(false);

  const socketRef = useRef(null);
  const socketRef2 = useRef(null);
  const ctrlSocketRef = useRef(null);

  const [showAllAnamoly, setShowAllAnamoly] = useState(false);
  const anomalyScrollContainerRef = useRef(null);
  // Placeholder formatter (replace with your real implementation)
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

  // Stub for the refresh button handler
  const handleRefreshAi = () => {};

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
      const payload =
        typeof arg2 === "undefined" && typeof arg1 === "object" ? arg1 : arg2;
      const newItems = [];
      if (payload.anomaly_time && payload.anomaly_action) {
        newItems.push({ ...payload.anomaly_time, type: "Operation" });
        newItems.push({ ...payload.anomaly_action, type: "ActionAnomaly" });
      } else {
        newItems.push({ ...payload });
      }
      setAiAnalyzeitem((prev) => [...prev, ...newItems]);
      setLoader(false);
    });

    socketRef2.current.on("anomaly_appear", (data) => {
      setAiAnalyzeitem((prev) => [...prev, data]);
      setLoader(false);
    });

    socketRef2.current.on("instructions_changed", () => {
      setInstrucLoader(false);
    });

    return () => {
      socketRef2.current.disconnect();
    };
  }, []);

  const handleSaveInstruction = (instruction) => {
    const socket = socketRef2.current;
    if (!socket || !socket.connected) return;
    setInstructionset(instruction);
    setInstrucLoader(true);
    socket.emit("instructions_changed", instruction, () => {
      setInstrucLoader(false);
      setShowInstructionModal(false);
    });
  };

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

  const openAimodal = (item) => {
    setAiData(item);
    setAiModal(true);
  };

  const handleSaveAiModal = (instruction) => {
    if (!socketRef2.current || !socketRef2.current.connected) return;
    socketRef2.current.emit("feedback", instruction, () => {
      setAiModal(false);
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

        {/* Right Section with Instructions and AI Analysis */}
        <div className="flex flex-col gap-4 w-[650px]">
          {/* Instructions Card */}
          <div className="bg-white rounded-[26px] max-h-[380px] flex flex-col">
            <div className="flex justify-between items-center p-4 pt-[16px] pb-[13px] border-b border-[#EFF4FE]">
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
          <div className="bg-white rounded-[26px] p-4 max-h-[380px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div
                className="flex items-center cursor-pointer"
                onClick={() => setShowAllAnamoly(true)}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2">
                  <img src={ai} alt="AI" className="w-4 h-4" />
                </div>
                <h2 className="font-medium text-lg">AI Analysis</h2>
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
              className="p-3 rounded-xl overflow-y-auto scrollbar-hidden flex-1"
            >
              <div className="logs-container">
                {aiAnalyzeitem.map((item, index) => (
                  <div
                    key={index}
                    className={`log-item ${item.isNew ? 'new-log' : ''}`}
                    style={{
                      width: '421px',
                      marginLeft: '8px',
                      borderRadius: '14px',
                      background: 'linear-gradient(90deg, rgba(113, 122, 234, 0.2) 0%, rgba(113, 122, 234, 0.08) 100%)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
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
                      <div className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]">
                        <div onClick={() => setShowAllAnamoly(true)} className="flex gap-2 mb-1 cursor-pointer">
                          <span className="font-medium">{index + 1}.</span>
                          <span className="text-black-700 font-semibold">{item.type}</span>
                        </div>
                        <ul onClick={() => setShowAllAnamoly(true)} className="rounded-md p-2 mt-1 text-black list-disc list-inside cursor-pointer">
                          <li>
                            <span className="font-medium">Order:</span>
                            <div className="flex flex-wrap items-center ml-5 mt-1">
                              {item.order.map((cp, i) => (
                                <React.Fragment key={`order-${i}`}>
                                  <span>{cp}</span>
                                  {i !== item.order.length - 1 && <span className="mx-1">→</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          </li>
                          <li>
                            <span className="font-medium">Current Anomaly:</span>
                            <ul className="list-disc list-inside ml-4 mt-1">
                              <li>Position: {item.current_anomaly.position}</li>
                              <li>Expected: {item.current_anomaly.expected}</li>
                              <li>Actual: {item.current_anomaly.actual}</li>
                            </ul>
                          </li>
                        </ul>
                        <div className="bg-[#EEEFFF] rounded-md p-2 mt-1 cursor-pointer flex justify-center items-center gap-2"
                             onClick={() => openAimodal(item)}>
                          <span className="text-[#5A62C8]">{item.type}</span>
                          <button className="text-xs text-[#5A62C8]">×</button>
                        </div>
                      </div>
                    ) : item.type === "ActionAnomaly" ? (
                      <div className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]">
                        <div onClick={() => setShowAllAnamoly(true)} className="flex gap-2 mb-1 cursor-pointer">
                          <span className="font-medium">{index + 1}.</span>
                          <span className="text-black-700 font-semibold">{item.type}</span>
                        </div>
                        <p>{item.detail}</p>
                        <div className="bg-[#EEEFFF] rounded-md p-2 mt-1 cursor-pointer flex justify-center items-center gap-2"
                             onClick={() => openAimodal(item)}>
                          <span className="text-[#5A62C8]">{item.type}</span>
                          <button className="text-xs text-[#5A62C8]">×</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInstructionModal && (
        <InstructionModal
          onClose={() => setShowInstructionModal(false)}
          onSave={handleSaveInstruction}
          data={instructionset}
        />
      )}
      {aiModal && (
        <AiModal data={aiData} onClose={() => setAiModal(false)} onSave={handleSaveAiModal} />
      )}
    </div>
  );
};

export default LiveAi;

