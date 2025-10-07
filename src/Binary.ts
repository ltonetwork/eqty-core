import { keccak_256 } from "@noble/hashes/sha3";
import { base58, base64, hex } from "@scure/base";

import { IBinary } from "./types";

const HEX_PREFIX = "0x";

export default class Binary extends Uint8Array implements IBinary {
  constructor(value?: string | ArrayLike<number> | number) {
    if (typeof value === "number") {
      super(value);
    } else {
      const bytes =
        typeof value === "string"
          ? new TextEncoder().encode(value)
          : value || [];
      super(bytes);
    }
  }

  get base58(): string {
    return base58.encode(this);
  }

  get base64(): string {
    return base64.encode(this);
  }

  get hexRaw(): string {
    return hex.encode(this);
  }

  get hex(): string {
    return `${HEX_PREFIX}${this.hexRaw}`;
  }

  get dataView(): DataView {
    return new DataView(this.buffer);
  }

  hash(): Binary {
    const hashBytes = keccak_256(this);
    return new Binary(hashBytes);
  }

  toString(): string {
    return new TextDecoder().decode(this);
  }

  slice(start?: number, end?: number): Binary {
    return new Binary(super.slice(start, end));
  }

  reverse(): this {
    super.reverse();
    return this;
  }

  toReversed(): Binary {
    return new Binary(this).reverse();
  }

  static from(arrayLike: ArrayLike<number> | Iterable<number> | string): Binary;
  static from<T>(
    arrayLike: Iterable<T>,
    mapfn?: (v: T, k: number) => number,
    thisArg?: any
  ): Binary;
  static from<T>(
    arrayLike: Iterable<T> | string,
    mapfn?: (v: T, k: number) => number,
    thisArg?: any
  ): Binary {
    return new Binary(
      typeof arrayLike === "string"
        ? arrayLike
        : Uint8Array.from<T>(arrayLike, mapfn, thisArg)
    );
  }

  static fromBase58(value: string): Binary {
    return new Binary(base58.decode(value));
  }

  static fromBase64(value: string): Binary {
    return new Binary(base64.decode(value));
  }

  static fromHex(value: string): Binary {
    if (value.startsWith(HEX_PREFIX)) value = value.slice(HEX_PREFIX.length);
    return new Binary(hex.decode(value));
  }

  static fromMultibase(value: string): Binary {
    const code = value.charAt(0);
    const encoded = value.slice(1);

    switch (code) {
      case "z":
        return Binary.fromBase58(encoded);
      case "m":
        return Binary.fromBase64(encoded);
      case "f":
      case "F":
        return Binary.fromHex(encoded);
      default:
        throw new Error(`Unsupported multi-base encoding: ${code}`);
    }
  }

  // Big Endian
  static fromInt16(value: number): Binary {
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setInt16(0, value, false);
    return new Binary(bytes);
  }

  static fromInt32(value: number): Binary {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setInt32(0, value, false);
    return new Binary(bytes);
  }

  static concat(...items: Array<ArrayLike<number>>): Binary {
    const totalLength = items.reduce((sum, item) => sum + item.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const item of items) {
      result.set(item, offset);
      offset += item.length;
    }

    return new Binary(result);
  }
}
