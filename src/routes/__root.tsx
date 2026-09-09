import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

// QueryClient പുറത്ത് നിർവചിക്കുന്നു, ಇದರಿಂದ ഓരോ തവണയും ഇത് വീണ്ടും ക്രിയേറ്റ് ചെയ്യപ്പെടില്ല.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 മിനിറ്റ് വരെ ഡാറ്റ ഫ്രഷ് ആയി നിലനിർത്തുന്നു
      refetchOnWindowFocus: false, // വിൻഡോ ഫോക്കസ് ചെയ്യുമ്പോൾ ഓട്ടോമാറ്റിക് ഫെച്ച് ചെയ്യുന്നത് ഒഴിവാക്കുന്നു
    },
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "KuwaitJobs",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
