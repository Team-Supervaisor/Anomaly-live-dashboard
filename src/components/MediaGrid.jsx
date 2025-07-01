import MediaCanvas from "./MediaCanvas";

export default function MediaGrid({
  items,
  mediaType,
  maximizedId,
  gridKey,
  getGridLayout,
  selectedId,
  setSelectedId,
  handleMaximize,
  handleMinimize,
  showMaximize,
  selectedTool,
  shapesMap,
  onShapesChange,
}) {
  const visibleItems = maximizedId
    ? items.filter((item) => item.id === maximizedId)
    : items;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div key={gridKey} className={`grid ${getGridLayout(visibleItems.length)}`}>
        {items.map((item) => {
          const isVisible = !maximizedId || item.id === maximizedId;
          return (
            <div
              key={item.id}
              id={`${mediaType}-${item.id}`}
              className={`relative rounded-lg overflow-${mediaType === "video" ? "visible" : "hidden"} ${isVisible ? "" : "hidden"}`}
            >
              <MediaCanvas
                mediaType={mediaType}
                mediaData={item}
                isSelected={selectedId === item.id}
                onSelect={setSelectedId}
                isMaximized={maximizedId === item.id}
                onMaximize={() => handleMaximize(item.id)}
                onMinimize={handleMinimize}
                showMaximize={showMaximize}
                selectedTool={selectedTool}
                shapes={shapesMap[item.id] || []}
                onShapesChange={(shapes) => onShapesChange(item.id, shapes)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}