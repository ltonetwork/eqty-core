import { beforeEach, describe, expect, it } from "vitest";
import { Contract, Interface, ZeroAddress } from "ethers";

import AnchorClient from "../../src/anchor/AnchorClient";
import Binary from "../../src/Binary";
import {
  BASE_ANCHOR_CONTRACT,
  BASE_CHAIN_ID,
  BASE_SEPOLIA_ANCHOR_CONTRACT,
  BASE_SEPOLIA_CHAIN_ID,
  ZERO_HASH,
} from "../../src/constants";
class RecordingContractRunner {
  public readonly sentTransactions: any[] = [];
  public readonly callRequests: any[] = [];
  public readonly estimateRequests: any[] = [];
  public provider: null = null;

  constructor(
    private readonly iface: Interface,
    private readonly address: `0x${string}`,
    private readonly maxAnchors: bigint,
  ) {}

  async getAddress(): Promise<`0x${string}`> {
    return this.address;
  }

  async sendTransaction(tx: any): Promise<any> {
    this.sentTransactions.push(tx);
    return { hash: "0xtransaction", ...tx };
  }

  async call(tx: any): Promise<string> {
    this.callRequests.push(tx);
    return this.iface.encodeFunctionResult("maxAnchors", [this.maxAnchors]);
  }

  async estimateGas(tx: any): Promise<bigint> {
    this.estimateRequests.push(tx);
    return 21_000n;
  }

  async resolveAddress(address: string): Promise<string> {
    return address;
  }
}

describe("AnchorClient (ethers)", () => {
  const iface = new Interface(AnchorClient.ABI);
  const address = ZeroAddress;
  const keyA = Binary.fromHex(`0x${"11".repeat(32)}`);
  const valueA = Binary.fromHex(`0x${"22".repeat(32)}`);
  const keyB = Binary.fromHex(`0x${"33".repeat(32)}`);
  const valueB = Binary.fromHex(`0x${"44".repeat(32)}`);

  const decodeAnchors = (data: string) => {
    const [anchors] = iface.decodeFunctionData("anchor", data) as any[];
    return anchors.map((anchor: any) => ({
      key: anchor.key ?? anchor[0],
      value: anchor.value ?? anchor[1],
    }));
  };

  let runner: RecordingContractRunner;
  let contract: Contract;
  let client: AnchorClient<any>;

  beforeEach(() => {
    runner = new RecordingContractRunner(iface, address, 5n);
    contract = new Contract(address, AnchorClient.ABI, runner as unknown as any);
    client = new AnchorClient(contract as unknown as any);
  });

  it("anchors an array of key/value pairs", async () => {
    await client.anchor([
      { key: keyA, value: valueA },
      { key: keyB, value: valueB },
    ]);

    expect(runner.sentTransactions).toHaveLength(1);
    const [tx] = runner.sentTransactions;
    const anchors = decodeAnchors(tx.data);

    expect(anchors).toEqual([
      { key: keyA.hex, value: valueA.hex },
      { key: keyB.hex, value: valueB.hex },
    ]);
  });

  it("anchors a single key/value pair", async () => {
    await client.anchor(keyA, valueA);

    const [tx] = runner.sentTransactions;
    const anchors = decodeAnchors(tx.data);

    expect(anchors).toEqual([{ key: keyA.hex, value: valueA.hex }]);
  });

  it("anchors an array of hashes with default values", async () => {
    await client.anchor([keyA, keyB]);

    const [tx] = runner.sentTransactions;
    const anchors = decodeAnchors(tx.data);

    expect(anchors).toEqual([
      { key: keyA.hex, value: ZERO_HASH },
      { key: keyB.hex, value: ZERO_HASH },
    ]);
  });

  it("anchors a single hash with a default value", async () => {
    await client.anchor(keyA);

    const [tx] = runner.sentTransactions;
    const anchors = decodeAnchors(tx.data);

    expect(anchors).toEqual([{ key: keyA.hex, value: ZERO_HASH }]);
  });

  it("returns the maximum number of anchors", async () => {
    const max = await client.getMaxAnchors();

    expect(max).toBe(5);
    expect(runner.callRequests).toHaveLength(1);
    const [callTx] = runner.callRequests;
    expect(callTx.to).toBe(address);
  });

  it("resolves contract addresses for supported networks", () => {
    expect(AnchorClient.contractAddress(BASE_CHAIN_ID)).toBe(BASE_ANCHOR_CONTRACT);
    expect(AnchorClient.contractAddress(BASE_SEPOLIA_CHAIN_ID)).toBe(BASE_SEPOLIA_ANCHOR_CONTRACT);
  });

  it("throws for unsupported networks", () => {
    expect(() => AnchorClient.contractAddress(1)).toThrow("Network ID 1 is not supported");
  });
});
