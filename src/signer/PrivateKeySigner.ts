import { Wallet } from "ethers";
import { ISigner } from "./ISigner";
import Binary from "../Binary";
import { HEX_PREFIX_LENGTH } from "../constants";

/**
 * Private key-based signer implementation
 * Allows signing with raw private keys (not just wallet connections)
 */
export class PrivateKeySigner implements ISigner {
  private wallet: Wallet;

  constructor(privateKey: string, provider?: any) {
    this.wallet = new Wallet(privateKey, provider);
  }

  async getAddress(): Promise<string> {
    return await this.wallet.getAddress();
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    // Sign the raw data directly using signMessage
    // This will add the Ethereum message prefix and hash it properly
    const signature = await this.wallet.signMessage(data);
    return Binary.fromHex(signature.slice(HEX_PREFIX_LENGTH)); // Remove '0x' prefix
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageStr =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    return await this.wallet.signMessage(messageStr);
  }

  /**
   * Get the underlying ethers Wallet
   */
  getWallet(): Wallet {
    return this.wallet;
  }

  /**
   * Create a PrivateKeySigner from a private key string
   */
  static fromPrivateKey(privateKey: string, provider?: any): PrivateKeySigner {
    return new PrivateKeySigner(privateKey, provider);
  }
}
