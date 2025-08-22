export interface ISigner {
  getAddress(): Promise<string>;
  sign(data: Uint8Array): Promise<Uint8Array>;
  signMessage(message: string | Uint8Array): Promise<string>;
}

export interface ISignable {
  signWith(signer: ISigner): Promise<this>;
}

export interface IWalletProvider {
  request(request: { method: string; params?: any[] }): Promise<any>;
  on(eventName: string, listener: (...args: any[]) => void): void;
  removeListener(eventName: string, listener: (...args: any[]) => void): void;
}

export interface IWalletSigner {
  getAddress(): Promise<string>;
  signMessage(message: string | Uint8Array): Promise<string>;
  provider?: IWalletProvider;
}
