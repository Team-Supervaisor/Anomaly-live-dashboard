import React, { useEffect, useRef } from 'react'
import { useLocation } from "react-router-dom";

import logo from '../assets/logo.png'
import ai from '../assets/ai.png'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import Hls from 'hls.js';
import axios from 'axios';

const LiveVideo = () => {

    const canvasRefs = useRef([]);
    const videoRefs = useRef([]);
    const location = useLocation();
    // const { data } = location.state || {};
    const data = [
        {
            "hls_urls": {
                "Video 1": "http://127.0.0.1:5000/hls/Video%201/index.m3u8"
            },
            "roi_defs_file": "test_data/roi_definitions.json",
            "status": "ok",
            "video_paths": {
                "Video 1": "test_data\\Video 1.mp4"
            }
        },
        {
            "hls_urls": {
                "Video 1": "http://127.0.0.1:5000/hls/Video%201/index.m3u8"
            },
            "roi_defs_file": "test_data/roi_definitions.json",
            "status": "ok",
            "video_paths": {
                "Video 1": "test_data\\Video 1.mp4"
            }
        },

    ]

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
        data.forEach((item, index) => {
            const videoEl = videoRefs.current[index];
            const videoName = Object.keys(item.hls_urls)[0];
            const hlsUrl = item.hls_urls[videoName];

            if (Hls.isSupported() && videoEl) {
                const hls = new Hls();
                hls.loadSource(hlsUrl);
                hls.attachMedia(videoEl);
            } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = hlsUrl;
            }
        });
    }, [data]);

    const gridClasses = () => {
        const len = data.length;
        if (len === 1) return 'grid-cols-1 grid-rows-1';
        if (len === 2) return 'grid-cols-2 grid-rows-1';
        if (len <= 4) return 'grid-cols-2 grid-rows-2';
        if (len <= 6) return 'grid-cols-3 grid-rows-2';
        return 'grid-cols-1'; // fallback
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

                        <div className={`grid gap-4 ${gridClasses()} w-full h-full`}>
                            {data.map((item, index) => {
                                const videoName = Object.keys(item.hls_urls)[0];

                                return (
                                    <div key={index} className="relative w-full h-full bg-black rounded-lg overflow-hidden">
                                        <canvas
                                            ref={(el) => (canvasRefs.current[index] = el)}
                                            className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
                                        />
                                        <video
                                            ref={(el) => (videoRefs.current[index] = el)}
                                            muted
                                            controls
                                            autoPlay
                                            className="w-full h-full object-cover"
                                        />
                                        {/* <canvas
                                            ref={canvasRef}
                                            className={`w-full h-full bg-black rounded-lg ${getCursorStyle()}`}
                                            onMouseDown={handleMouseDown}
                                            onMouseMove={handleMouseMove}
                                            onMouseUp={handleMouseUp}
                                            onMouseLeave={handleMouseUp}
                                        /> */}
                                        {/* <video
                                            ref={videoRef} // Add ref to video element
                                            src={videoData.url}
                                            controls
                                            autoPlay
                                            style={{ width: "100%", height: "100%" }}
                                        /> */}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* AI Analysis Card */}
                <div className="bg-white rounded-[26px] p-4 w-[360px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div
                            className="flex items-center cursor-pointer"
                        // onClick={() => setShowAllAnamoly(true)}
                        >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2">
                                <img src={ai} alt="AI" className="w-4 h-4" />
                            </div>
                            <h2 className="font-medium text-lg">AI Analysis</h2>
                            {/* {loader && (
                  <Loader2 className="animate-spin text-indigo-500 w-4 h-4 ml-2" />
                )} */}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default LiveVideo