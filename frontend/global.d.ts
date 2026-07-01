// window.Clerk is injected at runtime by @clerk/nextjs (clientside). The axios
// request interceptor in src/api/client.ts reads the session token off it to
// attach the Bearer header. Declared here (ambient, no imports/exports — keep
// it a global script file so the Window augmentation merges globally) so that
// code is fully typed.
declare global {
  interface Window {
    Clerk?: {
      loaded?: boolean;
      load?: () => Promise<unknown>;
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

export {};
