import Binary from "../Binary";
import { HEX_PREFIX_LENGTH } from "../constants";
/**
 * Wallet-based signer implementation (MetaMask, WalletConnect, etc.)
 * Uses connected wallet signers for signing operations
 */
export class EthersSigner {
    constructor(signer) {
        this.signer = signer;
    }
    async getAddress() {
        return await this.signer.getAddress();
    }
    async sign(data) {
        // Sign the raw data directly using signMessage
        // This will add the Ethereum message prefix and hash it properly
        const signature = await this.signer.signMessage(data);
        return Binary.fromHex(signature.slice(HEX_PREFIX_LENGTH)); // Remove '0x' prefix
    }
    async signMessage(message) {
        const messageStr = typeof message === "string" ? message : new TextDecoder().decode(message);
        return await this.signer.signMessage(messageStr);
    }
    /**
     * Get the underlying ethers Signer
     */
    getSigner() {
        return this.signer;
    }
    /**
     * Create an EthersSigner from a connected wallet Signer
     */
    static fromSigner(signer) {
        return new EthersSigner(signer);
    }
}
//# sourceMappingURL=EthersSigner.js.map