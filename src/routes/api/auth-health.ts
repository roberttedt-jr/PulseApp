import { createFileRoute } from "@tanstack/react-router";
import { getAuthHealth } from "@/lib/auth/health.server";

export const Route = createFileRoute("/api/auth-health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const body = await getAuthHealth();
          return Response.json(body);
        } catch {
          return Response.json({ ok: false, error: "health_unavailable" }, { status: 500 });
        }
      },
    },
  },
});
