import { Contract, Signer, keccak256 } from "ethers";
import Binary from "../Binary";
import { AnchorResult } from "../types/anchor";
import {
  BASE_SEPOLIA,
  DEFAULT_CONFIG,
  NetworkName,
  NETWORKS,
  ZERO_ADDRESS,
  ZERO_HASH,
  HEX_PREFIX,
} from "../constants";
import { ANCHOR_ABI } from "./AnchorABI";

export interface AnchorClientConfig {
  contractAddress?: string;
  network?: NetworkName;
  gasLimit?: bigint;
}

/**
 * Simplified AnchorClient for Base blockchain anchoring
 */
export default class AnchorClient {
  private contract: Contract;
  private signer: Signer;
  private config: Required<AnchorClientConfig>;

  constructor(signer: Signer, config: AnchorClientConfig = {}) {
    this.signer = signer;

    // Determine contract address
    let contractAddress: string;
    if (config.contractAddress) {
      contractAddress = config.contractAddress;
    } else if (config.network && NETWORKS[config.network]) {
      contractAddress = NETWORKS[config.network].ANCHOR_CONTRACT;
    } else {
      // Default to Base Sepolia
      contractAddress = BASE_SEPOLIA.ANCHOR_CONTRACT;
    }

    // Validate contract address
    if (contractAddress === ZERO_ADDRESS) {
      throw new Error(
        `Contract not deployed on ${config.network || "default network"}`
      );
    }

    this.contract = new Contract(contractAddress, ANCHOR_ABI, signer);

    this.config = {
      contractAddress,
      network: config.network || "base-sepolia",
      gasLimit: config.gasLimit || DEFAULT_CONFIG.GAS_LIMIT,
    };
  }

  /**
   * anchor method
   */
  async anchor(
    input: Array<{ key: Binary; value: Binary }>
  ): Promise<AnchorResult>;
  async anchor(input: Binary, value?: Binary): Promise<AnchorResult>;
  async anchor(input: string, value: Binary): Promise<AnchorResult>;
  async anchor(
    input: Array<{ key: Binary; value: Binary }> | Binary | string,
    value?: Binary
  ): Promise<AnchorResult> {
    try {
      let anchors: Array<{ key: Binary; value: Binary }>;

      if (Array.isArray(input)) {
        // Array of anchor pairs
        anchors = input;
      } else if (typeof input === "string") {
        // Event chain: chainId + stateHash
        if (!value) {
          throw new Error("StateHash required for event chain anchoring");
        }
        const chainIdHash = keccak256(Buffer.from(input, "utf8"));
        const key = Binary.fromHex(chainIdHash.slice(2));
        anchors = [{ key, value }];
      } else if (input instanceof Binary) {
        // Single anchor or message
        if (value) {
          // Single key-value pair
          anchors = [{ key: input, value }];
        } else {
          // Message anchoring (value = 0x0)
          const zeroValue = Binary.fromHex(ZERO_HASH);
          anchors = [{ key: input, value: zeroValue }];
        }
      } else {
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get the underlying contract instance
   */
  getContract(): Contract {
    return this.contract;
  }

  /**
   * Get the signer address
   */
  async getSignerAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  /**
   * Get the maximum number of anchors allowed per transaction
   */
  getMaxAnchorsPerTx(): number {
    return DEFAULT_CONFIG.MAX_ANCHORS_PER_TX;
  }

  /**
   * Validate anchor count before submission
   */
  validateAnchorCount(anchorCount: number): void {
    if (anchorCount <= 0) {
      throw new Error("Anchor count must be greater than 0");
    }
    if (anchorCount > this.getMaxAnchorsPerTx()) {
      throw new Error(
        `Too many anchors. Maximum allowed: ${this.getMaxAnchorsPerTx()}`
      );
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
  getNetworkName(): NetworkName {
    return this.config.network;
  }

  /**
   * Get the contract address being used
   */
  getContractAddress(): string {
    return this.config.contractAddress;
  }

  /**
   * Get the explorer URL for the current network
   */
  getExplorerUrl(): string {
    return this.getNetworkConfig().EXPLORER_URL;
  }

  /**
   * Get the RPC URL for the current network
   */
  getRpcUrl(): string {
    return this.getNetworkConfig().RPC_URL;
  }
}
