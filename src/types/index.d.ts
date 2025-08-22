export * from "./events";
export * from "./messages";
export * from "./signer";
export * from "./anchor";
export * from "./binary";

// Global type declarations
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Module declarations
declare module "*.js" {
  const content: {
    [key: string]: any;
  };
  export = content;
}
