import React from "react";
import { Card, CardContent, CardTitle } from "../ui/card";

export default function HeatMap() {
  const width = 300;
  const height = 300;
  
  const regions = [
    { id: "R1", value: 3, x: 70, y: 230, radius: 3 * 10 },   
    { id: "R2", value: 8, x: 200, y: 100, radius: 8 * 10 },  
  ];

  return (
    <div>
      <Card>
        <CardTitle>Heat Map</CardTitle>
        <CardContent>
          <svg width={width} height={height}>
            <rect width="100%" height="100%" fill="#7fc97f" />
            <defs>
              {regions.map((r) => (
                <radialGradient
                  key={r.id}
                  id={`grad-${r.id}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                  fx="50%"
                  fy="50%"
                >
                  <stop offset="0%" stopColor="red" />
                  <stop offset="60%" stopColor="orange" />
                  <stop offset="100%" stopColor="yellow" />
                </radialGradient>
              ))}
            </defs>

            {/* draw regions */}
            {regions.map((r) => (
              <g key={r.id}>
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={r.radius}
                  fill={`url(#grad-${r.id})`}
                  opacity={0.8}
                />
                <text
                  x={r.x}
                  y={r.y}
                  fill="#fff"
                  fontSize="18"
                  fontWeight="bold"
                  textAnchor="middle"
                  dy="0.35em"
                >
                  {r.id}
                </text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}
