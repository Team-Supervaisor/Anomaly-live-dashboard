import React, { useEffect } from 'react'
import { useLocation } from "react-router-dom";

import logo from '../assets/logo.png'
import ai from '../assets/ai.png'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

const LiveVideo = () => {

    const location = useLocation();
    // const { data } = location.state || {};
    const data =

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

    return (
        <div className="flex flex-col bg-[#F5F9FF]">
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
                <div className="bg-white w-full rounded-[26px] p-4 min-h-[400px] flex flex-col">
                    <div className='flex justify-between'>
                        {/* hls videos */}
                    </div>
                </div>

                {/* AI Analysis Card */}
                <div className="bg-white rounded-[26px] p-4 w-[360px] max-h-[380px] flex flex-col">
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
                        <button
                            // onClick={handleRefreshAi}
                            className="p-2 bg-[#EBECFF] rounded hover:bg-[#DDE2FD] transition"
                            title="Refresh AI analysis"
                        >
                            <RefreshCw className="w-5 h-5 text-[#5A62C8]" />
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default LiveVideo