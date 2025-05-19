import { Loader2 } from "lucide-react";

export default function UploadModal({
  open,
  activeTab,
  cameraName,
  setCameraName,
  rtspUrl,
  setRtspUrl,
  handleSubmit,
  isAdding,
  handleVideoUpload,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleTabChange
}) {
  if (!open) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full h-full flex items-center justify-center"
      style={{ 
        zIndex: 50,
        backgroundColor: "#00000066"
      }}
    >
      <div
        className="bg-white rounded-[31px] flex flex-col items-center justify-start relative"
        style={{
          width: "958px",
          height: "598px",
          paddingTop: "50px",
        }}
      >
        {/* Main Content Area - Conditional Rendering */}
        {activeTab === "video" ? (
          <div 
            className="flex flex-col items-center justify-center h-[350px]"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="video-upload-input"
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <div 
              className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('video-upload-input').click();
              }}
            >
              <img
                src="/folder-upload.svg"
                alt="Upload"
                style={{ width: "182px", height: "209px" }}
              />
              <div
                style={{
                  fontWeight: "500",
                  fontSize: "24px",
                  lineHeight: "100%",
                  textAlign: "center",
                  marginTop: "20px",
                }}
              >
                Upload a video to access your dashboard
              </div>
              <div
                style={{
                  fontWeight: "500",
                  fontSize: "18px",
                  lineHeight: "100%",
                  textAlign: "center",
                  color: "#787878",
                  marginTop: "15px",
                }}
              >
                Drag and drop your file here, or click to{" "}
                <span
                  style={{
                    color: "#717AEA",
                    textDecoration: "underline",
                    textDecorationThickness: "10%"
                  }}
                >
                  upload
                </span>{" "}
                from your device.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[350px]">
            <img
              src="/feed_select.svg"
              alt="Camera Feed"
              style={{ width: "182px", height: "209px" }}
            />
            
            {/* Camera Input Form */}
            <div className="flex flex-col gap-4 mt-6 w-[450px]">
              <div className="flex items-center justify-between">
                <label className="text-black text-[16px] font-medium w-[120px]">Enter Camera :</label>
                <input
                  type="text"
                  placeholder="Enter Camera"
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  style={{
                    width: "354px",
                    height: "50.03px",
                    borderRadius: "7.7px",
                    padding: "7.7px 20.53px",
                    border: "1.28px solid #D1D1D1"
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-black text-[16px] font-medium w-[120px]">Add URL :</label>
                <input
                  type="text"
                  placeholder="Add RTSP URL"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  style={{
                    width: "354px",
                    height: "50.03px",
                    borderRadius: "7.7px",
                    padding: "7.7px 20.53px",
                    border: "1.28px solid #D1D1D1"
                  }}
                />
              </div>

              <div className="flex items-center">
                <div className="w-[120px]"></div> 
                <div style={{ width: "354px" }}>
                  <button
                    onClick={handleSubmit}
                    disabled={isAdding}
                    style={{
                      width: "160.35px",
                      height: "45.03px",
                      borderRadius: "7.7px",
                      border: "2.23px solid",
                      background: "linear-gradient(272.47deg, #717AEA 0.57%, #4F4FDC 99.43%)",
                      color: "white",
                      fontWeight: "500",
                      fontSize: "16px",
                      opacity: isAdding ? 0.7 : 1,
                      cursor: isAdding ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Adding Camera...</span>
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video/Live Feed Selection */}
        <div
          className="flex items-center justify-center"
          style={{
            width: "958px",
            height: "115px",
            backgroundColor: "#F5F6FF",
            borderRadius: "0 0 31px 31px",
            position: "absolute",
            bottom: 0,
            left: 0
          }}
        >
          {/* Video */}
          <div
            className="flex flex-col items-center justify-center cursor-pointer"
            onClick={() => handleTabChange("video")}
          >
            <div
              className={`flex items-center justify-center ${
                activeTab === "video" ? "bg-[#717AEA]" : ""
              }`}
              style={{
                width: "84px",
                height: "44px",
                gap: "10px",
                borderRadius: "100px",
                paddingTop: "2px",
                paddingRight: "22px",
                paddingBottom: "2px",
                paddingLeft: "22px",
              }}
            >
              <img
                src={activeTab === "video" ? "/white.svg" : "/black.svg"}
                alt="Video"
                style={{
                  width: "20px",
                  height: "20px",
                }}
              />
            </div>
            <div style={{ color: activeTab === "video" ? "#6069D9" : "black" }}>Video</div>
          </div>

          {/* Live Feed */}
          <div
            className="flex flex-col items-center justify-center ml-12 cursor-pointer"
            onClick={() => handleTabChange("cam")}
          >
            <div
              className={`flex items-center justify-center ${
                activeTab === "cam" ? "bg-[#717AEA]" : ""
              }`}
              style={{
                width: "84px",
                height: "44px",
                gap: "10px",
                borderRadius: "100px",
                paddingTop: "2px",
                paddingRight: "22px",
                paddingBottom: "2px",
                paddingLeft: "22px",
              }}
            >
              <img
                src="/feed.svg"
                alt="Live Feed"
                style={{
                  width: "20px",
                  height: "20px",
                  filter: activeTab === "cam" ? "invert(1)" : "none",
                }}
              />
            </div>
            <div style={{ color: activeTab === "cam" ? "#6069D9" : "black" }}>Live Feed</div>
          </div>
        </div>
      </div>
    </div>
  );
}