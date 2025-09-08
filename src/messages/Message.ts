import { keccak256, recoverAddress } from "ethers";
import { ISigner } from "../signer";
import Binary from "../Binary";
import {
  IMessageMeta,
  IMessageJSON,
  IMessageData,
  IMessageSignable,
} from "../types/messages";
import { concatBytes } from "@noble/hashes/utils";
import { MESSAGE_V1, MESSAGE_V2, HEX_PREFIX, HASH_LENGTH } from "../constants";

export default class Message implements IMessageSignable {
  /** Version of the message */
  version: number;

  /** Extra info and details about the message */
  meta: IMessageMeta = { type: "basic", title: "", description: "" };

  /** Meta type of the data */
  mediaType!: string;

  /** Data of the message */
  data!: Binary;

  /** Time when the message was signed */
  timestamp?: number;

  /** Ethereum address of the sender */
  sender?: string;

  /** Signature of the message */
  signature?: Binary;

  /** Address of the recipient */
  recipient?: string;

  /** Hash (see dynamic property) */
  private _hash?: Binary;

  /** Encrypted data */
  private _encryptedData?: Binary;

  constructor(
    data: IMessageData | string | Uint8Array,
    mediaType?: string,
    meta: Partial<IMessageMeta> | string = {}
  ) {
    if (typeof meta === "string") meta = { type: meta }; // Backwards compatibility

    this.version =
      meta.title || meta.description || meta.thumbnail
        ? MESSAGE_V2
        : MESSAGE_V1;
    this.meta = { ...this.meta, ...meta };

    if (typeof data === "string") {
      this.mediaType = mediaType ?? "text/plain";
      this.data = new Binary(data);
    } else if (data instanceof Uint8Array) {
      this.mediaType = mediaType ?? "application/octet-stream";
      this.data = data instanceof Binary ? data : new Binary(data);
    } else {
      if (mediaType && mediaType !== "application/json")
        throw new Error(`Unable to encode data as ${mediaType}`);
      this.mediaType = mediaType ?? "application/json";
      this.data = new Binary(JSON.stringify(data));
    }
  }

  get type(): string {
    return this.meta.type; // Backwards compatibility
  }

  get hash(): Binary {
    return this._hash ?? new Binary(this.toBinary(false)).hash();
  }

  get encryptedData(): Binary {
    if (!this._encryptedData) throw new Error("Message is not encrypted");
    return this._encryptedData;
  }

  to(recipient: string): Message {
    if (this.signature) throw new Error("Message is already signed");

    this.recipient = recipient;
    return this;
  }

  encryptFor(recipientAddress: string): Message {
    if (this.signature) throw new Error("Message is already signed");

    this.recipient = recipientAddress;

    // For now, implement a simplified encryption approach
    // In a full implementation, you would use proper ECIES encryption
    // This is a placeholder that demonstrates the pattern
    const messageData = this.data;
    const recipientHash = new Binary(recipientAddress).hash();
    const encrypted = concatBytes(messageData, recipientHash);
    this._encryptedData = new Binary(encrypted);

    return this;
  }

  decryptWith(_signer: ISigner): Message {
    if (!this._encryptedData) throw new Error("Message is not encrypted");

    // Simplified decryption - in production use proper ECIES
    const encryptedData = this._encryptedData;
    const dataLength = encryptedData.length - HASH_LENGTH; // Remove recipient hash
    this.data = new Binary(encryptedData.slice(0, dataLength));
    this._encryptedData = undefined;

    return this;
  }

  isEncrypted(): boolean {
    return !!this._encryptedData;
  }

