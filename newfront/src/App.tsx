import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { CommandShell } from '@/components/command-shell';
import { Coordination, Dashboard, DigitalTwin, ER, Forecasting, ICU, Insights, Simulation } from '@/pages/command-pages';
import { I18nProvider } from '@/lib/i18n';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <CommandShell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/digital-twin" component={DigitalTwin} />
          <Route path="/forecasting" component={Forecasting} />
          <Route path="/coordination" component={Coordination} />
          <Route path="/insights" component={Insights} />
          <Route path="/simulation" component={Simulation} />
          <Route path="/er" component={ER} />
          <Route path="/icu" component={ICU} />
          <Route component={NotFound} />
        </Switch>
      </CommandShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
