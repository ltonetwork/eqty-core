import { expect } from "chai";
import { keccak_256 } from "@noble/hashes/sha3";

import Binary from "../../src/Binary";

describe("Binary", () => {
  describe("constructor and basic views", () => {
    it("encodes strings and decodes via toString", () => {
      const input = "hello";
      const binary = new Binary(input);

      expect(binary).to.have.lengthOf(input.length);
      expect(binary.toString()).to.equal(input);
    });

    it("allocates zeroed bytes for numeric length", () => {
      const binary = new Binary(4);

      expect(binary).to.be.instanceOf(Binary);
      expect(binary).to.have.lengthOf(4);
      expect(Array.from(binary)).to.deep.equal([0, 0, 0, 0]);
    });

    it("accepts array-like inputs", () => {
      const values = [1, 2, 3];
      const binary = new Binary(values);

      expect(Array.from(binary)).to.deep.equal(values);
    });

    it("exposes a live DataView over the same buffer", () => {
      const binary = new Binary(2);
      const view = binary.dataView;

      view.setUint16(0, 0x1234, false);

      expect(Array.from(binary)).to.deep.equal([0x12, 0x34]);
    });

    it("creates Binary instances on slice", () => {
      const binary = new Binary([10, 20, 30, 40]);
      const sliced = binary.slice(1, 3);

      expect(sliced).to.be.instanceOf(Binary);
      expect(Array.from(sliced)).to.deep.equal([20, 30]);
    });

    it("reverses in place and returns itself", () => {
      const binary = new Binary([1, 2, 3]);
      const reversed = binary.reverse();

      expect(reversed).to.equal(binary);
      expect(Array.from(binary)).to.deep.equal([3, 2, 1]);
    });

    it("produces a new reversed copy", () => {
      const original = new Binary([1, 2, 3]);
      const reversed = original.toReversed();

      expect(reversed).to.be.instanceOf(Binary);
      expect(reversed).to.not.equal(original);
      expect(Array.from(reversed)).to.deep.equal([3, 2, 1]);
      expect(Array.from(original)).to.deep.equal([1, 2, 3]);
    });
  });

  describe("base encoding", () => {
    const bytes = new Binary([0, 1, 2, 3, 4, 5, 250, 251, 252, 253, 254, 255]);

    it("supports round-tripping base58", () => {
      const encoded = bytes.base58;
      const decoded = Binary.fromBase58(encoded);

      expect(Array.from(decoded)).to.deep.equal(Array.from(bytes));
    });

    it("supports round-tripping base64", () => {
      const encoded = bytes.base64;
      const decoded = Binary.fromBase64(encoded);

      expect(Array.from(decoded)).to.deep.equal(Array.from(bytes));
    });

    it("supports hexadecimal conversions", () => {
      const expectedHexRaw = "000102030405fafbfcfdfeff";

      expect(bytes.hexRaw).to.equal(expectedHexRaw);
      expect(bytes.hex).to.equal(`0x${expectedHexRaw}`);

      const fromRaw = Binary.fromHex(expectedHexRaw);
      const fromPrefixed = Binary.fromHex(`0x${expectedHexRaw}`);

      expect(Array.from(fromRaw)).to.deep.equal(Array.from(bytes));
      expect(Array.from(fromPrefixed)).to.deep.equal(Array.from(bytes));
    });

    it("supports multibase decoding", () => {
      const base58Value = `z${bytes.base58}`;
      const base64Value = `m${bytes.base64}`;
      const base16Value = `f${bytes.hexRaw}`;
      const base16UpperValue = `F${bytes.hexRaw}`;

      expect(Array.from(Binary.fromMultibase(base58Value))).to.deep.equal(Array.from(bytes));
      expect(Array.from(Binary.fromMultibase(base64Value))).to.deep.equal(Array.from(bytes));
      expect(Array.from(Binary.fromMultibase(base16Value))).to.deep.equal(Array.from(bytes));
      expect(Array.from(Binary.fromMultibase(base16UpperValue))).to.deep.equal(Array.from(bytes));
    });

    it("throws for unsupported multibase prefixes", () => {
      expect(() => Binary.fromMultibase("x1234")).to.throw("Unsupported multi-base encoding: x");
    });
  });

  describe("hashing", () => {
    it("returns a keccak-256 hash", () => {
      const value = Binary.from("keccak test");
      const expected = keccak_256(value);
      const hash = value.hash();

      expect(Array.from(hash)).to.deep.equal(Array.from(expected));
      expect(hash.hexRaw).to.equal(Buffer.from(expected).toString("hex"));
    });
  });

  describe("numeric factories", () => {
    it("creates big-endian int16 values", () => {
      expect(Array.from(Binary.fromInt16(0x1234))).to.deep.equal([0x12, 0x34]);
      expect(Array.from(Binary.fromInt16(-2))).to.deep.equal([0xff, 0xfe]);
    });

    it("creates big-endian int32 values", () => {
      expect(Array.from(Binary.fromInt32(0x12345678))).to.deep.equal([0x12, 0x34, 0x56, 0x78]);
      expect(Array.from(Binary.fromInt32(-2))).to.deep.equal([0xff, 0xff, 0xff, 0xfe]);
    });
  });

  describe("Binary.from overloads", () => {
    it("creates from strings", () => {
      const fromString = Binary.from("abc");
      const manual = new Binary("abc");

      expect(Array.from(fromString)).to.deep.equal(Array.from(manual));
    });

    it("creates from iterable with optional mapfn", () => {
      const fromIterable = Binary.from([1, 2, 3], (value) => value * 2);

      expect(Array.from(fromIterable)).to.deep.equal([2, 4, 6]);
    });

    it("creates from typed arrays", () => {
      const source = Uint8Array.from([9, 8, 7]);
      const fromTypedArray = Binary.from(source);

      expect(Array.from(fromTypedArray)).to.deep.equal([9, 8, 7]);
    });
  });

  describe("concat", () => {
    it("joins multiple binary-like inputs", () => {
      const a = new Binary([1, 2]);
      const b = new Binary([3]);
      const c = new Uint8Array([4, 5]);

      const concatenated = Binary.concat(a, b, c);

      expect(concatenated).to.be.instanceOf(Binary);
      expect(Array.from(concatenated)).to.deep.equal([1, 2, 3, 4, 5]);
    });
  });
});
