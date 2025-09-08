"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Binary_1 = __importDefault(require("../Binary"));
const constants_1 = require("../constants");
// ABI for the Base anchor contract - matches ownables-base exactly
const ANCHOR_ABI = [
    {
        inputs: [
            {
                components: [
                    { name: "key", type: "bytes32" },
                    { name: "value", type: "bytes32" },
                ],
                name: "anchors",
                type: "tuple[]",
            },
        ],
        name: "anchor",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "key", type: "bytes32" },
            { indexed: false, name: "value", type: "bytes32" },
            { indexed: true, name: "sender", type: "address" },
            { indexed: false, name: "timestamp", type: "uint64" },
        ],
        name: "Anchored",
        type: "event",
    },
    {
        inputs: [],
        name: "anchorFee",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "eqtyToken",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "newFee", type: "uint256" }],
        name: "setAnchorFee",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "newEqtyToken", type: "address" }],
        name: "setEqtyToken",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
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
        this.contract = new ethers_1.Contract(contractAddress, ANCHOR_ABI, signer);
        this.config = {
            contractAddress,
            network: config.network || "base-sepolia",
            gasLimit: config.gasLimit || constants_1.DEFAULT_CONFIG.GAS_LIMIT,
        };
    }
    async anchor(key, value) {
        return this.anchorMany([{ key, value }]);
    }
    async anchorMany(anchors) {
        try {
            // Validate anchor count
            this.validateAnchorCount(anchors.length);
            // Check if fees are required and handle them
            const fee = await this.getAnchorFee();
            const eqtyTokenAddress = await this.getEqtyTokenAddress();
            if (fee > 0n && eqtyTokenAddress !== constants_1.ZERO_ADDRESS) {
                // Handle EQTY token fee payment
                const totalFee = fee * BigInt(anchors.length);
                const eqtyToken = new ethers_1.Contract(eqtyTokenAddress, [
                    "function burnFrom(address account, uint256 amount) external",
                    "function balanceOf(address account) external view returns (uint256)",
                    "function allowance(address owner, address spender) external view returns (uint256)",
                ], this.signer);
                // Check balance and allowance
                const userAddress = await this.signer.getAddress();
                const balance = await eqtyToken.balanceOf(userAddress);
                const allowance = await eqtyToken.allowance(userAddress, this.contract.target);
                if (balance < totalFee) {
                    throw new Error(`Insufficient EQTY balance. Required: ${totalFee}, Available: ${balance}`);
                }
                if (allowance < totalFee) {
                    throw new Error(`Insufficient EQTY allowance. Required: ${totalFee}, Allowed: ${allowance}. Please approve the contract to spend EQTY tokens.`);
                }
            }
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
    async anchorEventChain(chainId, stateHash) {
        try {
            // Hash the chainId to create a unique key for the event chain
            const chainIdHash = (0, ethers_1.keccak256)(Buffer.from(chainId, "utf8"));
            const key = Binary_1.default.fromHex(chainIdHash.slice(2));
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
            const zeroValue = Binary_1.default.fromHex(constants_1.ZERO_HASH);
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
    async anchorMultiple(anchors) {
        const result = await this.anchorMany(anchors);
        return [result];
    }
    getContract() {
        return this.contract;
    }
    async getSignerAddress() {
        return await this.signer.getAddress();
    }
    /**
     * Get the current anchor fee from the contract
     */
    async getAnchorFee() {
        return await this.contract.anchorFee();
    }
    /**
     * Get the EQTY token address from the contract
     */
    async getEqtyTokenAddress() {
        return await this.contract.eqtyToken();
    }
    /**
     * Check if anchoring requires fees
     */
    async requiresFee() {
        const fee = await this.getAnchorFee();
        const tokenAddress = await this.getEqtyTokenAddress();
        return (fee > 0n && tokenAddress !== "0x0000000000000000000000000000000000000000");
    }
    /**
     * Get the total fee required for anchoring multiple items
     */
    async getTotalFee(anchorCount) {
        const fee = await this.getAnchorFee();
        return fee * BigInt(anchorCount);
    }
    /**
     * Check if user has sufficient EQTY balance for anchoring
     */
    async hasSufficientBalance(anchorCount) {
        const fee = await this.getAnchorFee();
        const tokenAddress = await this.getEqtyTokenAddress();
        if (fee === 0n || tokenAddress === constants_1.ZERO_ADDRESS) {
            return true; // No fees required
        }
        const totalFee = await this.getTotalFee(anchorCount);
        const userAddress = await this.signer.getAddress();
        const eqtyToken = new ethers_1.Contract(tokenAddress, ["function balanceOf(address account) external view returns (uint256)"], this.signer);
        const balance = await eqtyToken.balanceOf(userAddress);
        return balance >= totalFee;
    }
    /**
     * Check if user has sufficient EQTY allowance for anchoring
     */
    async hasSufficientAllowance(anchorCount) {
        const fee = await this.getAnchorFee();
        const tokenAddress = await this.getEqtyTokenAddress();
        if (fee === 0n || tokenAddress === constants_1.ZERO_ADDRESS) {
            return true; // No fees required
        }
        const totalFee = await this.getTotalFee(anchorCount);
        const userAddress = await this.signer.getAddress();
        const eqtyToken = new ethers_1.Contract(tokenAddress, [
            "function allowance(address owner, address spender) external view returns (uint256)",
        ], this.signer);
        const allowance = await eqtyToken.allowance(userAddress, this.contract.target);
        return allowance >= totalFee;
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