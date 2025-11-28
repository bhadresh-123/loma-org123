import { useAuth } from "./use-auth";

// This is a compatibility hook that simply forwards to useAuth
// Allows components still using useUser to work without needing to be updated
export const useUser = () => {
  const auth = useAuth();
  
  // Add a logout function for backward compatibility
  const logout = async () => {
    return auth.logoutMutation.mutateAsync();
  };

  return {
    ...auth,
    logout,
  };
};