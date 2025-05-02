import { useEffect, useRef, useState } from "react"
import Hls from 'hls.js'
import { Maximize, Minimize } from "lucide-react"

export default function VideoCanvas({ 
    cameraData, 
    isSelected, 
    onSelect,
    isMaximized,
    onMaximize,
    onMinimize,
    showMaximize
}) {
    const canvasRef = useRef(null)
    const videoRef = useRef(null)
    const hlsRef = useRef(null)
    const animationFrameRef = useRef(null)
    const [isVideoPlaying, setIsVideoPlaying] = useState(false)

    // Setup video rendering loop
    useEffect(() => {
        const canvas = canvasRef.current
        const video = videoRef.current
        
        if (!canvas || !video) return

        const ctx = canvas.getContext('2d')
        
        // Set canvas size to match container
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
        }
        resizeCanvas()

        // Animation loop for smooth rendering
        function renderFrame() {
            if (video.readyState >= 2) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            }
            animationFrameRef.current = requestAnimationFrame(renderFrame)
        }

        // Start render loop
        renderFrame()

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [isMaximized]) // Re-run on maximize state change

    // HLS setup
    useEffect(() => {
        const video = videoRef.current
        if (!video || !cameraData.hlsUrl) return

        if (Hls.isSupported()) {
            const hls = new Hls({
                maxBufferSize: 30 * 1000 * 1000, // 30MB buffer
                maxBufferLength: 60, // 60 seconds buffer
                enableWorker: true, // Enable web worker
                lowLatencyMode: true, // Enable low latency mode
                backBufferLength: 90 // 90 seconds backward buffer
            })

            hlsRef.current = hls

            hls.loadSource(cameraData.hlsUrl)
            hls.attachMedia(video)

            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                video.play()
                    .then(() => setIsVideoPlaying(true))
                    .catch(err => console.error("Play failed:", err))
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch(data.type) {
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

            return () => {
                hls.destroy()
            }
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = cameraData.hlsUrl
            video.addEventListener('loadedmetadata', () => {
                video.play()
                    .then(() => setIsVideoPlaying(true))
                    .catch(err => console.error("Play failed:", err))
            })
        }
    }, [cameraData.hlsUrl])

    return (
        <div 
            className={`w-full h-full relative ${
                isSelected ? 'ring-2 ring-[#7900F3]' : ''
            }`}
            onClick={() => onSelect(cameraData.id)}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full bg-black rounded-lg"
            />
            <video
                ref={videoRef}
                className="hidden"
                muted
                playsInline // Add playsInline for better mobile support
            />
            
            {/* Camera name */}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {cameraData.name}
            </div>

            {showMaximize && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        isMaximized ? onMinimize() : onMaximize()
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                    {isMaximized ? (
                        <Minimize className="w-4 h-4 text-white" />
                    ) : (
                        <Maximize className="w-4 h-4 text-white" />
                    )}
                </button>
            )}
        </div>
    )
}