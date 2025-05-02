import { useEffect, useRef, useState } from "react"
import { Maximize, Minimize } from "lucide-react"

export default function VideoCanvas({
    videoData,
    isSelected,
    onSelect,
    isMaximized,
    onMaximize,
    onMinimize,
    showMaximize
}) {
    const canvasRef = useRef(null)
    const videoRef = useRef(null)
    const [isVideoPlaying, setIsVideoPlaying] = useState(false)
    const playbackStateRef = useRef({
        currentTime: 0,
        isInitialized: false
    })

    useEffect(() => {
        const canvas = canvasRef.current
        const video = videoRef.current

        if (!canvas || !video || !videoData.url) return

        const ctx = canvas.getContext('2d')

        // Set video source
        // video.src = videoData.fileUrl // REMOVE THIS LINE

        const handleLoadedMetadata = () => {
            if (playbackStateRef.current.currentTime > 0) {
                video.currentTime = playbackStateRef.current.currentTime
            }
            video.play().then(() => {
                setIsVideoPlaying(true)
                playbackStateRef.current.isInitialized = true
            }).catch(err => console.error("Play failed:", err))
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata)

        const timeUpdateHandler = () => {
            if (video.currentTime > 0) {
                playbackStateRef.current.currentTime = video.currentTime
            }
        }

        video.addEventListener('timeupdate', timeUpdateHandler)

        let animationFrame
        function drawVideo() {
            if (video.readyState >= 2) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            }
            animationFrame = requestAnimationFrame(drawVideo)
        }
        drawVideo()

        return () => {
            video.pause()
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('timeupdate', timeUpdateHandler)
            cancelAnimationFrame(animationFrame)
        }
    }, [videoData.url, isMaximized])

    const handleMaximizeToggle = (e) => {
        e.stopPropagation()
        if (videoRef.current) {
            playbackStateRef.current.currentTime = videoRef.current.currentTime
        }
        isMaximized ? onMinimize() : onMaximize()
    }

    console.log(videoData)
    return (
        <div
            className={`w-full h-full relative ${isSelected ? 'ring-2 ring-[#7900F3]' : ''}`}
            onClick={() => onSelect(videoData.id)}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full bg-black rounded-lg"
            />
            <video
                ref={videoRef} // Add ref to video element
                src={videoData.url}
                controls
                autoPlay
                style={{ width: "100%", height: "100%" }}
            />

            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {videoData.name}
            </div>

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
