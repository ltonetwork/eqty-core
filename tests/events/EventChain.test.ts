import { describe, it, expect } from "vitest";
import { Wallet, verifyTypedData } from "ethers";
import EventChain from "../../src/events/EventChain";
import Event from "../../src/events/Event";
import Binary from "../../src/Binary";
import MergeConflict from "../../src/events/MergeConflict";

const PRIVATE_KEY_A = `0x${"11".repeat(32)}`;
const PRIVATE_KEY_B = `0x${"22".repeat(32)}`;

const createWallet = (key: string) => new Wallet(key);
const normalizeValue = (value: any) => ({
  ...value,
  previous: value.previous instanceof Binary ? value.previous.hex : value.previous,
  dataHash: value.dataHash instanceof Binary ? value.dataHash.hex : value.dataHash,
});

const verifyWithEthers = () =>
  (address: string, domain: any, types: any, value: any, signature: string) =>
    verifyTypedData(domain, types, normalizeValue(value), signature).toLowerCase() ===
    address.toLowerCase();
const toAddress = (wallet: Wallet) => wallet.address.toLowerCase() as `0x${string}`;

const signEvent = async (chain: EventChain, wallet: Wallet, data: any) => {
  const event = new Event(data).addTo(chain);
  await event.signWith(wallet);
  return event;
};

