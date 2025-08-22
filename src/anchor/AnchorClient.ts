import { Contract, Signer } from "ethers";
import Binary from "../Binary";
import { AnchorResult } from "../types/anchor";

// Minimal ABI for the anchor contract
const ANCHOR_ABI = [
  "function anchor(bytes32 key, bytes32 value) external",
  "event Anchored(bytes32 indexed key, bytes32 value, address indexed sender)",
];

export default class AnchorClient {
  private contract: Contract;
  private signer: Signer;

  constructor(contractAddress: string, signer: Signer) {
    this.contract = new Contract(contractAddress, ANCHOR_ABI, signer);
    this.signer = signer;
  }

  async anchor(key: Binary, value: Binary): Promise<AnchorResult> {
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
    anchors: Array<{ key: Binary; value: Binary }>,
  ): Promise<AnchorResult[]> {
    const results: AnchorResult[] = [];

    for (const anchor of anchors) {
      const result = await this.anchor(anchor.key, anchor.value);
      results.push(result);
    }

    return results;
  }

  async anchorEventChain(
    chainId: string,
    stateHash: Binary,
  ): Promise<AnchorResult> {
    try {
      const key = new Binary(chainId).hash();
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
      const zeroValue = new Binary(32); // 32 bytes of zeros (0x0)
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

  async anchorMany(
    anchors: Array<{ key: Binary; value: Binary }>,
  ): Promise<AnchorResult[]> {
    return this.anchorMultiple(anchors);
  }

  getContract(): Contract {
    return this.contract;
  }

  getContractAddress(): string {
    return this.contract.target as string;
  }

  async getSignerAddress(): Promise<string> {
    return await this.signer.getAddress();
  }
}
