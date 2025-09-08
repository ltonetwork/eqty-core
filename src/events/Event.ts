import { keccak256, recoverAddress } from "ethers";
import { ISigner } from "../signer";
import Binary from "../Binary";
import {
  IEventJSON,
  IEventData,
  IEventAttachment,
  IEventSignable,
} from "../types/events";
import EventChain from "./EventChain";
import { EVENT_CHAIN_V1, EVENT_CHAIN_V2, HEX_PREFIX } from "../constants";

export default class Event implements IEventSignable {
  private version = EVENT_CHAIN_V2;

  /** Meta type of the data */
  mediaType!: string;

  /** Data of the event */
  data!: Binary;

  /** Time when the event was signed */
  timestamp?: number;

  /** Hash to the previous event */
  previous?: Binary;

  /** Ethereum address of the signer */
  signerAddress?: string;

  /** Signature of the event */
  signature?: Binary;

  /** Hash (see dynamic property) */
  private _hash?: Binary;

  /** Hash of attachments related to the event */
  readonly attachments: IEventAttachment[] = [];

  constructor(
    data: IEventData | string | Uint8Array,
    mediaType?: string,
    previous?: string | Uint8Array
  ) {
    this._setData(data, mediaType);
    if (previous)
      this.previous =
        typeof previous == "string"
          ? Binary.fromBase58(previous)
          : new Binary(previous);
  }

  addAttachment(
    name: string,
    data: IEventData | string | Uint8Array,
    mediaType?: string
  ): void {
    const attachment = this._setData(data, mediaType, { name });
    this.attachments.push(attachment);
  }

  private _setData<
    T extends { mediaType?: string; data?: Binary; name?: string },
  >(
    data: IEventData | string | Uint8Array,
    mediaType?: string,
    target: T = this as unknown as T
  ): { mediaType: string; data: Binary } & T {
    if (data instanceof Uint8Array) {
      target.mediaType = mediaType ?? "application/octet-stream";
      target.data = data instanceof Binary ? data : new Binary(data);
    } else if (typeof data === "string") {
      target.mediaType = mediaType ?? "text/plain";
      target.data = new Binary(data);
    } else {
      if (mediaType && mediaType !== "application/json")
        throw new Error(`Unable to encode data as ${mediaType}`);

      target.mediaType = mediaType ?? "application/json";
      target.data = new Binary(JSON.stringify(data));
    }

    return target as { mediaType: string; data: Binary } & T;
  }

  get hash(): Binary {
    return this._hash ?? new Binary(this.toBinary()).hash();
  }

  toBinary(): Uint8Array {
    if (typeof this.data == "undefined")
      throw new Error("Event cannot be converted to binary: data unknown");
    if (!this.signerAddress)
      throw new Error(
        "Event cannot be converted to binary: signer address not set"
      );
    if (!this.previous)
      throw new Error(
        "Event cannot be converted to binary: event is not part of an event chain"
      );

    switch (this.version) {
      case EVENT_CHAIN_V1:
        return this.toBinaryV1();
      case EVENT_CHAIN_V2:
        return this.toBinaryV2();
      default:
        throw new Error(
          `Event cannot be converted to binary: version ${this.version} not supported`
        );
    }
  }

  private toBinaryV1(): Uint8Array {
    return Binary.concat(
      this.previous!,
      Binary.from(this.signerAddress!),
      Binary.fromInt32(this.timestamp || 0),
      Binary.from(this.mediaType),
      this.data
    );
  }

  private toBinaryV2(): Uint8Array {
    return Binary.concat(
      this.previous!,
      Binary.from(this.signerAddress!),
      Binary.fromInt32(this.timestamp || 0),
      Binary.from(this.mediaType),
      this.data
    );
  }

  verifySignature(): boolean {
    if (!this.signature || !this.signerAddress) return false;

    try {
      // Recover signer from signature using ethers.js
      const binaryData = this.toBinary();
      const messageHash = keccak256(binaryData);
      const signatureHex = HEX_PREFIX + this.signature.hex;
      const recoveredAddress = recoverAddress(messageHash, signatureHex);
      return (
        recoveredAddress.toLowerCase() === this.signerAddress.toLowerCase()
      );
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }

  verifyHash(): boolean {
    try {
      const computedHash = new Binary(this.toBinary()).hash();
      return this.hash.toString() === computedHash.toString();
    } catch (error) {
      console.error("Hash verification failed:", error);
      return false;
    }
  }

  async signWith(signer: ISigner): Promise<this> {
    try {
      if (!this.timestamp) this.timestamp = Date.now();
      if (!this.signerAddress) this.signerAddress = await signer.getAddress();

      const signature = await signer.sign(this.toBinary());
      this.signature = new Binary(signature);

      return this;
    } catch (error) {
      throw new Error(
        `Failed to sign event: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  addTo(chain: EventChain): this {
    chain.addEvent(this);
    return this;
  }

  isSigned(): boolean {
    return !!this.signature;
  }

  get parsedData() {
    if (this.mediaType === "application/json") {
      try {
        return JSON.parse(this.data.toString());
      } catch {
        return this.data.toString();
      }
    }
    return this.data.toString();
  }

  toJSON(): IEventJSON {
    return {
      version: this.version,
      mediaType: this.mediaType,
      data: this.data.base58,
      timestamp: this.timestamp,
      previous: this.previous?.base58,
      signerAddress: this.signerAddress,
      signature: this.signature?.base58,
      hash: this.hash.base58,
      attachments: this.attachments.map((att) => ({
        name: att.name,
        mediaType: att.mediaType,
        data: att.data.base58,
      })),
    };
  }

  static from(data: IEventJSON, version = 2): Event {
    try {
      const event = new Event(
        Binary.fromBase58(data.data),
        data.mediaType,
        data.previous
      );
      event.version = data.version ?? version;
      event.timestamp = data.timestamp;
      event.signerAddress = data.signerAddress;
      event.signature = data.signature
        ? Binary.fromBase58(data.signature)
        : undefined;
      event._hash = data.hash ? Binary.fromBase58(data.hash) : undefined;

      if (data.attachments) {
        data.attachments.forEach((att) => {
          event.addAttachment(
            att.name,
            Binary.fromBase58(att.data),
            att.mediaType
          );
        });
      }

      return event;
    } catch (error) {
      throw new Error(
        `Failed to create event from JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
