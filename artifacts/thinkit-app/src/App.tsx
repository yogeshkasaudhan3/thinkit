import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AppProvider, useApp } from './context/AppContext';

import SplashPage from './pages/SplashPage';
import SignInPage from './pages/SignInPage';
import CreateNewPasswordPage from './pages/CreateNewPasswordPage';
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import SubcategoryPage from './pages/SubcategoryPage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SearchPage from './pages/SearchPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DataDeletionPage from './pages/DataDeletionPage';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoggedIn, authStatus, forcePasswordChange } = useApp();
  if (authStatus === 'loading') return null;
  if (!isLoggedIn) return <Redirect to="/signin" />;
  // Customer logged in with a temporary (admin-issued) password — block every
  // other page until they set a new permanent password.
  if (forcePasswordChange) return <Redirect to="/create-new-password" />;
  return <Component />;
}

function CreateNewPasswordRoute() {
  const { isLoggedIn, authStatus, forcePasswordChange } = useApp();
  if (authStatus === 'loading') return null;
  if (!isLoggedIn) return <Redirect to="/signin" />;
  if (!forcePasswordChange) return <Redirect to="/home" />;
  return <CreateNewPasswordPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashPage} />
      <Route path="/signin" component={SignInPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/privacy-policy/">{() => <Redirect to="/privacy-policy" />}</Route>
      <Route path="/data-deletion" component={DataDeletionPage} />
      <Route path="/data-deletion/">{() => <Redirect to="/data-deletion" />}</Route>
      <Route path="/create-new-password" component={CreateNewPasswordRoute} />
      <Route path="/home">{() => <ProtectedRoute component={HomePage} />}</Route>
      <Route path="/categories">{() => <ProtectedRoute component={CategoriesPage} />}</Route>
      <Route path="/category/:id">{() => <ProtectedRoute component={SubcategoryPage} />}</Route>
      <Route path="/products/:categoryId">{() => <ProtectedRoute component={ProductListingPage} />}</Route>
      <Route path="/product/:id">{() => <ProtectedRoute component={ProductDetailPage} />}</Route>
      <Route path="/cart">{() => <ProtectedRoute component={CartPage} />}</Route>
      <Route path="/checkout">{() => <ProtectedRoute component={CheckoutPage} />}</Route>
      <Route path="/orders">{() => <ProtectedRoute component={OrdersPage} />}</Route>
      <Route path="/profile">{() => <ProtectedRoute component={ProfilePage} />}</Route>
      <Route path="/search">{() => <ProtectedRoute component={SearchPage} />}</Route>
      <Route path="/contact">{() => <ProtectedRoute component={ContactPage} />}</Route>
      <Route path="/admin">{() => <ProtectedRoute component={AdminDashboardPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
