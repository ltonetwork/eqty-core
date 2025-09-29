import Binary from "../Binary";
import {
  IEventJSON,
  IEventData,
  IEventAttachment,
  IBinary,
  ISignData,
  ISigner,
  VerifyFn,
} from "../types";
import EventChain, { EVENT_CHAIN_V3 } from "./EventChain";
import { isBinary } from "../utils/bytes"

export default class Event {
  private version = EVENT_CHAIN_V3;

  /** EVM chain id */
  networkId = 0;

  /** Meta type of the data */
  mediaType!: string;

  /** Data of the event */
  data!: IBinary;

  /** Time when the event was signed */
  timestamp?: number;

  /** Hash to the previous event */
  previous?: IBinary;

  /** Ethereum address of the signer */
  signerAddress?: string;

  /** Signature of the event */
  signature?: IBinary;

  /** Hash (see dynamic property) */
  private _hash?: IBinary;

  /** Hash of attachments related to the event */
  readonly attachments: IEventAttachment[] = [];

  constructor(
    data: IEventData | string | Uint8Array,
    mediaType?: string,
    previous?: string | Uint8Array
  ) {
    this._setData(data, mediaType);
    if (previous) this.previous = typeof previous == "string" ? Binary.fromHex(previous) : new Binary(previous);
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
    T extends { mediaType?: string; data?: IBinary; name?: string },
  >(
    data: IEventData | string | Uint8Array,
    mediaType?: string,
    target: T = this as unknown as T
  ): { mediaType: string; data: IBinary } & T {
    if (isBinary(data)) {
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

    return target as { mediaType: string; data: IBinary } & T;
  }

  get hash(): IBinary {
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
      case EVENT_CHAIN_V3:
        return this.toBinaryV3();
      default:
        throw new Error(
          `Event cannot be converted to binary: version ${this.version} not supported`
        );
    }
  }

  private toBinaryV3(): Uint8Array {
    const signerBytes = Binary.from(this.signerAddress!); // expected 42 ASCII chars for EVM address
    const mediaTypeBytes = Binary.from(this.mediaType);
    const dataBytes = new Binary(this.data);

    if (mediaTypeBytes.length > 0xffff)
      throw new Error("Media type too long: exceeds uint16");

    // Note: JS number max safe integer is >> 2^32-1, but buffer size will be a practical limit.
    if (dataBytes.length > 0xffffffff)
      throw new Error("Data too long: exceeds uint32");

    const mediaTypeLen = Binary.fromInt16(mediaTypeBytes.length); // uint16 BE
    const dataLen = Binary.fromInt32(dataBytes.length); // uint32 BE

    return Binary.concat(
      this.previous!,
      signerBytes,
      Binary.fromInt32(this.timestamp || 0),
      mediaTypeLen,
      mediaTypeBytes,
      dataLen,
      dataBytes
    );
  }

  private getSignData(): ISignData {
    if (this.version !== EVENT_CHAIN_V3) {
      throw new Error(`version ${this.version} not supported`);
    }

    if (!this.previous) throw new Error("previous is required");
    if (!this.signerAddress) throw new Error("signer address is required");
    if (!this.timestamp) throw new Error("timestamp is required");

    const domain = {
      name: "EqtyEvent",
      version: String(this.version),
      chainId: this.networkId,
    };

    const types = {
      Event: [
        { name: "version", type: "uint256" },
        { name: "previous", type: "bytes32" },
        { name: "signer", type: "address" },
        { name: "timestamp", type: "uint256" },
        { name: "mediaType", type: "string" },
        { name: "dataHash", type: "bytes32" },
      ],
    };

    const value = {
      version: this.version,
      previous: this.previous!,
      signer: this.signerAddress!,
      timestamp: this.timestamp!,
      mediaType: this.mediaType,
      dataHash: new Binary(this.data).hash(),
    };

    return { domain, types, value };
  }

  async verifySignature(verify: VerifyFn): Promise<boolean> {
    if (!this.signature || !this.signerAddress) return false;

    try {
      const { domain, types, value } = this.getSignData();
      return verify(this.signerAddress!, domain, types, value, this.signature.hex);
    } catch {
      return false;
    }
  }

  verifyHash(): boolean {
    try {
      const computedHash = new Binary(this.toBinary()).hash();
      return this.hash.toString() === computedHash.toString();
    } catch {
      return false;
    }
  }

  async signWith(signer: ISigner): Promise<this> {
    if (!this.timestamp) this.timestamp = Date.now();
    if (!this.signerAddress) this.signerAddress = await signer.getAddress();

    const { domain, types, value } = this.getSignData();

    const signature = await signer.signTypedData(domain, types, value);
    this.signature = new Binary(signature);

    return this;
  }

  addTo(chain: EventChain): this {
    chain.add(this);
    return this;
  }

  isSigned(): boolean {
    return !!this.signature;
  }

  get parsedData() {
    if (this.mediaType === "application/json") {
      try {
        return JSON.parse(this.data.toString());
      } catch { /* empty */ }
    }
    return this.data.toString();
  }

  toJSON(): IEventJSON {
    return {
      version: this.version,
      mediaType: this.mediaType,
      data: this.data.base64,
      timestamp: this.timestamp,
      previous: this.previous?.hex,
      signerAddress: this.signerAddress,
      signature: this.signature?.hex,
      hash: this.hash.hex,
      attachments: this.attachments.map((att) => ({
        name: att.name,
        mediaType: att.mediaType,
        data: att.data.base64,
      })),
    };
  }

  static from(data: IEventJSON | Uint8Array): Event {
    return isBinary(data) ? Event.fromBinary(data) : Event.fromJson(data);
  }

  private static fromBinary(data: Uint8Array): Event {
    const bin = new Binary(data);
    if (bin.length < 32 + 42 + 4 + 2 + 4) {
      throw new Error("Invalid event binary: too short");
    }

    let offset = 0;

    const previous = bin.slice(offset, offset + 32);
    offset += 32;

    const signerAddress = bin.slice(offset, offset + 42).toString();
    offset += 42;

    const timestamp = bin.dataView.getInt32(offset, false);
    offset += 4;

    // mediaType length (uint16 BE)
    const mtLen = bin.dataView.getUint16(offset, false);
    offset += 2;
    if (offset + mtLen > bin.length) throw new Error("Invalid event binary: mediaType out of bounds");
    const mediaType = bin.slice(offset, offset + mtLen).toString();
    offset += mtLen;

    // data length (uint32 BE)
    const dLen = bin.dataView.getUint32(offset, false);
    offset += 4;
    if (offset + dLen > bin.length) throw new Error("Invalid event binary: data out of bounds");
    const payload = bin.slice(offset, offset + dLen);
    offset += dLen;

    const event = new Event(payload, mediaType, previous.hex);
    event.version = EVENT_CHAIN_V3;
    event.signerAddress = signerAddress;
    event.timestamp = timestamp;

    // Hash of the full input for consistency with producers
    event._hash = bin.hash();

    return event;
  }

  private static fromJson(data: IEventJSON): Event {
    try {
      const event = new Event(
        Binary.fromBase64(data.data),
        data.mediaType,
        data.previous
      );
      event.version = data.version;
      event.timestamp = data.timestamp;
      event.signerAddress = data.signerAddress;
      event.signature = data.signature
        ? Binary.fromHex(data.signature)
        : undefined;
      event._hash = data.hash ? Binary.fromHex(data.hash) : undefined;

      if (data.attachments) {
        data.attachments.forEach((att) => {
          event.addAttachment(
            att.name,
            Binary.fromBase64(att.data),
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
