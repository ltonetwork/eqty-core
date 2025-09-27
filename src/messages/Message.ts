import { Signer, verifyTypedData } from "ethers";
import Binary from "../Binary";
import {
  IMessageMeta,
  IMessageJSON,
  IMessageData,
  ISignData,
} from "../types";

const MESSAGE_V3 = 3;

export default class Message {
  /** Version of the message */
  version = MESSAGE_V3;

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

  constructor(
    data: IMessageData | string | Uint8Array,
    mediaType?: string,
    meta: Partial<IMessageMeta> | string = {}
  ) {
    if (typeof meta === "string") meta = { type: meta }; // Backwards compatibility
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

  get hash(): Binary {
    return this._hash ?? new Binary(this.toBinary(false)).hash();
  }

  to(recipient: string): Message {
    if (this.signature) throw new Error("Message is already signed");

    this.recipient = recipient;
    return this;
  }

  private getSignData(): ISignData {
    if (!this.sender) throw new Error("sender is required");
    if (!this.recipient) throw new Error("recipient is required");
    if (!this.timestamp) throw new Error("timestamp is required");

    const domain = {
      name: "EqtyMessage",
      version: String(this.version),
    };

    const types = {
      Message: [
        { name: "version", type: "uint256" },
        { name: "sender", type: "address" },
        { name: "recipient", type: "address" },
        { name: "timestamp", type: "uint256" },
        { name: "mediaType", type: "string" },
        { name: "dataHash", type: "bytes32" },
        { name: "metaHash", type: "bytes32" },
      ],
    };

    const metaHash = new Binary(JSON.stringify(this.meta)).hash();
    const value = {
      version: this.version,
      sender: this.sender!,
      recipient: this.recipient!,
      timestamp: this.timestamp!,
      mediaType: this.mediaType,
      dataHash: new Binary(this.data).hash(),
      metaHash,
    };

    return { domain, types, value };
  }

  async signWith(sender: Signer): Promise<this> {
    if (this.signature) throw new Error("Message is already signed");

    this.sender = await sender.getAddress();
    this.timestamp = Date.now();

    const { domain, types, value } = this.getSignData();
    const signature: string = await sender.signTypedData(domain, types, value);

    this.signature = new Binary(signature);

    return this;
  }

  isSigned(): boolean {
    return !!this.signature;
  }

  verifySignature(): boolean {
    if (!this.signature || !this.sender) return false;

    const { domain, types, value } = this.getSignData();
    const recoveredAddress = verifyTypedData(domain, types, value, this.signature.hex);
    return recoveredAddress.toLowerCase() === this.sender!.toLowerCase();
  }

  verifyHash(): boolean {
    try {
      const computedHash = new Binary(this.toBinary(false)).hash();
      return this.hash.hex === computedHash.hex;
    } catch (error) {
      return false;
    }
  }

  private toBinaryV3(withSignature = true): Uint8Array {
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
      case MESSAGE_V3:
        return this.toBinaryV3(withSignature);
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
    };
  }

  static from(data: IMessageJSON | Uint8Array): Message {
    return (data instanceof Uint8Array) ? Message.fromBinary(data) : Message.fromJSON(data);
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
      message.signature = json.signature ? Binary.fromBase58(json.signature) : undefined;
      message.recipient = json.recipient;
      message._hash = json.hash ? Binary.fromBase58(json.hash) : undefined;

      return message;
    } catch (error) {
      throw new Error(
        `Failed to create message from JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private static fromBinary(data: Uint8Array): Message {
    const message = new Message("", "text/plain");
    let offset = 0;

    // Parse version
    message.version = data[offset++];

    if (message.version !== MESSAGE_V3) {
      throw new Error(`Message version ${message.version} not supported`);
    }

    // Parse meta type
    const typeLength = data[offset++];
    const typeBytes = data.slice(offset, offset + typeLength);
    message.meta.type = new TextDecoder().decode(typeBytes);
    offset += typeLength;

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
  }
}
