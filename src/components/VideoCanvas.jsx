import { useEffect, useRef } from "react"
import Hls from 'hls.js'

export default function VideoCanvas({ cameraData, isSelected, onSelect }) {
    const canvasRef = useRef(null)
    const videoRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const video = videoRef.current
        if (!canvas || !video) return

        // Set initial canvas size (will be managed by parent grid)
        const ctx = canvas.getContext('2d')

        // Initialize HLS
        if (Hls.isSupported()) {
            const hls = new Hls()
            // For now using sample HLS stream
            hls.loadSource('https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.mp4/.m3u8')
            hls.attachMedia(video)
            
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                video.play()
            })
        }

        // Animation loop to draw video frames on canvas
        let animationFrame
        function drawVideo() {
            if (video.readyState >= 2) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            }
            animationFrame = requestAnimationFrame(drawVideo)
        }
        drawVideo()

        return () => {
            cancelAnimationFrame(animationFrame)
        }
    }, [])

    return (
        <div 
            className={`w-full h-full relative ${
                isSelected ? 'ring-2 ring-[#7900F3]' : ''
            }`}
            onClick={() => onSelect(cameraData.id)}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full  bg-black rounded-lg"
            />
            <video
                ref={videoRef}
                className="hidden"
                muted
            />
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {cameraData.name}
            </div>
        </div>
    )
}