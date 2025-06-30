import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import FullscreenToggle from "./ui/Fullscreentoggle";
import UploadIcon from "../assets/Upload.png";

export default function VideoControls({
  uploadDialogOpen,
  setUploadDialogOpen,
  uploadedVideos,
  handleVideoUpload,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  hasVideoShapesSaved,
  navigate,
}) {
  return (
    <div className="absolute flex items-center gap-3" style={{ top: "34px", right: "34px" }}>
      {/* Fullscreen */}
      <div className="p-4space-x-0.5 ">
        <FullscreenToggle />
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogTrigger asChild>
          <button
            onClick={() => {
              if (uploadedVideos.length >= 4) {
                alert("Maximum 4 videos allowed.");
                return;
              }
              setUploadDialogOpen(true);
            }}
            style={{ padding: "12px 24px" }}
            className="flex items-center gap-[10px] rounded-[100px] text-[16px] font-[500] border transition-colors"
          >
            <Upload className="w-4 h-4 text-black" />
            <span className="text-black">Upload</span>
          </button>
        </DialogTrigger>

        <DialogContent className="bg-[#F4F8FF] border border-[#0000001A] p-0 w-[664px] overflow-hidden rounded-3xl">
          <div className="flex justify-between items-center p-5 border-b border-[#0000001A]">
            <DialogTitle className="text-xl font-medium">
              Upload file
            </DialogTitle>
          </div>
          <div className="p-4 space-y-4">
            <div
              className="border-2 border-dashed border-[#717AEA] bg-[#717AEA1A] rounded-3xl flex items-center justify-center h-[200px] text-center cursor-pointer transition-colors duration-200"
              onClick={() =>
                document.getElementById("video-upload-input").click()
              }
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div>
                <img
                  src={UploadIcon}
                  className="mx-auto w-14 h-[42px] text-[#717AEA]"
                />
                <p className="text-[16px] font-medium mt-[10px] text-black">
                  Drop your files here or{" "}
                  <span className="text-[#717AEA66] underline">
                    click to browse
                  </span>
                </p>
              </div>
              <input
                id="video-upload-input"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
                multiple
              />
            </div>

            <button
              className="w-full py-2 bg-[#717AEA] text-white rounded-full mt-3 text-xl"
              onClick={() => setUploadDialogOpen(false)}
            >
              Upload
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {hasVideoShapesSaved && (
        <button
          onClick={() => navigate("/live-video")}
          style={{ padding: "14px 24px" }}
          className="flex items-center border gap-[10px] rounded-[100px] text-[16px] font-[500] text-[#F20A0A]"
        >
          <img
            src="/live.svg"
            alt="live icon"
            className="w-4 h-4 mr-2"
            style={{
              filter:
                "invert(15%) sepia(95%) saturate(6932%) hue-rotate(358deg) brightness(95%) contrast(114%)",
            }}
          />
          Live AI
        </button>
      )}
    </div>
  );
}