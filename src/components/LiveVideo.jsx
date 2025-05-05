import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from "react-router-dom";
import { format } from 'date-fns'; // For timestamp formatting
import { io } from 'socket.io-client';
import logo from '../assets/logo.png'
import ai from '../assets/ai.png'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import Hls from 'hls.js';
import axios from 'axios';

const playbackPositions = {};

const VideoCanvasPlayer = ({ hlsUrl, id }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const hlsRef = useRef(null)


    const playbackStateRef = useRef({
        currentTime: playbackPositions[id] || 0,
        isInitialized: false
    })

    // HLS setup
    useEffect(() => {
        const video = videoRef.current
        if (!video || !hlsUrl) return

        if (Hls.isSupported()) {
            // Store current time before setting up new HLS instance
            if (hlsRef.current && videoRef.current) {
                playbackStateRef.current.currentTime = videoRef.current.currentTime
                playbackPositions[id] = videoRef.current.currentTime
            }

            const hls = new Hls({
                maxBufferSize: 30 * 1000 * 1000, // 30MB buffer
                maxBufferLength: 60, // 60 seconds buffer
                enableWorker: true, // Enable web worker
                lowLatencyMode: true, // Enable low latency mode
                backBufferLength: 90, // 90 seconds backward buffer
                startPosition: playbackStateRef.current.currentTime // Start from saved position
            })

            hlsRef.current = hls

            hls.loadSource(hlsUrl)
            hls.attachMedia(video)

            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                // Only set the time if we've played before
                if (playbackStateRef.current.isInitialized &&
                    playbackStateRef.current.currentTime > 0) {
                    video.currentTime = playbackStateRef.current.currentTime
                }

                video.play()
                    .then(() => {
                        playbackStateRef.current.isInitialized = true
                    })
                    .catch(err => console.error("Play failed:", err))
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError()
                            break
                        default:
                            hls.destroy()
                            break
                    }
                }
            })

            // Store current time periodically to maintain position
            const timeUpdateHandler = () => {
                if (video.currentTime > 0) {
                    playbackStateRef.current.currentTime = video.currentTime
                    playbackPositions[id] = video.currentTime
                }
            }

            video.addEventListener('timeupdate', timeUpdateHandler)

            return () => {
                video.removeEventListener('timeupdate', timeUpdateHandler)
                // Don't destroy HLS here to maintain state between renders
            }
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl
            video.addEventListener('loadedmetadata', () => {
                if (playbackStateRef.current.currentTime > 0) {
                    video.currentTime = playbackStateRef.current.currentTime
                }
                video.play()
                    .catch(err => console.error("Play failed:", err))
            })
        }
    }, [hlsUrl, id]) // Re-run if URL changes

    // Save playback position before unmount
    useEffect(() => {
        return () => {
            if (videoRef.current) {
                const currentTime = videoRef.current.currentTime
                if (currentTime > 0) {
                    playbackStateRef.current.currentTime = currentTime
                    playbackPositions[id] = currentTime
                }
            }

            if (hlsRef.current) {
                hlsRef.current.destroy()
                hlsRef.current = null
            }
        }
    }, [id])

    return (
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-black aspect-video">
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
            />
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
            />
        </div>
    );
};

