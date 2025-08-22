import { expect } from "chai";
import Binary from "../src/Binary";

describe("Binary", () => {
  describe("constructor", () => {
    it("should create from string", () => {
      const binary = new Binary("Hello World");
      expect(binary.toString()).to.equal("Hello World");
    });

    it("should create from Uint8Array", () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]);
      const binary = new Binary(data);
      expect(binary.toString()).to.equal("Hello");
    });

    it("should create empty binary", () => {
      const binary = new Binary();
      expect(binary.length).to.equal(0);
    });
  });

  describe("encoding", () => {
    it("should convert to hex", () => {
      const binary = new Binary("Hello");
      expect(binary.hex).to.equal("48656c6c6f");
    });

    it("should convert to base64", () => {
      const binary = new Binary("Hello");
      expect(binary.base64).to.equal("SGVsbG8=");
    });

    it("should convert to base58", () => {
      const binary = new Binary("Hello");
      expect(binary.base58).to.be.a("string");
      expect(binary.base58.length).to.be.greaterThan(0);
    });
  });

  describe("static methods", () => {
    it("should create from hex", () => {
      const binary = Binary.fromHex("48656c6c6f");
      expect(binary.toString()).to.equal("Hello");
    });

    it("should create from base64", () => {
      const binary = Binary.fromBase64("SGVsbG8=");
      expect(binary.toString()).to.equal("Hello");
    });

    it("should create from base58", () => {
      const original = new Binary("Hello");
      const fromBase58 = Binary.fromBase58(original.base58);
      expect(fromBase58.toString()).to.equal("Hello");
    });

    it("should concatenate arrays", () => {
      const a = new Binary("Hello");
      const b = new Binary("World");
      const combined = Binary.concat(a, b);
      expect(combined.toString()).to.equal("HelloWorld");
    });
  });

  describe("hashing", () => {
    it("should create keccak256 hash", () => {
      const binary = new Binary("Hello");
      const hash = binary.hash();
      expect(hash).to.be.instanceOf(Binary);
      expect(hash.length).to.equal(32);
    });
  });
});
