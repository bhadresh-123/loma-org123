import React from "react";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ 
  width,
  height,
  className = "",
  showText = false,
  size = 'medium'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-2xl';
      case 'large':
        return 'text-6xl';
      default:
        return 'text-4xl';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h1 
        className={`font-bold ${getSizeClasses()} ${className}`}
        style={{ 
          fontFamily: 'Dancing Script, Brush Script MT, cursive',
          color: '#DA6A51',
          fontWeight: '700',
          letterSpacing: '0.05em',
          textShadow: 'none',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}
      >
        Loma
      </h1>
      {showText && (
        <span className="mt-2 font-medium text-center text-primary">
          Loma
        </span>
      )}
    </div>
  );
};

export default Logo;
