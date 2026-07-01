import { ReactNode } from 'react';
import { useGetAdminMe, getGetAdminMeQueryKey } from '@workspace/api-client-react';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data: admin, isLoading, isError } = useGetAdminMe({
    query: {
      queryKey: getGetAdminMeQueryKey(),
      retry: false,
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !admin) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
