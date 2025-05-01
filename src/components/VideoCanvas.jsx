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
    const [isVideoPlaying, setIsVideoPlaying] = useState(false)
    
    // Store playback state in a ref to persist across renders
    const playbackStateRef = useRef({
        currentTime: 0,
        isInitialized: false
    })

    useEffect(() => {
        const canvas = canvasRef.current
        const video = videoRef.current
        
        if (!canvas || !video || !cameraData.hlsUrl) return

        const ctx = canvas.getContext('2d')
        
        // Setup HLS only once per video element
        if (Hls.isSupported()) {
            if (!hlsRef.current) {
                // Create new HLS instance if one doesn't exist
                hlsRef.current = new Hls({
                    startPosition: playbackStateRef.current.currentTime
                })
                
                hlsRef.current.on(Hls.Events.MEDIA_ATTACHED, () => {
                    console.log("HLS media attached")
                    // Only set the time if we've played before
                    if (playbackStateRef.current.isInitialized && 
                        playbackStateRef.current.currentTime > 0) {
                        video.currentTime = playbackStateRef.current.currentTime
                    }
                    
                    video.play().then(() => {
                        setIsVideoPlaying(true)
                        playbackStateRef.current.isInitialized = true
                    }).catch(err => console.error("Play failed:", err))
                })
                
                hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
                    console.error("HLS error:", data)
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hlsRef.current.startLoad()
                                break
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hlsRef.current.recoverMediaError()
                                break
                            default:
                                // Cannot recover
                                destroyHls()
                                initHls()
                                break
                        }
                    }
                })
                
                // Load source and attach media
                hlsRef.current.loadSource(cameraData.hlsUrl)
                hlsRef.current.attachMedia(video)
            } else if (hlsRef.current.url !== cameraData.hlsUrl) {
                // If URL changed, load new source
                hlsRef.current.loadSource(cameraData.hlsUrl)
                hlsRef.current.attachMedia(video)
            }
            
            // Store current time periodically to maintain position
            const timeUpdateHandler = () => {
                if (video.currentTime > 0) {
                    playbackStateRef.current.currentTime = video.currentTime
                }
            }
            
            video.addEventListener('timeupdate', timeUpdateHandler)
            
            // Animation loop for canvas
            let animationFrame
            function drawVideo() {
                if (video.readyState >= 2) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                }
                animationFrame = requestAnimationFrame(drawVideo)
            }
            drawVideo()
            
            return () => {
                video.removeEventListener('timeupdate', timeUpdateHandler)
                cancelAnimationFrame(animationFrame)
                // Do NOT destroy HLS here - we'll keep it for reuse
            }
        }
    }, [cameraData.hlsUrl, isMaximized]) // Only re-run if URL changes or maximize state changes

    // Cleanup on true unmount (when component is removed from DOM)
    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                // Save final position before destroying
                if (videoRef.current) {
                    playbackStateRef.current.currentTime = videoRef.current.currentTime
                }
                hlsRef.current.destroy()
                hlsRef.current = null
            }
        }
    }, [])

    const handleMaximizeToggle = (e) => {
        e.stopPropagation()
        // Store current time before layout change
        if (videoRef.current) {
            playbackStateRef.current.currentTime = videoRef.current.currentTime
        }
        isMaximized ? onMinimize() : onMaximize()
    }

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
            />
            
            {/* Camera name */}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {cameraData.name}
            </div>

            {/* Maximize/Minimize button */}
            {showMaximize && (
                <button 
                    onClick={handleMaximizeToggle}
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