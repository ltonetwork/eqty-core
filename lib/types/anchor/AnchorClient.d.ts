import { Contract, Signer } from "ethers";
import Binary from "../Binary";
import { AnchorResult } from "../types/anchor";
import { NetworkName } from "../constants";
export interface AnchorClientConfig {
    contractAddress?: string;
    network?: NetworkName;
    gasLimit?: bigint;
}
export default class AnchorClient {
    private contract;
    private signer;
    private config;
    constructor(signer: Signer, config?: AnchorClientConfig);
    anchor(key: Binary, value: Binary): Promise<AnchorResult>;
    anchorMany(anchors: Array<{
        key: Binary;
        value: Binary;
    }>): Promise<AnchorResult>;
    anchorEventChain(chainId: string, stateHash: Binary): Promise<AnchorResult>;
    anchorMessage(messageHash: Binary): Promise<AnchorResult>;
    anchorMultiple(anchors: Array<{
        key: Binary;
        value: Binary;
    }>): Promise<AnchorResult[]>;
    getContract(): Contract;
    getSignerAddress(): Promise<string>;
    /**
     * Get the current anchor fee from the contract
     */
    getAnchorFee(): Promise<bigint>;
    /**
     * Get the EQTY token address from the contract
     */
    getEqtyTokenAddress(): Promise<string>;
    /**
     * Check if anchoring requires fees
     */
    requiresFee(): Promise<boolean>;
    /**
     * Get the total fee required for anchoring multiple items
     */
    getTotalFee(anchorCount: number): Promise<bigint>;
    /**
     * Check if user has sufficient EQTY balance for anchoring
     */
    hasSufficientBalance(anchorCount: number): Promise<boolean>;
    /**
     * Check if user has sufficient EQTY allowance for anchoring
     */
    hasSufficientAllowance(anchorCount: number): Promise<boolean>;
    /**
     * Get the maximum number of anchors allowed per transaction
     */
    getMaxAnchorsPerTx(): number;
    /**
     * Validate anchor count before submission
     */
    validateAnchorCount(anchorCount: number): void;
    /**
     * Get the current network configuration
     */
    getNetworkConfig(): {
        readonly CHAIN_ID: 84532;
        readonly RPC_URL: "https://sepolia.base.org";
        readonly EXPLORER_URL: "https://sepolia.basescan.org";
        readonly ANCHOR_CONTRACT: "0x7607af0cea78815c71bbea90110b2c218879354b";
        readonly EQTY_TOKEN: "0x0000000000000000000000000000000000000000";
        readonly ANCHOR_FEE: 0n;
        readonly MAX_ANCHORS_PER_TX: 100;
    } | {
        readonly CHAIN_ID: 8453;
        readonly RPC_URL: "https://mainnet.base.org";
        readonly EXPLORER_URL: "https://basescan.org";
        readonly ANCHOR_CONTRACT: "0x0000000000000000000000000000000000000000";
        readonly EQTY_TOKEN: "0x0000000000000000000000000000000000000000";
        readonly ANCHOR_FEE: 0n;
        readonly MAX_ANCHORS_PER_TX: 100;
    };
    /**
     * Get the current network name
     */
    getNetworkName(): NetworkName;
    /**
     * Get the contract address being used
     */
    getContractAddress(): string;
    /**
     * Get the explorer URL for the current network
     */
    getExplorerUrl(): string;
    /**
     * Get the RPC URL for the current network
     */
    getRpcUrl(): string;
}
//# sourceMappingURL=AnchorClient.d.ts.map