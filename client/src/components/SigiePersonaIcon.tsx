import React, { useState } from "react";
import { cn } from "@/lib/utils";
import sigieImage from "../assets/sigie.png";
import practiceArchitectImage from "../assets/practice-architect.png";
import billingManagerImage from "../assets/billing-manager.png";
import cfoImage from "../assets/cfo.png";
import clinicalAdminImage from "../assets/clinical-admin.png";
import sigieOptimized from "../assets/sigie-optimized.svg";
import practiceArchitectOptimized from "../assets/practice-architect-optimized.svg";
import billingManagerOptimized from "../assets/billing-manager-optimized.svg";
import cfoOptimized from "../assets/cfo-optimized.svg";
import clinicalAdminOptimized from "../assets/clinical-admin-optimized.svg";

interface SigiePersonaIconProps {
  persona: string;
  size?: number;
  className?: string;
}

const SigiePersonaIcon: React.FC<SigiePersonaIconProps> = ({ 
  persona, 
  size = 40, 
  className = "" 
}) => {
  const [imageError, setImageError] = useState(false);

  const renderPersonaIcon = () => {
    switch (persona) {
      case 'practice_architect':
        return (
          <img
            src={imageError ? practiceArchitectOptimized : practiceArchitectImage}
            width={size}
            height={size}
            alt="Practice Architect"
            className={`${className} rounded-lg`}
            style={{ objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
        );
        
      case 'cfo':
        return (
          <img
            src={imageError ? cfoOptimized : cfoImage}
            width={size}
            height={size}
            alt="CFO"
            className={`${className} rounded-lg`}
            style={{ objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
        );
        
      case 'clinical_admin':
        return (
          <img
            src={imageError ? clinicalAdminOptimized : clinicalAdminImage}
            width={size}
            height={size}
            alt="Clinical Admin"
            className={`${className} rounded-lg`}
            style={{ objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
        );
        
      case 'billing_manager':
        return (
          <img
            src={imageError ? billingManagerOptimized : billingManagerImage}
            width={size}
            height={size}
            alt="Billing Manager"
            className={`${className} rounded-lg`}
            style={{ objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
        );
        
      case 'clinical_copilot':
      default:
        return (
          <img
            src={imageError ? sigieOptimized : sigieImage}
            width={size}
            height={size}
            alt="Clinical Co-Pilot"
            className={className}
            style={{ objectFit: 'contain', borderRadius: '50%' }}
            onError={() => setImageError(true)}
          />
        );
    }
  };

  return renderPersonaIcon();
};

export default SigiePersonaIcon;