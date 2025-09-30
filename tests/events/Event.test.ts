import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Wallet, verifyTypedData } from "ethers";
import { Account, createWalletClient, http, WalletClient, verifyTypedData as viemVerifyTypedData } from "viem";
import Event from "../../src/events/Event";
import EventChain, { EVENT_CHAIN_V3 } from "../../src/events/EventChain";
import Binary from "../../src/Binary";
import { ViemSigner } from "../../src/viem";
import { privateKeyToAccount } from "viem/accounts"
import { mainnet } from "viem/chains"

const PRIVATE_KEY_A = `0x${"11".repeat(32)}`;

const createWallet = (key: string) => new Wallet(key);
const toAddress = (wallet: Wallet) => wallet.address.toLowerCase() as `0x${string}`;

const createVerifyWithEthers = () =>
  async (address: string, domain: any, types: any, value: any, signature: string) =>
    verifyTypedData(domain, types, normalizeMessage(value), signature).toLowerCase() ===
    address.toLowerCase();

const normalizeMessage = (value: any) => ({
  ...value,
  previous: value.previous instanceof Binary ? (value.previous as Binary).hex : value.previous,
  dataHash: value.dataHash instanceof Binary ? (value.dataHash as Binary).hex : value.dataHash,
});

describe("Event", () => {
  it("encodes string, json, and binary data with proper defaults", () => {
    const stringEvent = new Event("hello");
    expect(stringEvent.mediaType).toBe("text/plain");
    expect(stringEvent.data.toString()).toBe("hello");

    const binaryData = new Uint8Array([1, 2, 3]);
    const binaryEvent = new Event(binaryData, "application/octet-stream");
    expect(binaryEvent.mediaType).toBe("application/octet-stream");
    expect(binaryEvent.data).toBeInstanceOf(Binary);

    const jsonEvent = new Event({ foo: "bar" });
    expect(jsonEvent.mediaType).toBe("application/json");
    expect(jsonEvent.parsedData).toEqual({ foo: "bar" });
  });

  it("throws when encoding json with non-json media type", () => {
    expect(() => new Event({ foo: "bar" }, "text/plain")).toThrow(
      "Unable to encode data as text/plain",
    );
  });

  it("supports attachments", () => {
    const event = new Event("base");
    event.addAttachment("file.txt", "content");

    expect(event.attachments).toHaveLength(1);
    expect(event.attachments[0]).toMatchObject({
      name: "file.txt",
      mediaType: "text/plain",
    });
  });

  it("enforces signing requirements before binary conversion", () => {
    const previous = Binary.fromHex(`0x${"00".repeat(32)}`);
    const event = new Event("data");

    Reflect.set(event, "data", undefined);
    event.previous = previous;
    event.signerAddress = createWallet(PRIVATE_KEY_A).address;
    expect(() => event.toBinary()).toThrow(
      "Event cannot be converted to binary: data unknown",
    );

    const eventWithoutSigner = new Event("data");
    eventWithoutSigner.previous = previous;
    expect(() => eventWithoutSigner.toBinary()).toThrow(
      "Event cannot be converted to binary: signer address not set",
    );

    const eventWithoutPrevious = new Event("data");
    eventWithoutPrevious.signerAddress = createWallet(PRIVATE_KEY_A).address;
    expect(() => eventWithoutPrevious.toBinary()).toThrow(
      "Event cannot be converted to binary: event is not part of an event chain",
    );
  });

  it("throws when media type exceeds uint16 during binary conversion", () => {
    const event = new Event("payload");
    event.previous = Binary.fromHex(`0x${"00".repeat(32)}`);
    event.signerAddress = createWallet(PRIVATE_KEY_A).address;
    event.timestamp = Date.now();
    Reflect.set(event, "mediaType", "a".repeat(0xffff + 1));

    expect(() => event.toBinary()).toThrow("Media type too long: exceeds uint16");
  });

  it("requires chain context before signing", async () => {
    const event = new Event("payload");
    const wallet = createWallet(PRIVATE_KEY_A);

    await expect(event.signWith(wallet)).rejects.toThrow("previous is required");
  });

  it("signs with ethers wallet and validates signature", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const verify = createVerifyWithEthers();
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1337, "deterministic");
    const event = new Event({ hello: "world" }, "application/json").addTo(chain);

    await event.signWith(wallet);
    expect(event.isSigned()).toBe(true);
    expect(event.signature).toBeInstanceOf(Binary);
    expect(await event.verifySignature(verify)).toBe(true);
    expect(event.verifyHash()).toBe(true);
  });

  it("returns false for verification errors or missing data", async () => {
    const event = new Event("data");
    expect(await event.verifySignature(async () => true)).toBe(false);

    event.previous = Binary.fromHex(`0x${"00".repeat(32)}`);
    event.signerAddress = createWallet(PRIVATE_KEY_A).address;
    event.timestamp = Date.now();
    event.signature = new Binary(new Uint8Array(65));
    Reflect.set(event, "version", 0x99);

    expect(await event.verifySignature(() => {
      throw new Error("boom");
    })).toBe(false);
  });

  it("detects hash tampering", () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1337, "hash");
    const event = new Event("payload").addTo(chain);

    event.signerAddress = wallet.address;
    event.timestamp = Date.now();
    event.signature = new Binary(new Uint8Array(65));

    const computed = event.hash;
    expect(computed).toBeInstanceOf(Binary);

    Reflect.set(event, "_hash", new Binary(new Uint8Array(32).fill(9)));
    expect(event.verifyHash()).toBe(false);
  });

  it("adds to chain and exposes parsed data and JSON", () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1, "json");
    const event = new Event({ foo: "bar" }).addTo(chain);

    event.signerAddress = wallet.address;
    event.timestamp = Date.now();
    event.signature = new Binary(new Uint8Array(65));
    event.addAttachment("file.bin", new Uint8Array([9, 9]), "application/octet-stream");

    const json = event.toJSON();
    expect(json.mediaType).toBe("application/json");
    expect(json.attachments).toHaveLength(1);
    expect(event.parsedData).toEqual({ foo: "bar" });
  });

  it("round-trips through binary and json representations", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 999, "round");
    const event = new Event("content", "text/plain").addTo(chain);

    await event.signWith(wallet);

    const fromBinary = Event.from(event.toBinary());
    expect(fromBinary.signerAddress).toBe(wallet.address);
    expect(fromBinary.mediaType).toBe("text/plain");

    const json = event.toJSON();
    const fromJson = Event.from(json);
    expect(fromJson.signature?.hex).toBe(event.signature?.hex);
  });

  it("handles fromBinary error scenarios", () => {
    expect(() => Event.from(new Uint8Array(10))).toThrow(
      "Invalid event binary: too short",
    );

    const base = new Uint8Array(32 + 42 + 4 + 2 + 4);
    const view = new DataView(base.buffer);
    view.setUint16(32 + 42 + 4, 10, false);
    expect(() => Event.from(base)).toThrow(
      "Invalid event binary: mediaType out of bounds",
    );

    const withMedia = new Uint8Array(32 + 42 + 4 + 2 + 4 + 1);
    const view2 = new DataView(withMedia.buffer);
    view2.setUint16(32 + 42 + 4, 0, false);
    view2.setUint32(32 + 42 + 4 + 2, 10, false);
    expect(() => Event.from(withMedia)).toThrow(
      "Invalid event binary: data out of bounds",
    );
  });

  it("throws on invalid JSON input", () => {
    expect(() =>
      Event.from({
        version: EVENT_CHAIN_V3,
        mediaType: "text/plain",
        data: "not-base64",
        previous: undefined,
        timestamp: undefined,
        signerAddress: undefined,
        signature: undefined,
        hash: undefined,
        attachments: [],
      } as any),
    ).toThrow(/Failed to create event from JSON/);
  });

  describe("viem", () => {
    let walletClient: WalletClient;
    let account: Account;
    let signer: ViemSigner;

    beforeEach(() => {
      // Create real viem clients
      account = privateKeyToAccount(`0x${"11".repeat(32)}`);
      walletClient = createWalletClient({ chain: mainnet, transport: http("http://127.0.0.1:8545"), account });

      signer = new ViemSigner(walletClient);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("signs and verifies events with viem using ViemSigner", async () => {
      const creator = account.address as `0x${string}`;
      const chain = EventChain.create(creator, 1337, "viem-event");
      const event = new Event({ hello: "viem" }, "application/json").addTo(chain);

      await event.signWith(signer);

      expect(event.signerAddress?.toLowerCase()).toBe(account.address.toLowerCase());
      expect(event.isSigned()).toBe(true);

      const verified = await event.verifySignature(async (address, domain, types, value, signature) => {
        return await viemVerifyTypedData({
          address: address as `0x${string}`,
          domain: domain,
          types: types,
          primaryType: "Event",
          message: value,
          signature: signature as `0x${string}`,
        });
      });

      expect(verified).toBe(true);
    });
  })
});
