import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3";
import { base58, base64, hex } from "@scure/base";

import Binary from "../src/Binary";

describe("Binary", () => {
  it("constructs from numbers, strings, array-likes and defaults", () => {
    const numeric = new Binary(3);
    expect(numeric).toBeInstanceOf(Binary);
    expect([...numeric]).toEqual([0, 0, 0]);

    const text = new Binary("hello");
    expect(text.toString()).toBe("hello");

    const arrayLike = new Binary([1, 2, 3]);
    expect([...arrayLike]).toEqual([1, 2, 3]);

    const empty = new Binary();
    expect([...empty]).toEqual([]);
  });

  it("exposes base encodings", () => {
    const value = new Binary("vitest");

    expect(value.base58).toBe(base58.encode(value));
    expect(value.base64).toBe(base64.encode(value));
    expect(value.hexRaw).toBe(hex.encode(value));
    expect(value.hex).toBe(`0x${value.hexRaw}`);
  });

  it("provides a DataView over its buffer", () => {
    const value = new Binary([0x12, 0x34]);
    const view = value.dataView;

    expect(view.byteLength).toBe(value.buffer.byteLength);
    expect(view.getUint16(0, false)).toBe(0x1234);
  });

  it("hashes using keccak-256", () => {
    const value = new Binary("hash me");
    const hashed = value.hash();

    expect(hashed).toBeInstanceOf(Binary);
    expect(hashed.hexRaw).toBe(hex.encode(keccak_256(value)));
  });

  it("converts to string and supports slicing", () => {
    const value = new Binary("abcdef");
    expect(value.toString()).toBe("abcdef");

    const sliced = value.slice(1, 4);
    expect(sliced).toBeInstanceOf(Binary);
    expect(sliced.toString()).toBe("bcd");
    expect(value.toString()).toBe("abcdef");
  });

  it("reverses in place and returns a new reversed copy", () => {
    const value = new Binary([1, 2, 3]);

    const reversedInPlace = value.reverse();
    expect(reversedInPlace).toBe(value);
    expect([...value]).toEqual([3, 2, 1]);

    const fresh = value.toReversed();
    expect(fresh).not.toBe(value);
    expect([...fresh]).toEqual([1, 2, 3]);
    expect([...value]).toEqual([3, 2, 1]);
  });

  it("creates Binary instances using the static from overloads", () => {
    const fromString = Binary.from("text");
    expect(fromString.toString()).toBe("text");

    const fromIterable = Binary.from([1, 2, 3], (value, index) => value + index);
    expect([...fromIterable]).toEqual([1, 3, 5]);

    const fromIterableWithThis = Binary.from<number>(
      [1, 2],
      function (this: { increment: number }, value) {
        return value + this.increment;
      },
      { increment: 10 }
    );
    expect([...fromIterableWithThis]).toEqual([11, 12]);
  });

  it("decodes common encodings", () => {
    const value = new Binary("decode me");

    const b58 = Binary.fromBase58(value.base58);
    expect(b58.toString()).toBe("decode me");

    const b64 = Binary.fromBase64(value.base64);
    expect(b64.toString()).toBe("decode me");

    const b16 = Binary.fromHex(value.hex);
    expect(b16.toString()).toBe("decode me");

    const b16Raw = Binary.fromHex(value.hexRaw);
    expect(b16Raw.toString()).toBe("decode me");
  });

  it("parses multibase values", () => {
    const value = new Binary("multibase");

    expect(Binary.fromMultibase(`z${value.base58}`).toString()).toBe("multibase");
    expect(Binary.fromMultibase(`m${value.base64}`).toString()).toBe("multibase");
    expect(Binary.fromMultibase(`f${value.hexRaw}`).toString()).toBe("multibase");
    expect(Binary.fromMultibase(`F${value.hexRaw}`).toString()).toBe("multibase");

    expect(() => Binary.fromMultibase("x123")).toThrowError(
      /Unsupported multi-base encoding: x/
    );
  });

  it("creates Binary values from integers", () => {
    const int16 = Binary.fromInt16(0x1234);
    expect([...int16]).toEqual([0x12, 0x34]);

    const int16Negative = Binary.fromInt16(-2);
    expect(int16Negative.dataView.getInt16(0, false)).toBe(-2);

    const int32 = Binary.fromInt32(0x12345678);
    expect([...int32]).toEqual([0x12, 0x34, 0x56, 0x78]);

    const int32Negative = Binary.fromInt32(-10);
    expect(int32Negative.dataView.getInt32(0, false)).toBe(-10);
  });

  it("concatenates multiple byte arrays", () => {
    const concatenated = Binary.concat(new Uint8Array([1, 2]), new Binary([3, 4]), [5, 6]);
    expect(concatenated).toBeInstanceOf(Binary);
    expect([...concatenated]).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
