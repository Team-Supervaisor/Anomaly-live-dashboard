export default function TabButtons({ activeTab, onTabChange }) {
  return (
    <div className="absolute" style={{ top: "34px", left: "34px" }}>
      <div className="flex gap-3">
        <button
          onClick={() => onTabChange("video")}
          style={{ padding: "14px 24px" }}
          className={`flex items-center gap-2 rounded-[8px] border text-[16px] font-[500] ${
            activeTab === "video"
              ? "bg-[#717AEA] text-white border-none"
              : "bg-white text-[#717171] "
          }`}
        >
          <img
            src="/play.svg"
            className={`w-4 h-4 ${
              activeTab === "video" ? "brightness-0 invert" : ""
            }`}
            alt="video icon"
          />
          <span>Video</span>
        </button>

        <button
          onClick={() => onTabChange("cam")}
          style={{ padding: "14px 24px" }}
          className={`flex items-center gap-2 text-[16px] font-[500] rounded-[8px] border ${
            activeTab === "cam"
              ? "bg-[#717AEA] text-white border-none"
              : "bg-white text-[#717171] "
          }`}
        >
          <img
            src="/camera.svg"
            className={`w-4 h-4 ${
              activeTab === "cam" ? "brightness-0 invert" : ""
            }`}
            alt="cam icon"
          />
          <span>Cam</span>
        </button>
      </div>
    </div>
  );
}