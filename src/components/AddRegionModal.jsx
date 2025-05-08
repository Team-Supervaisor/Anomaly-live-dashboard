import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

const RegionModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialValue = "", 
  title = "Enter name" 
}) => {
  const [name, setName] = useState(initialValue);

  const handleSave = () => {
    onSave(name);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} >
      <DialogContent className="bg-[#F4F8FF] border border-[#0000001A] p-0 w-[450px] overflow-hidden rounded-2xl ">
        <div className="p-5 border-b border-[#0000001A]">
          <DialogTitle className="text-[20px] font-medium">
            {title}
          </DialogTitle>
        </div>

        <div className="p-[15.9px] ">
          <div className="space-y-2">
            <label className="block text-[14px] font-medium text-gray-700">
              Enter the region name
            </label>
            <input
              type="text"
              placeholder="Enter region name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex h-[48px] w-full px-[15.897px] py-[8.743px] items-center gap-[7.948px] 
                       rounded-[9.538px] border-[0.795px] border-[#0000001A] bg-white
                       focus:outline-none focus:border-[#717AEA] focus:ring-1 focus:ring-[#717AEA]"
            />
          </div>

          <div className="flex justify-between items-center gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex w-[95px] h-[40px] px-[15.897px] py-[11.922px] justify-center 
                       items-center gap-[7.948px] rounded-[63.586px] border-[0.795px] 
                       border-[#0000001A] text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex w-[159px] h-[40px] px-[15.897px] py-[11.922px] justify-center 
                       items-center gap-[7.948px] rounded-[63.586px] bg-[#717AEA] 
                       text-white hover:bg-[#6166d3] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegionModal;