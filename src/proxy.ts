// Proxy middleware shim for non-Next environments
// This file existed for Next.js middleware. In the Vite + Netlify setup
// middleware is not used the same way, so export a harmless stub.

export async function proxy(request: any) {
  // noop shim to avoid import errors when bundling with Vite
  return null;
}

