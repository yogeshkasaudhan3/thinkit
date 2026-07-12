import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Orders from '@/pages/orders';
import Products from '@/pages/products';
import ProductForm from '@/pages/product-form';
import BulkImport from '@/pages/bulk-import';
import Banners from '@/pages/banners';
import Categories from '@/pages/categories';
import Settings from '@/pages/settings';
import InventorySync from '@/pages/inventory-sync';
import PasswordResetRequests from '@/pages/password-reset-requests';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard, clearAuthCache } from '@/components/auth-guard';
import { setAdminUnauthorizedHandler } from '@/lib/admin-fetch';

// ---------------------------------------------------------------------------
// Global session-expiry handler
// ---------------------------------------------------------------------------
// Redirects to /login?reason=expired whenever a 401 is detected, clearing the
// auth cache so the login page shows the "session expired" banner.
//
// This handler is invoked from TWO sources so that every admin API call is
// covered regardless of how it is made:
//
//  1. adminFetch — called directly inside the function before throwing, so
//     imperative callers (event handlers) also trigger the redirect even if
//     their own catch block swallows the error and only shows a toast.
//
//  2. React Query's QueryCache / MutationCache onError — catches 401s from
//     generated API-client hooks (useGetAdminMe, etc.) that use customFetch
//     rather than adminFetch.
// ---------------------------------------------------------------------------

function handleUnauthorized(error: unknown) {
  const status = (error as { status?: number })?.status;
  if (status !== 401) return;

  // Don't redirect if we're already on the login page.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const loginPath = `${base}/login`;
  if (window.location.pathname.startsWith(loginPath)) return;

  clearAuthCache();
  window.location.href = `${loginPath}?reason=expired`;
}

// Register with adminFetch so imperative event-handler calls also redirect.
// adminFetch already knows the status is 401 when it fires this callback,
// so we pass a synthetic error object that satisfies handleUnauthorized's check.
setAdminUnauthorizedHandler(() => handleUnauthorized({ status: 401 }));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleUnauthorized,
  }),
  mutationCache: new MutationCache({
    onError: handleUnauthorized,
  }),
});

function AuthenticatedRoutes() {
  return (
    <AuthGuard>
      <AdminLayout>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/orders" component={Orders} />
          <Route path="/products" component={Products} />
          <Route path="/products/new" component={ProductForm} />
          <Route path="/products/bulk" component={BulkImport} />
          <Route path="/products/:id/edit" component={ProductForm} />
          <Route path="/banners" component={Banners} />
          <Route path="/categories" component={Categories} />
          <Route path="/settings" component={Settings} />
          <Route path="/inventory-sync" component={InventorySync} />
          <Route path="/password-reset-requests" component={PasswordResetRequests} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route component={AuthenticatedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
