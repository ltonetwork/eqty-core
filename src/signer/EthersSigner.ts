import { Signer, keccak256 } from "ethers";
import { ISigner } from "./ISigner";
import Binary from "../Binary";

export class EthersSigner implements ISigner {
  constructor(private signer: Signer) {}

  async getAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    const messageHash = keccak256(data);
    // Use signMessage with the hash bytes
    const signature = await this.signer.signMessage(
      Binary.fromHex(messageHash.slice(2))
    );
    return Binary.fromHex(signature.slice(2)); // Remove '0x' prefix
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageStr =
      typeof message === "string" ? message : new Binary(message).toString();
    return await this.signer.signMessage(messageStr);
  }
}
