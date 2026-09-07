import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/feed/requests")({ component: RequestsRedirect });

function RequestsRedirect() {
  return <Navigate to="/feed/notifications" />;
}
