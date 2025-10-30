// Main entry point for Vercel
import { app } from "./app.js";

// For local development
if (process.env.NODE_ENV !== 'production') {
  import("./server.js");
}

// Default export for Vercel
export default app;