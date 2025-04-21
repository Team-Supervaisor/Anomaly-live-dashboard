import React, { useState, useRef, useEffect } from "react";
import DrawingCanvas from "./DrawCanvasDrawer";


export default function Home() {

  return (
    <>
      <div className="backdrop-blur-sm fixed inset-0 bg-black/30 flex items-center justify-center font-[Urbanist]">

  <DrawingCanvas />

      </div>

    </>
  )
}
