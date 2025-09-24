"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateKeySigner = void 0;
const ethers_1 = require("ethers");
const Binary_1 = __importDefault(require("../Binary"));
const constants_1 = require("../constants");
/**
 * Private key-based signer implementation
 * Allows signing with raw private keys (not just wallet connections)
 */
class PrivateKeySigner {
    constructor(privateKey, provider) {
        this.wallet = new ethers_1.Wallet(privateKey, provider);
    }
    async getAddress() {
        return await this.wallet.getAddress();
    }
    async sign(data) {
        // Sign the raw data directly using signMessage
        // This will add the Ethereum message prefix and hash it properly
        const signature = await this.wallet.signMessage(data);
        return Binary_1.default.fromHex(signature.slice(constants_1.HEX_PREFIX_LENGTH)); // Remove '0x' prefix
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
exports.PrivateKeySigner = PrivateKeySigner;
//# sourceMappingURL=PrivateKeySigner.js.map