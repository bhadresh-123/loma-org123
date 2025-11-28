import React from 'react';

interface PieChartData {
  category: string;
  amount: number;
  percentage: number;
}

interface SimplePieChartProps {
  data: PieChartData[];
  size?: number;
  colors?: string[];
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
];

export const SimplePieChart: React.FC<SimplePieChartProps> = ({ 
  data, 
  size = 200, 
  colors = COLORS 
}) => {
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  
  // Create pie slices
  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const percentage = Math.abs(item.amount) / total;
    const angle = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    // Calculate path for the slice
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    currentAngle = endAngle;
    
    return {
      ...item,
      pathData,
      color: colors[index % colors.length],
      percentage: Math.round(percentage * 100)
    };
  });
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <svg width={size} height={size} className="overflow-visible">
        {slices.map((slice, index) => (
          <g key={index}>
            <path
              d={slice.pathData}
              fill={slice.color}
              stroke="#ffffff"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-xs">
              {slice.category} ({slice.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};