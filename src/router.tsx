import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingMs: 10_000,
    defaultPendingMinMs: 0,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultViewTransition: false,
  });
}