"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthersSigner = void 0;
const Binary_1 = __importDefault(require("../Binary"));
const constants_1 = require("../constants");
/**
 * Wallet-based signer implementation (MetaMask, WalletConnect, etc.)
 * Uses connected wallet signers for signing operations
 */
class EthersSigner {
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
        return Binary_1.default.fromHex(signature.slice(constants_1.HEX_PREFIX_LENGTH)); // Remove '0x' prefix
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
exports.EthersSigner = EthersSigner;
//# sourceMappingURL=EthersSigner.js.map