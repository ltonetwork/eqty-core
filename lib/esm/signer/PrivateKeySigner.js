import { Wallet } from "ethers";
import Binary from "../Binary";
import { HEX_PREFIX_LENGTH } from "../constants";
/**
 * Private key-based signer implementation
 * Allows signing with raw private keys (not just wallet connections)
 */
export class PrivateKeySigner {
    constructor(privateKey, provider) {
        this.wallet = new Wallet(privateKey, provider);
    }
    async getAddress() {
        return await this.wallet.getAddress();
    }
    async sign(data) {
        // Sign the raw data directly using signMessage
        // This will add the Ethereum message prefix and hash it properly
        const signature = await this.wallet.signMessage(data);
        return Binary.fromHex(signature.slice(HEX_PREFIX_LENGTH)); // Remove '0x' prefix
    }
    async signMessage(message) {
        const messageStr = typeof message === "string" ? message : new TextDecoder().decode(message);
        return await this.wallet.signMessage(messageStr);
    }
    /**
     * Get the underlying ethers Wallet
     */
    getWallet() {
        return this.wallet;
    }
    /**
     * Create a PrivateKeySigner from a private key string
     */
    static fromPrivateKey(privateKey, provider) {
        return new PrivateKeySigner(privateKey, provider);
    }
}
//# sourceMappingURL=PrivateKeySigner.js.map