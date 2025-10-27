// Polyfills for FHEVM SDK
if (typeof window !== 'undefined') {
  if (typeof global === 'undefined') {
    (window as any).global = window;
  }
}


