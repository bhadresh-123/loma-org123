
import React, { useState } from "react";
import sigieImage from "../assets/sigie.png";
import sigieOptimized from "../assets/sigie-optimized.svg";

interface SigieIconProps {
  width?: number;
  height?: number;
  className?: string;
  showText?: boolean;
}

const SigieIcon: React.FC<SigieIconProps> = ({ 
  width = 120,
  height = 120,
  className = "",
  showText = false
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <img
        src={imageError ? sigieOptimized : sigieImage}
        width={width}
        height={height}
        alt="Sigie"
        className={className}
        style={{ objectFit: 'contain' }}
        onError={() => setImageError(true)}
      />
      {showText && (
        <span className="mt-2 font-medium text-center text-primary">
          Ask Sigie
        </span>
      )}
    </div>
  );
};

export default SigieIcon;
