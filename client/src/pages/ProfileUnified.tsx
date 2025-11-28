import { ProfileContainer } from '@/components/profile/ProfileContainer';

export default function ProfileUnified() {
  const sessionId = `session-${Date.now()}`;
  
  return (
    <ProfileContainer 
      sessionId={sessionId}
    />
  );
}