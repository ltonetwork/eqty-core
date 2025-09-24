import { Contract, keccak256 } from "ethers";
import Binary from "../Binary";
import { BASE_SEPOLIA, DEFAULT_CONFIG, NETWORKS, ZERO_ADDRESS, ZERO_HASH, HEX_PREFIX, } from "../constants";
import { ANCHOR_ABI } from "./AnchorABI";
/**
 * Simplified AnchorClient for Base blockchain anchoring
 * No EQTY token fees - aligns with deployed contract (fee = 0, no token)
 */
export default class AnchorClient {
    constructor(signer, config = {}) {
        this.signer = signer;
        // Determine contract address
        let contractAddress;
        if (config.contractAddress) {
            contractAddress = config.contractAddress;
        }
        else if (config.network && NETWORKS[config.network]) {
            contractAddress = NETWORKS[config.network].ANCHOR_CONTRACT;
        }
        else {
            // Default to Base Sepolia
            contractAddress = BASE_SEPOLIA.ANCHOR_CONTRACT;
        }
        // Validate contract address
        if (contractAddress === ZERO_ADDRESS) {
            throw new Error(`Contract not deployed on ${config.network || "default network"}`);
        }
        this.contract = new Contract(contractAddress, ANCHOR_ABI, signer);
        this.config = {
            contractAddress,
            network: config.network || "base-sepolia",
            gasLimit: config.gasLimit || DEFAULT_CONFIG.GAS_LIMIT,
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
                const chainIdHash = keccak256(Buffer.from(input, "utf8"));
                const key = Binary.fromHex(chainIdHash.slice(2));
                anchors = [{ key, value }];
            }
            else if (input instanceof Binary) {
                // Single anchor or message
                if (value) {
                    // Single key-value pair
                    anchors = [{ key: input, value }];
                }
                else {
                    // Message anchoring (value = 0x0)
                    const zeroValue = Binary.fromHex(ZERO_HASH);
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
                key: HEX_PREFIX + key.hex,
                value: HEX_PREFIX + value.hex,
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
        return DEFAULT_CONFIG.MAX_ANCHORS_PER_TX;
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
        return NETWORKS[this.config.network];
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
//# sourceMappingURL=AnchorClient.js.map