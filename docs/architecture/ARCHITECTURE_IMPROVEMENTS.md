# 🏗️ Architecture Improvements Needed

## Current Issues (Even After Profile Consolidation)

### 1. **Hidden Dependencies**
- TimezoneContext secretly depends on useAuth
- Multiple hooks fetching the same user data
- Session management is implicit

### 2. **Confusing Error Patterns**
- 401 errors appear in console even when expected
- No clear separation between "auth check" vs "profile fetch"
- Error handling is inconsistent

### 3. **Complex Conditional Logic**
- Multiple `enabled` conditions scattered across hooks
- Path-based logic that's fragile
- Hard to predict when API calls happen

## Proposed Clean Architecture

### 1. **Clear Separation of Concerns**
```typescript
// AuthService - Only handles authentication status
const useAuthStatus = () => {
  // Only checks if user has valid session cookie
  // Returns: { isAuthenticated: boolean, isLoading: boolean }
}

// ProfileService - Only handles profile data
const useProfile = () => {
  // Only fetches profile when explicitly needed
  // Returns: { profile: ProfileData | null, isLoading: boolean }
}

// TimezoneService - Independent of auth
const useTimezone = () => {
  // Uses browser timezone by default
  // Only uses profile timezone when explicitly provided
}
```

### 2. **Explicit Dependencies**
```typescript
// Clear, explicit dependencies
const ProfilePage = () => {
  const { isAuthenticated } = useAuthStatus();
  const { profile, isLoading } = useProfile();
  
  if (!isAuthenticated) return <LoginPage />;
  if (isLoading) return <Loading />;
  return <ProfileForm profile={profile} />;
};
```

### 3. **Predictable API Call Patterns**
- Auth status check: `/api/auth/status` (lightweight)
- Profile data: `/api/profile` (only when needed)
- No hidden API calls in contexts

## Benefits of Clean Architecture

1. **Predictable**: Easy to know when API calls happen
2. **Debuggable**: Clear error messages and stack traces
3. **Testable**: Each hook has a single responsibility
4. **Maintainable**: Changes in one area don't break others
5. **Intuitive**: New developers can understand the flow quickly

## Implementation Priority

1. **High**: Create separate `useAuthStatus` hook
2. **High**: Make TimezoneContext independent
3. **Medium**: Add explicit error boundaries
4. **Low**: Add better logging/debugging tools
