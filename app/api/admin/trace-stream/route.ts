import { getCurrentIsAdmin } from "@/app/lib/auth";
import { subscribeToAdminTrace } from "@/app/lib/debug/admin-trace-bus";

const HEARTBEAT_MS = 15000;

export async function GET() {
  const isAdmin = await getCurrentIsAdmin();
  if (!isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToAdminTrace((event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      });
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, HEARTBEAT_MS);
      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
