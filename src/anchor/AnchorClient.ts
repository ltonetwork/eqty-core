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

export interface AnchorClientConfig {
  contractAddress?: string;
  network?: NetworkName;
  gasLimit?: bigint;
}

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

  async anchor(key: Binary, value: Binary): Promise<AnchorResult> {
    return this.anchorMany([{ key, value }]);
  }

  async anchorMany(
    anchors: Array<{ key: Binary; value: Binary }>
  ): Promise<AnchorResult> {
    try {
      // Validate anchor count
      this.validateAnchorCount(anchors.length);

      // Check if fees are required and handle them
      const fee = await this.getAnchorFee();
      const eqtyTokenAddress = await this.getEqtyTokenAddress();

      if (fee > 0n && eqtyTokenAddress !== ZERO_ADDRESS) {
        // Handle EQTY token fee payment
        const totalFee = fee * BigInt(anchors.length);
        const eqtyToken = new Contract(
          eqtyTokenAddress,
          [
            "function burnFrom(address account, uint256 amount) external",
            "function balanceOf(address account) external view returns (uint256)",
            "function allowance(address owner, address spender) external view returns (uint256)",
          ],
          this.signer
        );

        // Check balance and allowance
        const userAddress = await this.signer.getAddress();
        const balance = await eqtyToken.balanceOf(userAddress);
        const allowance = await eqtyToken.allowance(
          userAddress,
          this.contract.target
        );

        if (balance < totalFee) {
          throw new Error(
            `Insufficient EQTY balance. Required: ${totalFee}, Available: ${balance}`
          );
        }

        if (allowance < totalFee) {
          throw new Error(
            `Insufficient EQTY allowance. Required: ${totalFee}, Allowed: ${allowance}. Please approve the contract to spend EQTY tokens.`
          );
        }
      }

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

  async anchorEventChain(
    chainId: string,
    stateHash: Binary
  ): Promise<AnchorResult> {
    try {
      // Hash the chainId to create a unique key for the event chain
      const chainIdHash = keccak256(Buffer.from(chainId, "utf8"));
      const key = Binary.fromHex(chainIdHash.slice(2));
      return await this.anchor(key, stateHash);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async anchorMessage(messageHash: Binary): Promise<AnchorResult> {
    try {
      // Anchor message with zero value as specified in requirements
      const zeroValue = Binary.fromHex(ZERO_HASH);
      return await this.anchor(messageHash, zeroValue);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async anchorMultiple(
    anchors: Array<{ key: Binary; value: Binary }>
  ): Promise<AnchorResult[]> {
    const result = await this.anchorMany(anchors);
    return [result];
  }

  getContract(): Contract {
    return this.contract;
  }

  async getSignerAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  /**
   * Get the current anchor fee from the contract
   */
  async getAnchorFee(): Promise<bigint> {
    return await this.contract.anchorFee();
  }

  /**
   * Get the EQTY token address from the contract
   */
  async getEqtyTokenAddress(): Promise<string> {
    return await this.contract.eqtyToken();
  }

  /**
   * Check if anchoring requires fees
   */
  async requiresFee(): Promise<boolean> {
    const fee = await this.getAnchorFee();
    const tokenAddress = await this.getEqtyTokenAddress();
    return (
      fee > 0n && tokenAddress !== "0x0000000000000000000000000000000000000000"
    );
  }

  /**
   * Get the total fee required for anchoring multiple items
   */
  async getTotalFee(anchorCount: number): Promise<bigint> {
    const fee = await this.getAnchorFee();
    return fee * BigInt(anchorCount);
  }

  /**
   * Check if user has sufficient EQTY balance for anchoring
   */
  async hasSufficientBalance(anchorCount: number): Promise<boolean> {
    const fee = await this.getAnchorFee();
    const tokenAddress = await this.getEqtyTokenAddress();

    if (fee === 0n || tokenAddress === ZERO_ADDRESS) {
      return true; // No fees required
    }

    const totalFee = await this.getTotalFee(anchorCount);
    const userAddress = await this.signer.getAddress();

    const eqtyToken = new Contract(
      tokenAddress,
      ["function balanceOf(address account) external view returns (uint256)"],
      this.signer
    );

    const balance = await eqtyToken.balanceOf(userAddress);
    return balance >= totalFee;
  }

  /**
   * Check if user has sufficient EQTY allowance for anchoring
   */
  async hasSufficientAllowance(anchorCount: number): Promise<boolean> {
    const fee = await this.getAnchorFee();
    const tokenAddress = await this.getEqtyTokenAddress();

    if (fee === 0n || tokenAddress === ZERO_ADDRESS) {
      return true; // No fees required
    }

    const totalFee = await this.getTotalFee(anchorCount);
    const userAddress = await this.signer.getAddress();

    const eqtyToken = new Contract(
      tokenAddress,
      [
        "function allowance(address owner, address spender) external view returns (uint256)",
      ],
      this.signer
    );

    const allowance = await eqtyToken.allowance(
      userAddress,
      this.contract.target
    );
    return allowance >= totalFee;
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
