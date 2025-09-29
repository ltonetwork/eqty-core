import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeFunctionData, type Account, type PublicClient, type WalletClient } from "viem";

import AnchorClient from "../../src/anchor/AnchorClient";
import Binary from "../../src/Binary";
import { ZERO_HASH } from "../../src/constants";
import ViemAnchorContract from "../../src/viem/ViemAnchorContract";
import { makeMockPublicClient, makeMockWalletClient } from "../utils/mockViem";

const ADDRESS = "0x0000000000000000000000000000000000000001";

const keyA = Binary.fromHex(`0x${"11".repeat(32)}`);
const valueA = Binary.fromHex(`0x${"22".repeat(32)}`);
const keyB = Binary.fromHex(`0x${"33".repeat(32)}`);
const valueB = Binary.fromHex(`0x${"44".repeat(32)}`);

describe("AnchorClient (viem)", () => {
  let publicClient: PublicClient;
  let wallet: WalletClient<any, any, Account>;
  let client: AnchorClient<unknown>;

  beforeEach(() => {
    const account = { address: "0x0000000000000000000000000000000000000002" } as Account;

    const simulateContract = vi.fn(async (args: any) => ({
      result: "0x",
      request: args,
    }));

    const writeContract = vi.fn(async () => "0xtransaction");

    const readContract = vi.fn(async (args: any) => {
      expect(args.functionName).toBe("maxAnchors");
      return 5n;
    });

    publicClient = makeMockPublicClient({
      simulateContract: simulateContract as any,
      readContract: readContract as any,
    });

    wallet = makeMockWalletClient<Account>({
      account,
      writeContract: writeContract as any,
    });

    const contract = new ViemAnchorContract(publicClient, wallet, ADDRESS);
    client = new AnchorClient(contract);
  });

  it("anchors an array of key/value pairs", async () => {
    await client.anchor([
      { key: keyA, value: valueA },
      { key: keyB, value: valueB },
    ]);

    expect(publicClient.simulateContract).toHaveBeenCalledTimes(1);
    const [args] = (publicClient.simulateContract as any).mock.calls[0];

    expect(args.account).toBe(wallet.account);
    expect(args.args[0]).toEqual([
      { key: keyA.hex, value: valueA.hex },
      { key: keyB.hex, value: valueB.hex },
    ]);
    expect(wallet.writeContract).toHaveBeenCalledWith(args);

    const encoded = encodeFunctionData({
      abi: AnchorClient.ABI,
      functionName: "anchor",
      args: [args.args[0]],
    });
    expect(typeof encoded).toBe("string");
  });

  it("anchors hashes with default zero values", async () => {
    await client.anchor([keyA, keyB]);

    const [args] = (publicClient.simulateContract as any).mock.calls[0];

    expect(args.args[0]).toEqual([
      { key: keyA.hex, value: ZERO_HASH },
      { key: keyB.hex, value: ZERO_HASH },
    ]);
  });

  it("returns the maximum number of anchors", async () => {
    const max = await client.getMaxAnchors();

    expect(max).toBe(5);
    expect(publicClient.readContract).toHaveBeenCalledWith({
      address: ADDRESS,
      abi: AnchorClient.ABI,
      functionName: "maxAnchors",
    });
  });
});
