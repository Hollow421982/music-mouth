// Make this a module so declare blocks are treated as augmentations
export {};

// Augment backend module to include access control initialization method
// used by the generated useActor hook. We augment BOTH the interface
// and the class (via interface merging with the same name) so that
// Backend satisfies backendInterface and useActor.ts compiles cleanly.
declare module "./backend" {
  interface backendInterface {
    _initializeAccessControlWithSecret(adminToken: string): Promise<void>;
  }
  // Merging an interface with a class adds to the instance type
  interface Backend {
    _initializeAccessControlWithSecret(adminToken: string): Promise<void>;
  }
}
