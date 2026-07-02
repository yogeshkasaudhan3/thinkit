import { ReactNode } from 'react';
import { useGetAdminMe, getGetAdminMeQueryKey } from '@workspace/api-client-react';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

const AUTH_CACHE_KEY = 'adminAuthUser';

/** Called after a successful login so the guard can skip the loading flash. */
export function setAuthCache(username: string) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, username);
  } catch {
    // localStorage unavailable — graceful degradation
  }
}

/** Called after logout so we don't show a stale "session expired" message. */
export function clearAuthCache() {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {}
}

function getCachedUsername(): string | null {
  try {
    return localStorage.getItem(AUTH_CACHE_KEY);
  } catch {
    return null;
  }
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const cachedUsername = getCachedUsername();

  const { data: admin, isLoading, isError } = useGetAdminMe({
    query: {
      queryKey: getGetAdminMeQueryKey(),
      retry: false,
      // Use the cached username as placeholder so authenticated admins see
      // content immediately on refresh instead of a loading spinner.
      placeholderData: cachedUsername ? { username: cachedUsername } : undefined,
      // Keep the result fresh for 5 minutes so navigating between pages
      // doesn't trigger a refetch and a loading state.
      staleTime: 5 * 60 * 1000,
    }
  });

  // Update or clear the localStorage cache based on the server's response.
  if (admin) {
    setAuthCache(admin.username);
  }

  if (isLoading && !cachedUsername) {
    // Only show the spinner when there is no cached session to fall back on.
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || (!isLoading && !admin)) {
    // If there was a cached session the server no longer recognises, the
    // session has expired — tell the login page to show a message.
    const hadSession = Boolean(cachedUsername);
    clearAuthCache();
    return <Redirect to={hadSession ? '/login?reason=expired' : '/login'} />;
  }

  return <>{children}</>;
}
