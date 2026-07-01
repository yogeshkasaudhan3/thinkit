import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminLogin, useGetAdminMe, getGetAdminMeQueryKey } from '@workspace/api-client-react';
import { useLocation, Redirect } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Store, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  
  // If already logged in, redirect
  const { data: admin } = useGetAdminMe({ query: { queryKey: getGetAdminMeQueryKey(), retry: false } });
  if (admin) {
    return <Redirect to="/dashboard" />;
  }

  const { mutate: login, isPending } = useAdminLogin();
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    setErrorMsg('');
    login(
      { data: values },
      {
        onSuccess: () => {
          setLocation('/dashboard');
        },
        onError: () => {
          setErrorMsg('Invalid username or password');
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="bg-primary px-6 py-8 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 bg-accent rounded-full flex items-center justify-center mb-4">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-1">Thinkit Admin</h1>
          <p className="text-primary-foreground/80 text-sm">Sign in to manage your store</p>
        </div>
        
        <div className="p-6 md:p-8">
          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-6 font-medium">
              {errorMsg}
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full h-11 text-base font-semibold mt-6" disabled={isPending}>
                {isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
