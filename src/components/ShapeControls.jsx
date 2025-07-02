import { Trash2 } from "lucide-react";

export default function ShapeControls({ hoverStyle, onEdit, onDelete }) {
  return (
    <div style={hoverStyle()}>
      <div className="relative group">
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
          onClick={onEdit}
        >
          <img src="/pen.svg" alt="edit" />
        </button>
        <div className="absolute w-[65px] left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
          Edit Info.
        </div>
      </div>
      <div className="relative group">
        <button
          className="w-7 h-7 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center shadow-md"
          onClick={onDelete}
        >
          <Trash2 className="text-indigo-400 w-4 h-4" />
        </button>
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded">
          Delete
        </div>
      </div>
    </div>
  );
}