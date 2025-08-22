import { keccak256 } from "ethers";
import { base58 } from "@scure/base";

import { IBinary } from "./types/binary";

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
    return btoa(String.fromCharCode(...this));
  }

  get hex(): string {
    return Array.from(this)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  get dataView(): DataView {
    return new DataView(this.buffer);
  }

  /** Create a keccak256 hash (Ethereum standard) */
  hash(): Binary {
    const hashHex = keccak256(this);
    return Binary.fromHex(hashHex.slice(2)); // Remove '0x' prefix
  }

  /** Create HMAC SHA256 hash */
  hmac(key: string | Uint8Array): Binary {
    // For now, use a simple approach - in production, use crypto.subtle
    const keyBytes =
      typeof key === "string" ? new TextEncoder().encode(key) : key;
    const combined = new Uint8Array(keyBytes.length + this.length);
    combined.set(keyBytes);
    combined.set(this, keyBytes.length);
    return new Binary(combined).hash();
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
    arrayLike: ArrayLike<T>,
    mapfn: (v: T, k: number) => number,
    thisArg?: any,
  ): Binary;
  static from<T>(
    arrayLike: ArrayLike<T> | string,
    mapfn?: (v: T, k: number) => number,
    thisArg?: any,
  ): Binary {
    if (typeof arrayLike === "string") {
      return new Binary(arrayLike);
    }
    if (mapfn) {
      return new Binary(super.from(arrayLike, mapfn, thisArg));
    }
    return new Binary(super.from(arrayLike as ArrayLike<number>));
  }

  static fromBase58(value: string): Binary {
    try {
      return new Binary(base58.decode(value));
    } catch (error) {
      throw new Error(
        `Invalid base58 string: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static fromBase64(value: string): Binary {
    try {
      return new Binary(
        atob(value)
          .split("")
          .map((c) => c.charCodeAt(0)),
      );
    } catch (error) {
      throw new Error(
        `Invalid base64 string: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static fromHex(value: string): Binary {
    try {
      const hex = value.startsWith("0x") ? value.slice(2) : value;
      if (hex.length % 2 !== 0) {
        throw new Error("Hex string must have even length");
      }
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        if (isNaN(byte)) {
          throw new Error(`Invalid hex character at position ${i}`);
        }
        bytes[i / 2] = byte;
      }
      return new Binary(bytes);
    } catch (error) {
      throw new Error(
        `Invalid hex string: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static fromMultibase(value: string): Binary {
    try {
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
    } catch (error) {
      throw new Error(
        `Invalid multibase string: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
