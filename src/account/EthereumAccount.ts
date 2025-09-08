import { Signer, Wallet } from "ethers";
import { ISigner } from "../signer";
import { HEX_PREFIX_LENGTH, BYTES_PER_HEX_CHAR } from "../constants";

/**
 * Ethereum account wrapper that implements the ISigner interface
 * This provides a clean abstraction for Ethereum accounts in the EQTY ecosystem
 */
export default class EthereumAccount implements ISigner {
  private signer: Signer;

  constructor(signer: Signer) {
    this.signer = signer;
  }

  /**
   * Get the Ethereum address of this account
   */
  async getAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  /**
   * Sign arbitrary data with this account
   */
  async sign(data: Uint8Array): Promise<Uint8Array> {
    // Sign the raw data directly using signMessage
    // This will add the Ethereum message prefix and hash it properly
    const signature = await this.signer.signMessage(data);
    // Convert hex string to Uint8Array, removing 0x prefix
    const hex = signature.slice(HEX_PREFIX_LENGTH);
    const bytes = new Uint8Array(hex.length / BYTES_PER_HEX_CHAR);
    for (let i = 0; i < hex.length; i += BYTES_PER_HEX_CHAR) {
      bytes[i / BYTES_PER_HEX_CHAR] = parseInt(
        hex.substr(i, BYTES_PER_HEX_CHAR),
        16
      );
    }
    return bytes;
  }

  /**
   * Sign a message string
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageStr =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    return await this.signer.signMessage(messageStr);
  }

  /**
   * Get the underlying ethers Signer
   */
  getSigner(): Signer {
    return this.signer;
  }

  /**
   * Create an Ethereum account from a connected wallet Signer
   * This is the primary method for Base/Ethereum integration
   */
  static fromSigner(signer: Signer): EthereumAccount {
    return new EthereumAccount(signer);
  }
}
