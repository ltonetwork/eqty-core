import Binary from "../Binary";
import {
  BASE_ANCHOR_CONTRACT,
  BASE_CHAIN_ID,
  BASE_SEPOLIA_ANCHOR_CONTRACT,
  BASE_SEPOLIA_CHAIN_ID,
  ZERO_HASH
} from "../constants";
import { ANCHOR_ABI } from "./AnchorABI";
import { AnchorContract } from "../types"
import { isBinary } from "../utils/bytes"

/**
 * Simplified AnchorClient for blockchain anchoring
 */
export default class AnchorClient<T> {
  static readonly ABI = ANCHOR_ABI;

  constructor(private contract: AnchorContract<T>) {}

  private convertAnchors(
    input: Array<{ key: Uint8Array; value: Uint8Array }> | Array<Uint8Array> | Uint8Array,
    value?: Uint8Array
  ): { key: string; value: string }[] {
    if (isBinary(input)) {
      return [{ key: new Binary(input).hex, value: value ? new Binary(value).hex : ZERO_HASH }];
    }

    return input.map((item) =>
      isBinary(item)
        ? { key: new Binary(item).hex, value: ZERO_HASH }
        : { key: new Binary(item.key).hex, value: new Binary(item.value).hex },
    );
  }

  /**
   * anchor method
   */
  async anchor(
    input: Array<{ key: Uint8Array; value: Uint8Array }>
  ): Promise<T>;
  async anchor(key: Uint8Array, value: Uint8Array): Promise<T>;
  async anchor(value: Array<Uint8Array>): Promise<T>;
  async anchor(value: Uint8Array): Promise<T>;
  async anchor(
    input: Array<{ key: Uint8Array; value: Uint8Array }> | Array<Uint8Array> | Uint8Array,
    value?: Uint8Array
  ): Promise<T> {
    const anchors = this.convertAnchors(input, value);
    return await this.contract.anchor(anchors);
  }

  /**
   * Get the maximum number of anchors allowed per transaction
   */
  async getMaxAnchors(): Promise<number> {
    const value = await this.contract.maxAnchors();
    return Number(value);
  }

  /**
   * Get the anchor contract address
   */
  static contractAddress(networkId: number): `0x${string}` {
    switch (networkId) {
      case BASE_CHAIN_ID: return BASE_ANCHOR_CONTRACT;
      case BASE_SEPOLIA_CHAIN_ID: return BASE_SEPOLIA_ANCHOR_CONTRACT;
      default:
        throw new Error(`Network ID ${networkId} is not supported`);
    }
  }
}