  async signWith(sender: ISigner): Promise<this> {
    try {
      if (this.signature) throw new Error("Message is already signed");

      this.sender = await sender.getAddress();
      this.timestamp = Date.now();

      const signature = await sender.sign(this.toBinary(false));
      this.signature = new Binary(signature);

      return this;
    } catch (error) {
      throw new Error(
        `Failed to sign message: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  isSigned(): boolean {
    return !!this.signature;
  }

  verifySignature(): boolean {
    if (!this.signature || !this.sender) return false;

    try {
      // Recover signer from signature using ethers.js
      const messageHash = keccak256(this.toBinary(false));
      const signatureHex = HEX_PREFIX + this.signature.hex;
      const recoveredAddress = recoverAddress(messageHash, signatureHex);
      return recoveredAddress.toLowerCase() === this.sender.toLowerCase();
    } catch (error) {
      console.error("Message signature verification failed:", error);
      return false;
    }
  }

  verifyHash(): boolean {
    try {
      const computedHash = new Binary(this.toBinary(false)).hash();
      return this.hash.toString() === computedHash.toString();
    } catch (error) {
      console.error("Message hash verification failed:", error);
      return false;
    }
  }

  private toBinaryV1(withSignature = true): Uint8Array {
    const parts: Uint8Array[] = [
      Binary.fromInt32(this.version),
      Binary.from(this.mediaType),
      this.data,
    ];

    if (this.timestamp) {
      parts.push(Binary.fromInt32(this.timestamp));
    }

    if (this.sender) {
      parts.push(Binary.from(this.sender));
    }

    if (this.recipient) {
      parts.push(Binary.from(this.recipient));
    }

    if (withSignature && this.signature) {
      parts.push(this.signature);
    }

    return Binary.concat(...parts);
  }

  private toBinaryV2(withSignature = true): Uint8Array {
    const parts: Uint8Array[] = [
      Binary.fromInt32(this.version),
      Binary.from(JSON.stringify(this.meta)),
      Binary.from(this.mediaType),
      this.data,
    ];

    if (this.timestamp) {
      parts.push(Binary.fromInt32(this.timestamp));
    }

    if (this.sender) {
      parts.push(Binary.from(this.sender));
    }

    if (this.recipient) {
      parts.push(Binary.from(this.recipient));
    }

    if (withSignature && this.signature) {
      parts.push(this.signature);
    }

    return Binary.concat(...parts);
  }

  toBinary(withSignature = true): Uint8Array {
    switch (this.version) {
      case MESSAGE_V1:
        return this.toBinaryV1(withSignature);
      case MESSAGE_V2:
        return this.toBinaryV2(withSignature);
      default:
        throw new Error(`Message version ${this.version} not supported`);
    }
  }

  toJSON(): IMessageJSON {
    return {
      version: this.version,
      meta: this.meta,
      mediaType: this.mediaType,
      data: this.data.base58,
      timestamp: this.timestamp,
      sender: this.sender,
      signature: this.signature?.base58,
      recipient: this.recipient,
      hash: this.hash.base58,
      encryptedData: this._encryptedData?.base58,
    };
  }

  static from(data: IMessageJSON | Uint8Array): Message {
    if (data instanceof Uint8Array) {
      return Message.fromBinary(data);
    }
    return Message.fromJSON(data);
  }

  private static fromJSON(json: IMessageJSON): Message {
    try {
      const message = new Message(
        Binary.fromBase58(json.data),
        json.mediaType,
        json.meta
      );
      message.version = json.version;
      message.timestamp = json.timestamp;
      message.sender = json.sender;
      message.signature = json.signature
        ? Binary.fromBase58(json.signature)
        : undefined;
      message.recipient = json.recipient;
      message._hash = json.hash ? Binary.fromBase58(json.hash) : undefined;
      message._encryptedData = json.encryptedData
        ? Binary.fromBase58(json.encryptedData)
        : undefined;

      return message;
    } catch (error) {
      throw new Error(
        `Failed to create message from JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private static fromBinary(data: Uint8Array): Message {
    try {
      const message = new Message("", "text/plain");
      let offset = 0;

      // Parse version
      message.version = data[offset++];

      // Parse meta type
      const typeLength = data[offset++];
      const typeBytes = data.slice(offset, offset + typeLength);
      message.meta.type = new TextDecoder().decode(typeBytes);
      offset += typeLength;

      if (message.version === MESSAGE_V2) {
        // Parse title
        const titleLength = data[offset++];
        const titleBytes = data.slice(offset, offset + titleLength);
        message.meta.title = new TextDecoder().decode(titleBytes);
        offset += titleLength;

        // Parse description (2 bytes for length)
        const descLength = (data[offset] << 8) | data[offset + 1];
        offset += 2;
        const descBytes = data.slice(offset, offset + descLength);
        message.meta.description = new TextDecoder().decode(descBytes);
        offset += descLength;
      }

      // Parse media type
      const mediaTypeLength = (data[offset] << 8) | data[offset + 1];
      offset += 2;
      const mediaTypeBytes = data.slice(offset, offset + mediaTypeLength);
      message.mediaType = new TextDecoder().decode(mediaTypeBytes);
      offset += mediaTypeLength;

      // Parse data
      const dataLength =
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3];
      offset += 4;
      message.data = new Binary(data.slice(offset, offset + dataLength));
      offset += dataLength;

      // Parse timestamp
      const timestampBytes = data.slice(offset, offset + 8);
      message.timestamp = Number(
        new DataView(
          timestampBytes.buffer,
          timestampBytes.byteOffset,
          8
        ).getBigUint64(0, false)
      );
      offset += 8;

      // Parse sender address
      const senderLength = data[offset++];
      const senderBytes = data.slice(offset, offset + senderLength);
      message.sender = new TextDecoder().decode(senderBytes);
      offset += senderLength;

      // Parse recipient address
      const recipientLength = data[offset++];
      const recipientBytes = data.slice(offset, offset + recipientLength);
      message.recipient = new TextDecoder().decode(recipientBytes);
      offset += recipientLength;

      // Parse signature if present
      if (offset < data.length) {
        const signatureLength = data[offset++];
        const signatureBytes = data.slice(offset, offset + signatureLength);
        message.signature = new Binary(signatureBytes);
      }

      return message;
    } catch (error) {
      throw new Error(
        `Failed to create message from binary: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