describe("EventChain", () => {
  it("creates chains and derived identifiers", () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1337, "nonce");

    expect(chain.id.startsWith("0x")).toBe(true);
    expect(chain.version).toBe(0x42);
    expect(chain.networkId).toBe(1337);

    const derived = chain.createDerivedId("child");
    expect(chain.isDerivedId(derived)).toBe(true);
    expect(chain.isDerivedId(chain.id)).toBe(false);
    expect(chain.isCreatedBy(address, 1337)).toBe(true);
    expect(chain.isCreatedBy(toAddress(createWallet(PRIVATE_KEY_B)), 1337)).toBe(false);
  });

  it("adds events and preserves metadata", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1, "meta");
    const event = await signEvent(chain, wallet, { step: 1 });

    expect(event.previous?.hex).toBe(chain.toJSON().events[0]!.previous);
    expect(event.networkId).toBe(chain.networkId);
    expect(chain.has(event.hash)).toBe(true);
  });

  it("rejects adding events when last event is unsigned", () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1, "unsigned");
    const first = new Event("first").addTo(chain);

    expect(() => chain.add(new Event("second"))).toThrow(
      "Unable to add event: last event on chain is not signed",
    );

    first.signerAddress = wallet.address;
    first.timestamp = Date.now();
    first.signature = new Binary(new Uint8Array(65));
  });

  it("throws when an event does not fit", () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1, "fit");
    const event = new Event("bad");
    event.previous = Binary.fromHex(`0x${"ff".repeat(32)}`);

    expect(() => chain.add(event)).toThrow("Event doesn't fit onto the chain");
  });

  it("merges event chains and detects conflicts", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1, "merge");
    await signEvent(chain, wallet, { idx: 0 });
    await signEvent(chain, wallet, { idx: 1 });

    const clone = EventChain.from(chain.toJSON());
    await signEvent(clone, wallet, { idx: 2 });

    chain.add(clone);
    expect(chain.events).toHaveLength(3);

    const conflictA = EventChain.create(address, 1, "conflict");
    const conflictB = EventChain.create(address, 1, "conflict");
    await signEvent(conflictA, wallet, { c: "a" });
    const eventB = await signEvent(conflictB, wallet, { c: "b" });

    expect(() => conflictA.add(conflictB)).toThrow(MergeConflict);
    expect(eventB.previous?.hex).toBe(conflictB.events[0]?.previous?.hex);
  });

  it("handles partial chains when merging", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 10, "partial");
    await signEvent(chain, wallet, { idx: 0 });
    await signEvent(chain, wallet, { idx: 1 });

    const partial = chain.startingAfter(chain.events[0]!);
    await signEvent(partial, wallet, { idx: 2 });

    chain.add(partial);
    expect(chain.events).toHaveLength(3);
    expect(partial.isPartial()).toBe(true);

    const wrongPartial = new EventChain(chain.id);
    Reflect.set(wrongPartial, "partial", {
      hash: Binary.fromHex(`0x${"00".repeat(32)}`),
      state: Binary.fromHex(`0x${"11".repeat(32)}`),
    });
    wrongPartial.events = [...chain.events];

    expect(() => chain.add(wrongPartial)).toThrow(
      /Event .* not found/,
    );
  });

  it("computes hashes and states", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1, "state");

    expect(chain.latestHash.hex).toBe(Binary.fromHex(chain.id).hash().hex);

    const ev1 = await signEvent(chain, wallet, { index: 1 });
    const ev2 = await signEvent(chain, wallet, { index: 2 });

    expect(chain.latestHash.hex).toBe(ev2.hash.hex);

    const partial = chain.startingAfter(ev2);
    expect(partial.latestHash.hex).toBe(ev2.hash.hex);

    expect(chain.state).toBeInstanceOf(Binary);
    expect(() => {
      const unsignedChain = EventChain.create(address, 1, "unsigned-state");
      new Event("payload").addTo(unsignedChain);
      return unsignedChain.state;
    }).toThrow(
      "Unable to get state: last event on chain is not signed",
    );

    expect(() => (chain as any).stateAt(chain.events.length + 1)).toThrow(
      "Unable to get state: out of bounds",
    );
  });

  it("validates chains and reports detailed errors", async () => {
    const walletA = createWallet(PRIVATE_KEY_A);
    const walletB = createWallet(PRIVATE_KEY_B);
    const verify = verifyWithEthers();

    const addressA = toAddress(walletA);
    expect(addressA).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(addressA, 100, "validate");
    await signEvent(chain, walletA, { id: 0 });
    await signEvent(chain, walletA, { id: 1 });

    await expect(chain.validate(verify)).resolves.toBeUndefined();

    const empty = new EventChain(chain.id);
    await expect(empty.validate(verify)).rejects.toThrow("No events on event chain");

    const unsigned = EventChain.create(addressA, 100, "unsigned-validate");
    new Event("unsigned").addTo(unsigned);
    await expect(unsigned.validate(verify)).rejects.toThrow(/is not signed/);

    const invalidHashChain = EventChain.create(addressA, 100, "hash-invalid");
    const tampered = await signEvent(invalidHashChain, walletA, { bad: true });
    Reflect.set(tampered, "_hash", new Binary(new Uint8Array(32).fill(1)));
    await expect(invalidHashChain.validate(verify)).rejects.toThrow(
      /Invalid hash/,
    );

    const invalidSigChain = EventChain.create(addressA, 100, "sig-invalid");
    const ev = await signEvent(invalidSigChain, walletA, { ok: true });
    ev.signature = new Binary(new Uint8Array(65));
    await expect(invalidSigChain.validate(verify)).rejects.toThrow(
      /Invalid signature/,
    );

    const wrongPrevChain = EventChain.create(addressA, 100, "prev");
    const wrongPrev = new Event({ ok: false });
    wrongPrev.previous = Binary.fromHex(`0x${"00".repeat(32)}`);
    wrongPrev.networkId = wrongPrevChain.networkId;
    (wrongPrev as any).version = wrongPrevChain.version;
    await wrongPrev.signWith(walletA);
    wrongPrevChain.events = [wrongPrev];
    await expect(wrongPrevChain.validate(verify)).rejects.toThrow(
      /doesn't fit onto the chain/,
    );

    const genesisChain = EventChain.create(addressA, 100, "genesis");
    await signEvent(genesisChain, walletB, { ok: true });
    await expect(genesisChain.validate(verify)).rejects.toThrow(
      "Genesis event is not signed by chain creator",
    );
  });

  it("reports signature status and creates slices", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 777, "slice");
    const first = await signEvent(chain, wallet, { i: 0 });
    const second = await signEvent(chain, wallet, { i: 1 });

    expect(chain.isSigned()).toBe(true);

    const fromFirst = chain.startingWith(first.hash);
    expect(fromFirst.events).toHaveLength(2);

    const afterFirst = chain.startingAfter(first.hash);
    expect(afterFirst.events).toHaveLength(1);
    expect(afterFirst.isPartial()).toBe(true);

    expect(() => chain.startingWith(Binary.fromHex(`0x${"00".repeat(32)}`))).toThrow(
      /is not part of this event chain/,
    );
  });

  it("builds anchor maps and enforces signer presence", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 88, "anchor");
    const ev1 = await signEvent(chain, wallet, { a: 1 });
    const ev2 = await signEvent(chain, wallet, { a: 2 });

    const map = chain.anchorMap;
    expect(map).toHaveLength(2);
    expect(map[0]?.signer).toBe(wallet.address);
    expect(map[0]?.key).toBeInstanceOf(Binary);

    const preservedHash = ev1.hash;
    (ev1 as any)._hash = preservedHash;
    ev1.signerAddress = undefined;
    expect(() => chain.anchorMap).toThrow(/is not signed/);
  });

  it("serializes and deserializes chains", async () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 55, "serialize");
    await signEvent(chain, wallet, { s: 1 });
    await signEvent(chain, wallet, { s: 2 });

    const binary = chain.toBinary();
    const fromBinary = EventChain.from(binary);
    expect(fromBinary.events).toHaveLength(2);

    const json = chain.toJSON();
    const fromJson = EventChain.from(json);
    expect(fromJson.events).toHaveLength(2);

    const partial = chain.startingAfter(chain.events[0]!);
    const partialBinary = partial.toBinary();
    const partialFromBinary = EventChain.from(partialBinary);
    expect(partialFromBinary.isPartial()).toBe(true);
  });

  it("validates event chain binary input", () => {
    const wallet = createWallet(PRIVATE_KEY_A);
    const address = toAddress(wallet);
    expect(address).toMatch(/^0x[0-9a-f]+$/);
    const chain = EventChain.create(address, 1, "binary-errors");
    expect(() => EventChain.from(new Uint8Array(10))).toThrow(
      "Invalid event chain binary: too short",
    );

    const binary = chain.toBinary();
    const corruptedVersion = new Uint8Array(binary);
    corruptedVersion[0] = 0x01;
    expect(() => EventChain.from(corruptedVersion)).toThrow(
      /version 1 not supported/,
    );

    const corrupted = new Uint8Array(binary);
    const idLength = Binary.fromHex(chain.id).length;
    corrupted[1 + idLength] = 1; // set partial flag without providing header
    expect(() => EventChain.from(corrupted)).toThrow(
      'Invalid event chain binary: partial header out of bounds',
    );
  });

  it("covers helper utilities and validation logic", () => {
    const nonceFromString = (EventChain as any).createNonce("helper");
    expect(nonceFromString).toBeInstanceOf(Uint8Array);
    expect(nonceFromString).toHaveLength(20);

    const nonceFromBytes = (EventChain as any).createNonce(new Uint8Array(32).fill(1));
    expect(nonceFromBytes).toHaveLength(20);

    const buildId = (EventChain as any).buildId;
    expect(() => buildId(0x42, 1, new Uint8Array(10), new Uint8Array(19))).toThrow(
      "Random bytes should have a length of 20",
    );

    const validId = buildId(0x42, 1, new Uint8Array(50), new Uint8Array(20));
    expect(validId.startsWith("0x")).toBe(true);

    const validateId = (EventChain as any).validateId;
    expect(validateId(0x42, 1, validId, new Uint8Array(50))).toBe(true);
    expect(validateId(0x42, 2, validId, new Uint8Array(50))).toBe(false);
  });
});
