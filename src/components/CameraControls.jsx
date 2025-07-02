import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import FullscreenToggle from "./ui/Fullscreentoggle";
import { useAlert } from "./AlertsComponent";

export default function CameraControls({
  open,
  setOpen,
  isAdding,
  cameraName,
  setCameraName,
  rtspUrl,
  setRtspUrl,
  handleSubmit,
  hasShapesSaved,
  selectedCamera,
  navigate,
}) {
   const { showAlert } = useAlert();
  return (
    <div className="absolute flex items-center gap-3" style={{ top: "34px", right: "34px" }}>
      <div className="p-4space-x-0.5 ">
        <FullscreenToggle />
      </div>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setCameraName("");
            setRtspUrl("");
          }
        }}
      >
        <DialogTrigger asChild>
          <button
            style={{ padding: "12px 24px" }}
            className="flex items-center gap-[10px] rounded-[100px] text-[16px] font-[500] border transition-colors"
            onClick={() => open || setOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add Cam</span>
          </button>
        </DialogTrigger>
        <DialogContent
          style={{ borderRadius: "20px" }}
          className="bg-[#F4F8FF] border border-[#0000001A] p-0 w-[450px] overflow-hidden"
        >
          <div className="flex justify-between items-center p-4 border-b border-[#0000001A]">
            <DialogTitle className="text-lg font-medium">Add Cam</DialogTitle>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter the camera name:</label>
              <Input
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                className="w-full border border-[#0000001A] bg-white focus:ring-[#717AEA] focus:border-[#717AEA]"
                placeholder="Camera name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter the RTSP URL:</label>
              <Input
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                className="w-full border border-[#0000001A] bg-white focus:ring-[#717AEA] focus:border-[#717AEA]"
                placeholder="rtsp://"
              />
            </div>
            <button
              onClick={handleSubmit}
              className="w-full py-2 px-4 bg-[#717AEA] text-white rounded-[4rem] hover:bg-[#717AEA] transition-colors mt-4 flex items-center justify-center gap-2"
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding Camera...</span>
                </>
              ) : (
                "Add"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {hasShapesSaved && (
        <button
          onClick={() => {
            const camId = selectedCamera;
            if (!camId) {
              showAlert("Please select (or maximize) a camera first before going Live AI.", "error");
              return;
            }
            navigate(`/live-ai/${camId}`, {
              state: { cameraId: camId },
            });
          }}
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