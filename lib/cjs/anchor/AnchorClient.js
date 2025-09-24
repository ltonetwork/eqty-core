"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Binary_1 = __importDefault(require("../Binary"));
const constants_1 = require("../constants");
const AnchorABI_1 = require("./AnchorABI");
/**
 * Simplified AnchorClient for Base blockchain anchoring
 * No EQTY token fees - aligns with deployed contract (fee = 0, no token)
 */
class AnchorClient {
    constructor(signer, config = {}) {
        this.signer = signer;
        // Determine contract address
        let contractAddress;
        if (config.contractAddress) {
            contractAddress = config.contractAddress;
        }
        else if (config.network && constants_1.NETWORKS[config.network]) {
            contractAddress = constants_1.NETWORKS[config.network].ANCHOR_CONTRACT;
        }
        else {
            // Default to Base Sepolia
            contractAddress = constants_1.BASE_SEPOLIA.ANCHOR_CONTRACT;
        }
        // Validate contract address
        if (contractAddress === constants_1.ZERO_ADDRESS) {
            throw new Error(`Contract not deployed on ${config.network || "default network"}`);
        }
        this.contract = new ethers_1.Contract(contractAddress, AnchorABI_1.ANCHOR_ABI, signer);
        this.config = {
            contractAddress,
            network: config.network || "base-sepolia",
            gasLimit: config.gasLimit || constants_1.DEFAULT_CONFIG.GAS_LIMIT,
        };
    }
    async anchor(input, value) {
        try {
            let anchors;
            // Handle different input types
            if (Array.isArray(input)) {
                // Array of anchor pairs
                anchors = input;
            }
            else if (typeof input === "string") {
                // Event chain: chainId + stateHash
                if (!value) {
                    throw new Error("StateHash required for event chain anchoring");
                }
                const chainIdHash = (0, ethers_1.keccak256)(Buffer.from(input, "utf8"));
                const key = Binary_1.default.fromHex(chainIdHash.slice(2));
                anchors = [{ key, value }];
            }
            else if (input instanceof Binary_1.default) {
                // Single anchor or message
                if (value) {
                    // Single key-value pair
                    anchors = [{ key: input, value }];
                }
                else {
                    // Message anchoring (value = 0x0)
                    const zeroValue = Binary_1.default.fromHex(constants_1.ZERO_HASH);
                    anchors = [{ key: input, value: zeroValue }];
                }
            }
            else {
                throw new Error("Invalid input type for anchoring");
            }
            // Validate anchor count
            this.validateAnchorCount(anchors.length);
            // Convert to the format expected by the Base contract
            const anchorStructs = anchors.map(({ key, value }) => ({
                key: constants_1.HEX_PREFIX + key.hex,
                value: constants_1.HEX_PREFIX + value.hex,
            }));
            const tx = await this.contract.anchor(anchorStructs);
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
    /**
     * Get the underlying contract instance
     */
    getContract() {
        return this.contract;
    }
    /**
     * Get the signer address
     */
    async getSignerAddress() {
        return await this.signer.getAddress();
    }
    /**
     * Get the maximum number of anchors allowed per transaction
     */
    getMaxAnchorsPerTx() {
        return constants_1.DEFAULT_CONFIG.MAX_ANCHORS_PER_TX;
    }
    /**
     * Validate anchor count before submission
     */
    validateAnchorCount(anchorCount) {
        if (anchorCount <= 0) {
            throw new Error("Anchor count must be greater than 0");
        }
        if (anchorCount > this.getMaxAnchorsPerTx()) {
            throw new Error(`Too many anchors. Maximum allowed: ${this.getMaxAnchorsPerTx()}`);
        }
    }
    /**
     * Get the current network configuration
     */
    getNetworkConfig() {
        return constants_1.NETWORKS[this.config.network];
    }
    /**
     * Get the current network name
     */
    getNetworkName() {
        return this.config.network;
    }
    /**
     * Get the contract address being used
     */
    getContractAddress() {
        return this.config.contractAddress;
    }
    /**
     * Get the explorer URL for the current network
     */
    getExplorerUrl() {
        return this.getNetworkConfig().EXPLORER_URL;
    }
    /**
     * Get the RPC URL for the current network
     */
    getRpcUrl() {
        return this.getNetworkConfig().RPC_URL;
    }
}
exports.default = AnchorClient;
//# sourceMappingURL=AnchorClient.js.map