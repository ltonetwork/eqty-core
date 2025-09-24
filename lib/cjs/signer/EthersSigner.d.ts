import { Signer } from "ethers";
import { ISigner } from "./ISigner";
/**
 * Wallet-based signer implementation (MetaMask, WalletConnect, etc.)
 * Uses connected wallet signers for signing operations
 */
export declare class EthersSigner implements ISigner {
    private signer;
    constructor(signer: Signer);
    getAddress(): Promise<string>;
    sign(data: Uint8Array): Promise<Uint8Array>;
    signMessage(message: string | Uint8Array): Promise<string>;
    /**
     * Get the underlying ethers Signer
     */
    getSigner(): Signer;
    /**
     * Create an EthersSigner from a connected wallet Signer
     */
    static fromSigner(signer: Signer): EthersSigner;
}
//# sourceMappingURL=EthersSigner.d.ts.map