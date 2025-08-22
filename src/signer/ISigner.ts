export interface ISigner {
  getAddress(): Promise<string>;
  sign(data: Uint8Array): Promise<Uint8Array>;
  signMessage(message: string | Uint8Array): Promise<string>;
}
