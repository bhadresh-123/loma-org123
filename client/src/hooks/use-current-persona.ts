import { useLocation } from "wouter";

export const useCurrentPersona = () => {
  const [location] = useLocation();
  
  const getPersonaFromRoute = (path: string): string => {
    // Remove any query parameters or fragments
    const cleanPath = path.split('?')[0].split('#')[0];
    
    // Handle dynamic routes like /clients/:id
    if (cleanPath.startsWith('/clients/') && cleanPath !== '/clients') {
      return 'clinical_copilot';
    }
    
    switch (cleanPath) {
      case '/start-journey':
        return 'practice_architect';
      case '/':
      case '/dashboard':
        return 'clinical_admin';
      case '/billing':
      case '/claims':
        return 'billing_manager';
      case '/business-banking':
        return 'cfo';
      case '/documents':
        return 'clinical_admin';
      case '/profile':
        return 'practice_architect';
      case '/tasks':
        return 'clinical_admin';
      case '/clients':
        return 'clinical_copilot';
      case '/sessions':
      case '/scheduling':
      case '/calendar':
        return 'clinical_copilot';
      default:
        return 'clinical_copilot'; // Default fallback
    }
  };
  
  return getPersonaFromRoute(location);
};