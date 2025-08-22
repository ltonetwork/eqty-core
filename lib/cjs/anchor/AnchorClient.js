"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Binary_1 = __importDefault(require("../Binary"));
// Minimal ABI for the anchor contract
const ANCHOR_ABI = [
    "function anchor(bytes32 key, bytes32 value) external",
    "event Anchored(bytes32 indexed key, bytes32 value, address indexed sender)",
];
class AnchorClient {
    constructor(contractAddress, signer) {
        this.contract = new ethers_1.Contract(contractAddress, ANCHOR_ABI, signer);
        this.signer = signer;
    }
    async anchor(key, value) {
        try {
            const keyHex = "0x" + key.hex;
            const valueHex = "0x" + value.hex;
            const tx = await this.contract.anchor(keyHex, valueHex);
            const receipt = await tx.wait();
            if (receipt.status === 0) {
                throw new Error("Transaction failed on-chain");
            }
            return {
                success: true,
                transactionHash: receipt.hash,
                receipt,
                gasUsed: receipt.gasUsed,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async anchorMultiple(anchors) {
        const results = [];
        for (const anchor of anchors) {
            const result = await this.anchor(anchor.key, anchor.value);
            results.push(result);
        }
        return results;
    }
    async anchorEventChain(chainId, stateHash) {
        try {
            const key = new Binary_1.default(chainId).hash();
            return await this.anchor(key, stateHash);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async anchorMessage(messageHash) {
        try {
            // Anchor message with zero value as specified in requirements
            const zeroValue = new Binary_1.default(32); // 32 bytes of zeros (0x0)
            return await this.anchor(messageHash, zeroValue);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async anchorMany(anchors) {
        return this.anchorMultiple(anchors);
    }
    getContract() {
        return this.contract;
    }
    getContractAddress() {
        return this.contract.target;
    }
    async getSignerAddress() {
        return await this.signer.getAddress();
    }
}
exports.default = AnchorClient;
//# sourceMappingURL=AnchorClient.js.map