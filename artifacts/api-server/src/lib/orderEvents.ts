import { EventEmitter } from "events";

// Shared event emitter for broadcasting new orders to SSE clients
export const orderEvents = new EventEmitter();
// Allow many concurrent SSE clients
orderEvents.setMaxListeners(200);
