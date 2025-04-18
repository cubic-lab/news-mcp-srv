import { mcpServer } from "./servers/mcp.ts";
import { createSSEServer } from "./servers/sse.ts";

const sseServer = createSSEServer(mcpServer);

sseServer.listen(Deno.env.get('PORT') || 3001);