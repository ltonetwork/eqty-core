import { Wallet } from "ethers";
import { ISigner } from "./ISigner";
/**
 * Private key-based signer implementation
 * Allows signing with raw private keys (not just wallet connections)
 */
export declare class PrivateKeySigner implements ISigner {
    private wallet;
    constructor(privateKey: string, provider?: any);
    getAddress(): Promise<string>;
    sign(data: Uint8Array): Promise<Uint8Array>;
    signMessage(message: string | Uint8Array): Promise<string>;
    /**
     * Get the underlying ethers Wallet
     */
    getWallet(): Wallet;
    /**
     * Create a PrivateKeySigner from a private key string
     */
    static fromPrivateKey(privateKey: string, provider?: any): PrivateKeySigner;
}
//# sourceMappingURL=PrivateKeySigner.d.ts.map