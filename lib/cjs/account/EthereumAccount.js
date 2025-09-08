"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
/**
 * Ethereum account wrapper that implements the ISigner interface
 * This provides a clean abstraction for Ethereum accounts in the EQTY ecosystem
 */
class EthereumAccount {
    constructor(signer) {
        this.signer = signer;
    }
    /**
     * Get the Ethereum address of this account
     */
    async getAddress() {
        return await this.signer.getAddress();
    }
    /**
     * Sign arbitrary data with this account
     */
    async sign(data) {
        // Sign the raw data directly using signMessage
        // This will add the Ethereum message prefix and hash it properly
        const signature = await this.signer.signMessage(data);
        // Convert hex string to Uint8Array, removing 0x prefix
        const hex = signature.slice(constants_1.HEX_PREFIX_LENGTH);
        const bytes = new Uint8Array(hex.length / constants_1.BYTES_PER_HEX_CHAR);
        for (let i = 0; i < hex.length; i += constants_1.BYTES_PER_HEX_CHAR) {
            bytes[i / constants_1.BYTES_PER_HEX_CHAR] = parseInt(hex.substr(i, constants_1.BYTES_PER_HEX_CHAR), 16);
        }
        return bytes;
    }
    /**
     * Sign a message string
     */
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
     * Create an Ethereum account from a connected wallet Signer
     * This is the primary method for Base/Ethereum integration
     */
    static fromSigner(signer) {
        return new EthereumAccount(signer);
    }
}
exports.default = EthereumAccount;
//# sourceMappingURL=EthereumAccount.js.map