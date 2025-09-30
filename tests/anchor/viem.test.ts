import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AnchorClient } from "../../src/anchor";
import { ViemContract } from "../../src/viem";
import Binary from "../../src/Binary";
import { Account, createPublicClient, createWalletClient, http, WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { PublicClient } from "viem"
import { mainnet } from "viem/chains"
import { MockInstance } from "@vitest/spy"

// Dummy contract address (20-byte hex)
const DUMMY_ADDRESS = "0x0000000000000000000000000000000000000002" as const;

let publicClient: PublicClient;
let walletClient: WalletClient;
let account: Account;
let client: AnchorClient<any>;

// Spies
let simulateSpy: MockInstance;
let writeSpy: MockInstance;
let readSpy: MockInstance;

describe("AnchorClient with viem", () => {
  const key = Binary.fromHex("11".repeat(32));
  const value = Binary.fromHex("22".repeat(32));

  beforeEach(() => {
    // Create real viem clients
    account = privateKeyToAccount(`0x${"11".repeat(32)}`);
    publicClient = createPublicClient({ chain: mainnet, transport: http("http://127.0.0.1:8545") });
    walletClient = createWalletClient({ chain: mainnet, transport: http("http://127.0.0.1:8545"), account });

    // Mock only the methods we use to avoid network calls
    // @ts-expect-error TS2345
    simulateSpy = vi.spyOn(publicClient, "simulateContract").mockImplementation(async (args: any) => ({ result: '0x123', request: args }));
    readSpy = vi.spyOn(publicClient, "readContract").mockResolvedValue(16n);
    writeSpy = vi.spyOn(walletClient, "writeContract").mockResolvedValue("0xdeadbeef");

    const contract = new ViemContract(publicClient, walletClient, DUMMY_ADDRESS);
    client = new AnchorClient(contract);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls viem simulate/write with a single pair", async () => {
    await client.anchor(key, value);

    expect(simulateSpy).toHaveBeenCalledTimes(1);
    const simArgs = simulateSpy.mock.calls[0][0];
    expect(simArgs.address).toBe(DUMMY_ADDRESS);
    expect(simArgs.abi).toBe(AnchorClient.ABI);
    expect(simArgs.functionName).toBe("anchor");

    // args is [anchors]
    const anchorsArg = simArgs.args[0];
    expect(Array.isArray(anchorsArg)).toBe(true);
    expect(anchorsArg).toHaveLength(1);
    expect(anchorsArg[0].key).toBe(new Binary(key).hex);
    expect(anchorsArg[0].value).toBe(new Binary(value).hex);

    // account passed through
    expect(simArgs.account).toEqual(account);

    // write called with the request returned by simulate
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy.mock.calls[0][0]).toEqual(simArgs);
  });

  it("calls viem simulate/write with array of pairs", async () => {
    await client.anchor([{ key, value }]);

    expect(simulateSpy).toHaveBeenCalledTimes(1);
    const simArgs = simulateSpy.mock.calls[0][0];
    const anchorsArg = simArgs.args[0];
    expect(anchorsArg).toHaveLength(1);
    expect(anchorsArg[0].key).toBe(new Binary(key).hex);
    expect(anchorsArg[0].value).toBe(new Binary(value).hex);

    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("calls viem simulate/write with array of keys; value defaults to ZERO_HASH", async () => {
    await client.anchor([key]);

    expect(simulateSpy).toHaveBeenCalledTimes(1);
    const anchorsArg = simulateSpy.mock.calls[0][0].args[0];
    expect(anchorsArg).toHaveLength(1);
    expect(anchorsArg[0].key).toBe(new Binary(key).hex);
    expect(anchorsArg[0].value).toMatch(/^0x0{64}$/);

    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("calls viem simulate/write with single key; value defaults to ZERO_HASH", async () => {
    await client.anchor(key);

    expect(simulateSpy).toHaveBeenCalledTimes(1);
    const anchorsArg = simulateSpy.mock.calls[0][0].args[0];
    expect(anchorsArg).toHaveLength(1);
    expect(anchorsArg[0].key).toBe(new Binary(key).hex);
    expect(anchorsArg[0].value).toMatch(/^0x0{64}$/);

    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("coerces bigint from viem readContract to number in getMaxAnchors", async () => {
    const max = await client.getMaxAnchors();
    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(max).toBe(16);
  });
});
