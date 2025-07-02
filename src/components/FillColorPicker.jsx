export default function FillColorPicker({ fillColor, setFillColor }) {
  return (
    <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md z-10 flex items-center">
      <label className="text-sm font-medium text-gray-700">Fill Color:</label>
      <input
        type="color"
        value={fillColor}
        onChange={(e) => setFillColor(e.target.value)}
        className="ml-2 w-8 h-8 border-none cursor-pointer"
      />
    </div>
  );
}