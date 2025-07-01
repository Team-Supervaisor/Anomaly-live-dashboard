
export function buildCameraRegions(camera, shapes, camIdx) {
  return shapes.map((shape, index) => {
    const regionName = shape.name && shape.name.trim() !== "" ? shape.name : `Region ${index + 1}`;
    if (shape.type === "rectangle") {
      return {
        Region_name: regionName,
        Region_Cords: {
          vertices: [
            [shape.x, shape.y],
            [shape.x, shape.y + shape.height],
            [shape.x + shape.width, shape.y + shape.height],
            [shape.x + shape.width, shape.y],
          ],
        },
      };
    } else if (shape.type === "caligraphy") {
      return {
        Region_name: regionName,
        Region_Cords: {
          vertices: shape.points.map((point) => [point.x, point.y]),
        },
      };
    }
    return null;
  }).filter(Boolean);
}


// Build payload for a camera
export function buildCameraPayload(camera, regions) {
  return {
    camera_name: camera.name,
    rtsp_url: camera.url,
    first_frame: camera.firstFrame,
    camera_id: camera.id,
    roi_defs: [
      {
        type: "camera",
        source: {
          id: camera.id,
          name: camera.name,
          url: camera.url,
        },
        regions,
      },
    ],
    canvas_width: 1197,
    canvas_height: 517,
  };
}

// Build video shapes data
export function buildVideoShapesData(uploadedVideos, videoShapes) {
return Object.entries(videoShapes).map(([videoId, shapes]) => {
  const video = uploadedVideos.find((v) => v.id === videoId);
  return {
    type: "video",
    source: {
      id: video.id,
      name: video.file.name,
      url: video.url,
    },
    regions: shapes
      .map((shape, index) => {
        const regionName = shape.name && shape.name.trim() !== "" ? shape.name : `Region ${index + 1}`;
        if (shape.type === "rectangle") {
          return {
            Region_name: regionName,
            Region_Cords: {
              vertices: [
                [shape.x, shape.y],
                [shape.x, shape.y + shape.height],
                [shape.x + shape.width, shape.y + shape.height],
                [shape.x + shape.width, shape.y],
              ],
            },
          };
        } else if (shape.type === "caligraphy") {
          return {
            Region_name: regionName,
            Region_Cords: {
              vertices: shape.points.map((point) => [point.x, point.y]),
            },
          };
        }
        return null;
      })
      .filter(Boolean),
  };
});

}
