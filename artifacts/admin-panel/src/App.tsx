import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth-guard';

const queryClient = new QueryClient();

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
