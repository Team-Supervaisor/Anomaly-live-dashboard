import React, { useEffect, useState } from 'react';
import { useLocation } from "react-router-dom";
import { format } from 'date-fns'; // For timestamp formatting
import { io } from 'socket.io-client';
import axios from 'axios';
import logo from '../assets/logo.png'
import ai from '../assets/ai.png'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

const LiveVideo = () => {

    const location = useLocation();
    const { data } = location.state || {};
    const [logs, setLogs] = useState([]);
    const [socket, setSocket] = useState(null);

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
                    <div className="flex-1 overflow-y-auto hide-scrollbar ">
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