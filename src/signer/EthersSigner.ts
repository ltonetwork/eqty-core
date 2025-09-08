import { Signer, keccak256 } from "ethers";
import { ISigner } from "./ISigner";
import Binary from "../Binary";
import { HEX_PREFIX_LENGTH } from "../constants";

export class EthersSigner implements ISigner {
  constructor(private signer: Signer) {}

  async getAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    // Sign the raw data directly using signMessage
    // This will add the Ethereum message prefix and hash it properly
    const signature = await this.signer.signMessage(data);
    return Binary.fromHex(signature.slice(HEX_PREFIX_LENGTH)); // Remove '0x' prefix
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageStr =
      typeof message === "string" ? message : new Binary(message).toString();
    return await this.signer.signMessage(messageStr);
  }
}
