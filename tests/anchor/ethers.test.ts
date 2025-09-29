import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Contract } from "ethers";
import { AnchorClient } from "../../src/anchor";
import Binary from "../../src/Binary";

// A dummy contract address (any 20-byte hex)
const DUMMY_ADDRESS = "0x0000000000000000000000000000000000000001" as const;

let ethersContract: Contract;
let client: AnchorClient<any>;
let anchorSpy: ReturnType<typeof vi.fn>;
let maxAnchorsSpy: ReturnType<typeof vi.fn>;

describe("AnchorClient with ethers", () => {
  const key = Binary.fromHex("11".repeat(32));
  const value = Binary.fromHex("22".repeat(32));

  beforeEach(() => {
    ethersContract = new Contract(DUMMY_ADDRESS, AnchorClient.ABI);
    anchorSpy = vi.fn(async (_anchors: Array<{ key: `0x${string}`; value: `0x${string}` }>) => ({ hash: "0xdeadbeef" } as any));
    maxAnchorsSpy = vi.fn(async () => 16n);
    // @ts-expect-error override for testing
    ethersContract.anchor = anchorSpy;
    // @ts-expect-error override for testing
    ethersContract.maxAnchors = maxAnchorsSpy;
    client = new AnchorClient(ethersContract);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("anchor", () => {
    it("calls ethers.Contract.anchor with a single pair", async () => {
      await client.anchor(key, value);
      expect(anchorSpy).toHaveBeenCalledTimes(1);
      const args = anchorSpy.mock.calls[0][0];
      expect(args).toHaveLength(1);
      expect(args[0].key).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(args[0].value).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(args[0].key).toBe(new Binary(key).hex);
      expect(args[0].value).toBe(new Binary(value).hex);
    });

    it("calls ethers.Contract.anchor with array of pairs", async () => {
      await client.anchor([{ key, value }]);
      expect(anchorSpy).toHaveBeenCalledTimes(1);
      const args = anchorSpy.mock.calls[0][0];
      expect(args).toHaveLength(1);
      expect(args[0].key).toBe(new Binary(key).hex);
      expect(args[0].value).toBe(new Binary(value).hex);
    });

    it("calls ethers.Contract.anchor with array of keys and ZERO_HASH values", async () => {
      await client.anchor([key]);
      expect(anchorSpy).toHaveBeenCalledTimes(1);
      const args = anchorSpy.mock.calls[0][0];
      expect(args).toHaveLength(1);
      expect(args[0].key).toBe(new Binary(key).hex);
      expect(args[0].value).toMatch(/^0x0{64}$/);
    });

    it("calls ethers.Contract.anchor with single key and ZERO_HASH value", async () => {
      await client.anchor(key);
      expect(anchorSpy).toHaveBeenCalledTimes(1);
      const args = anchorSpy.mock.calls[0][0];
      expect(args).toHaveLength(1);
      expect(args[0].key).toBe(new Binary(key).hex);
      expect(args[0].value).toMatch(/^0x0{64}$/);
    });
  });

  describe("getMaxAnchors", () => {
    it("coerces bigint to number", async () => {
      const max = await client.getMaxAnchors();
      expect(maxAnchorsSpy).toHaveBeenCalledTimes(1);
      expect(max).toBe(16);
    });
  });
});
