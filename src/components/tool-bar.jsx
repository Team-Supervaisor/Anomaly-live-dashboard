"use client";
import React from "react";

import {
  Square,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";

export default function ToolBar({
  selectedTool,
  setSelectedTool,
  clearCanvas,
  saveShapes,
  isOpenSpaceMode,  
  setIsOpenSpaceMode,
  handleImage,
  hasMaximizedOrSelected,
  hasShapes,
  isSaving, 
  activeTab 
}) {
  const tools = [
    {
      name: "pointer",
      icon: (
        <img
          src="/arrow-selector.svg"
          style={{
            filter: selectedTool === "pointer"
              ? "brightness(0) invert(1)" // White when selected
              : "brightness(0)", // Black when not selected
          }}
          width={10}
          height={10}
          alt="pointer"
        />
      )
    },
    {
      name: "caligraphy",
      icon: (
        <img
          src="/cross-hit.svg"
          style={{
            filter: selectedTool === "caligraphy"
              ? "brightness(0) invert(1)" 
              : "none",
          }}
          size={18}
          color="#333"
        />
      )
    },
    { name: "rectangle", icon: <Square size={18} color="#333" /> },
    {
      name: "fill",
      icon: (
        <img
          src="/paint-bucket.svg"
          style={{
            filter:
              selectedTool === "fill"
                ? "invert(100%) sepia(100%) saturate(0%) hue-rotate(180deg)"
                : "none",
          }}
          size={18}
          color="#333"
        />
      ),
    },
  
  ];


  const handleToolClick = (toolName) => {
    if (toolName === "open-space") {
      setIsOpenSpaceMode(!isOpenSpaceMode);
    } else {
      setSelectedTool(toolName);
    }
  };

  return (
    <div  style={{borderRadius: "19.556px"}} className="bg-white  shadow-lg p-[10.67px] px-4 flex items-center gap-2 border border-[#0000001A]">
      <div className="flex items-center gap-2 mr-1">
        {tools.map((tool) => (
          <div className="relative group">
          <Button
          key={tool.name}
          variant="ghost"
          size="icon"
          onClick={() => handleToolClick(tool.name)}
          className={`rounded-md h-9 w-9 ${
            (tool.name === "open-space" && isOpenSpaceMode) || selectedTool === tool.name
              ? "bg-[#717AEA] ring-2 ring-[#717AEA] hover:bg-[#717AEA]"
              : ""
          }`}
        >
              {React.cloneElement(tool.icon, {
                color: (tool.name === "open-space" && isOpenSpaceMode) || selectedTool === tool.name ? "#FFF" : "#333",
              })}
            </Button>
            <div className="absolute w-[100px] bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-10">
              {/* Arrow */}
              <div className="w-2 h-2 bg-gray-800 rounded-[2px] rotate-45 translate-y-[27px]"></div>
              {/* Tooltip box */}
              <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-md">
                {tool.name}
              </div>
            </div>
          </div>
        ))}

      <div className="flex items-center gap-2 ml-1">
      <Button
        variant="outline"
        onClick={clearCanvas}
        disabled={!hasShapes || isSaving}
        className={`rounded-md h-9 px-4 text-sm font-medium text-black ${
            (!hasShapes || isSaving) 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
        }`}
    >
        Discard
    </Button>
        <Button
          variant="default"
          onClick={saveShapes}
          disabled={isSaving}
          className="rounded-md h-9 px-4 bg-[#717AEA] hover:bg-[#717AEA]  text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {activeTab === "cam" ? "Saving..." : "Uploading..."}
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
    </div>
  );
}