const LiveVideo = () => {
    const location = useLocation();
    const { data } = location.state || {};
    const [logs, setLogs] = useState([]);
    const [socket, setSocket] = useState(null);
    const logsContainerRef = useRef(null);

    console.log('Data from location:', data);
    // Mock data for testing
    const mockLogs = [
        {
            person_id: 1,
            camera_id: 0,
            roi: "entrance",
            event: "entry",
            timestamp: "2025-05-01T16:43:58.851"
        },
        {
            person_id: 2,
            camera_id: 0,
            roi: "entrance",
            event: "entry",
            timestamp: "2025-05-01T16:43:59.642"
        },
        {
            person_id: 1,
            camera_id: 0,
            roi: "exit",
            event: "exit",
            timestamp: "2025-05-01T16:44:30.123"
        },
        {
            person_id: 3,
            camera_id: 1,
            roi: "restricted_area",
            event: "entry",
            timestamp: "2025-05-01T16:45:12.445"
        }
        ,
        {
            person_id: 4,
            camera_id: 1,
            roi: "restricted_area",
            event: "exit",
            timestamp: "2025-05-01T16:45:30.123"
        },
        {
            person_id: 5,
            camera_id: 2,
            roi: "entrance",
            event: "entry",
            timestamp: "2025-05-01T16:46:12.445"
        },
        {
            person_id: 6,
            camera_id: 2,
            roi: "entrance",
            event: "entry",
            timestamp: "2025-05-01T16:46:30.123"
        },
        {
            person_id: 7,
            camera_id: 3,
            roi: "restricted_area",
            event: "entry",
            timestamp: "2025-05-01T16:47:12.445"
        },
        {
            person_id: 8,
            camera_id: 3,
            roi: "restricted_area",
            event: "exit",
            timestamp: "2025-05-01T16:47:30.123"
        }
    ];

    useEffect(() => {
        const startStream = async () => {
            const apiUrl = import.meta.env.VITE_API_URL;
          try {
            await axios.post(`${apiUrl}/start_tracking`);
            console.log('Stream started successfully');
          } catch (error) {
            console.error('Failed to start stream:', error);
          }
        };
    
        startStream();
      }, []);

    // Helper function to convert data object to array format
    const formatVideoData = (data) => {
        if (!data || !data.hls_urls) return [];
        
        return Object.entries(data.hls_urls).map(([videoName, hlsUrl]) => ({
            videoName,
            hlsUrl,
            path: data.video_paths[videoName]
        }));
    };

    const gridClasses = () => {
        if (!data || !data.hls_urls) return 'grid-cols-1';
        
        const len = Object.keys(data.hls_urls).length;
        if (len === 1) return 'grid-cols-1 grid-rows-1';
        if (len === 2) return 'grid-cols-2 grid-rows-1';
        if (len <= 4) return 'grid-cols-2 grid-rows-2';
        if (len <= 6) return 'grid-cols-3 grid-rows-2';
        return 'grid-cols-1'; // fallback
    };

    useEffect(() => {
        // Initialize socket connection
        const socketInstance = io(import.meta.env.VITE_API_URL);
        setSocket(socketInstance);

        // Listen for logs updates
        socketInstance.on('logs', (data) => {
            // Simply set the new logs without appending
            if (data.logs) {
                setLogs(data.logs);
            }
        });

        // Cleanup on unmount
        return () => {
            if (socketInstance) {
                socketInstance.disconnect();
            }
        };
    }, []);

    // Simulate socket updates every 3 seconds
    useEffect(() => {
        setLogs(mockLogs);
        
        const interval = setInterval(() => {
            // Rotate the logs array to simulate updates
            setLogs(prevLogs => {
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
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]); 
    
    // Scroll whenever logs update
    useEffect(() => {
        setLogs(mockLogs);
        
        const interval = setInterval(() => {
            // Rotate the logs array to simulate updates
            setLogs(prevLogs => {
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
        return format(new Date(timestamp), 'HH:mm:ss');
    };

    // Function to get event color
    const getEventColor = (event) => {
        switch (event) {
            case 'entry':
                return 'text-green-600';
            case 'exit':
                return 'text-red-600';
            default:
                return 'text-blue-600';
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#F5F9FF]">
            <header className="flex justify-between items-center p-4 pb-2 ">
                <Link to="/">
                    <div className="flex items-center space-x-2 cursor-pointer">
                        <div className="rounded">
                            <img className="h-8 w-8" src={logo} alt="Logo" />
                        </div>
                        <h2 className="text-[22px] text-black font-medium">Anomaly Dashboard</h2>
                    </div>
                </Link>
            </header>


            <div className="flex flex-1 p-4 gap-4 overflow-hidden mt-2">
                {/* Left Section */}
                <div className="bg-white w-full rounded-[26px] p-4 flex flex-col">
                    <div className='flex justify-between'>
                        {/* hls videos */}

                        <div className={`grid ${gridClasses()} gap-4 w-full p-4`}>
                            {data && formatVideoData(data).map((video, idx) => (
                                <VideoCanvasPlayer 
                                    key={idx} 
                                    hlsUrl={video.hlsUrl} 
                                    id={idx} 
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Analysis Card */}
                <div className="bg-white rounded-[26px] p-4 w-[360px] flex flex-col ">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2">
                                <img src={ai} alt="AI" className="w-4 h-4" />
                            </div>
                            <h2 className="font-medium text-lg">AI Analysis</h2>
                        </div>
                    </div>

                    {/* Logs Display with custom scrollbar */}
                    <div 
                        ref={logsContainerRef}
                        className="flex-1 overflow-y-auto hide-scrollbar scroll-smooth"
                    >
                        {logs.map((log, index) => (
                            <div 
                                key={`${log.person_id}-${log.timestamp}-${index}`}
                                className="mb-6 p-4 bg-[#F5F9FF] rounded-lg"
                            >
                                <div className="flex justify-between items-start ">
                                    <span className="text-gray-600">Camera: </span>
                                    <span className="text-sm text-gray-500">
                                        {log.camera_id}
                                    </span>
                                </div>
                                <div className="space-y-0 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Region:</span>
                                        <span className="font-medium text-gray-800">{log.roi}</span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Event:</span>
                                        <span className={`font-medium ${
                                            log.event === 'entry' ? 'text-green-600' : 
                                            log.event === 'exit' ? 'text-red-600' : 
                                            'text-blue-600'
                                        }`}>
                                            {log.event}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Timestamp:</span>
                                        <span className="font-medium text-gray-800">{format(new Date(log.timestamp), 'EEE, HH:mm:ss')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-center text-gray-500 mt-4">
                                Waiting for events...
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    )

}

export default LiveVideo