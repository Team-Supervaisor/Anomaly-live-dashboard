import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import DrawingCanvas from "./DrawCanvasDrawer";

export default function Home() {
  const location = useLocation();
  const { data } = location.state || {};

  // console.log("Stream URL:", data);

  return (
    <>
      <div className="backdrop-blur-sm fixed inset-0 bg-black/30 flex items-center justify-center">
        <DrawingCanvas data={data} />
      </div>
    </>
  );
}
