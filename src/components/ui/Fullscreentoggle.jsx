import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
export default function FullscreenToggle() {    1
  const [isFullscreen, setIsFullscreen] = useState(
    !!document.fullscreenElement
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <button
      onClick={toggleFullscreen}
      className="flex items-center gap-2 rounded-full border py-3 px-3 font-medium transition-colors"
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4" />
      ) : (
        <Maximize2 className="w-4 h-4" />
      )}
      <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
    </button>
  );
}
