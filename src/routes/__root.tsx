import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { NoMobileZoom } from "@/components/no-mobile-zoom";
import { AppFrame } from "@/components/layout/app-shell";
import { PULSE_SPLASH_CSS, PULSE_SPLASH_HTML, SplashController } from "@/components/pulse/splash";
import { restoreSessionToken } from "@/lib/session-token";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

restoreSessionToken();

const APP_NAME = "Pulse";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const u = await getSessionUser();
    return u ? { id: u.id, email: u.email } : null;
  } catch {
    return null;
  }
});

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await fetchSessionUser() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: "Pulse — entrena, registra y progresa. Tu ritmo. Tu progreso." },
      { name: "theme-color", content: "#0e0e11" },
      { name: "color-scheme", content: "dark" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Pulse" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/pulse-192.png" },
      { rel: "apple-touch-icon", href: "/icons/pulse-180.png", sizes: "180x180" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="es" className="dark antialiased" suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/pulse-icon.png" />
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: PULSE_SPLASH_CSS }} />
      </head>
      <body>
        <div id="pulse-splash" data-splash-root="1" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PULSE_SPLASH_HTML }} />
        <PreviewHostBridge />
        <NoMobileZoom />
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <MotionConfig reducedMotion="user">
              <SplashController />
              <AppFrame>
                <Outlet />
              </AppFrame>
              <Toaster
                theme="dark"
                position="top-center"
                toastOptions={{
                  className: "glass !bg-card !text-foreground !border-border !rounded-2xl",
                }}
              />
            </MotionConfig>
          </QueryClientProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
