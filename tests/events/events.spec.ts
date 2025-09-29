import { expect } from "chai";
import { describe, it } from "mocha";
import { Wallet, verifyTypedData as ethersVerifyTypedData } from "ethers";
import { privateKeyToAccount } from "viem/accounts";
import { verifyTypedData as viemVerifyTypedData } from "viem";

import { Event } from "../../src/events";
import EventChain from "../../src/events/EventChain";
import MergeConflict from "../../src/events/MergeConflict";
import Binary from "../../src/Binary";
import ViemSigner from "../../src/viem/ViemSigner";
import { VerifyFn } from "../../src/types";

const PRIVATE_KEY = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NETWORK_ID = 1337;
const CHAIN_NONCE = "deterministic-nonce";
const BASE_TIMESTAMP = 1_700_000_000;

const previousHash = Binary.fromHex(`0x${"11".repeat(32)}`);

function normalizeTypedValue(value: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key,
      val instanceof Uint8Array
        ? Binary.from(val).hex
        : val instanceof Binary
        ? val.hex
        : val,
    ]),
  );
}

const createEthersVerifyFn = (): VerifyFn => async (
  address,
  domain,
  types,
  value,
  signature,
) => {
  const normalizedSignature =
    signature.length > 132 ? Binary.fromHex(signature).toString() : signature;
  const normalizedValue = normalizeTypedValue(value);
  const recovered = ethersVerifyTypedData(domain, types as any, normalizedValue, normalizedSignature);
  return recovered.toLowerCase() === address.toLowerCase();
};

const createViemVerifyFn = (): VerifyFn => async (
  address,
  domain,
  types,
  value,
  signature,
) =>
  viemVerifyTypedData({
    address: address as `0x${string}`,
    domain,
    types: types as any,
    primaryType: Object.keys(types)[0],
    message: normalizeTypedValue(value),
    signature: (
      signature.length > 132 ? Binary.fromHex(signature).toString() : signature
    ) as `0x${string}`,
  });

async function createChainFixture(length = 3) {
  const wallet = new Wallet(PRIVATE_KEY);
  const chain = EventChain.create(wallet.address, NETWORK_ID, CHAIN_NONCE);
  const events: Event[] = [];

  for (let i = 0; i < length; i += 1) {
    const event = new Event({ index: i });
    event.networkId = chain.networkId;
    event.previous = chain.latestHash;
    event.timestamp = BASE_TIMESTAMP + i;
    await event.signWith(wallet);
    chain.add(event);
    events.push(event);
  }

  return { chain, events, wallet };
}

describe("Event", () => {
  it("constructs with string, binary, and JSON payloads", () => {
    const stringEvent = new Event("hello world");
    expect(stringEvent.mediaType).to.equal("text/plain");
    expect(stringEvent.data.toString()).to.equal("hello world");

    const bytes = new Uint8Array([1, 2, 3]);
    const binaryEvent = new Event(bytes);
    expect(binaryEvent.mediaType).to.equal("application/octet-stream");
    expect(binaryEvent.data).to.be.instanceOf(Binary);
    expect(Array.from(binaryEvent.data)).to.deep.equal(Array.from(bytes));

    const payload = { foo: "bar", nested: [1, 2] };
    const jsonEvent = new Event(payload);
    expect(jsonEvent.mediaType).to.equal("application/json");
    expect(jsonEvent.data.toString()).to.equal(JSON.stringify(payload));
  });

  it("handles attachments and parsed data", () => {
    const event = new Event("root");
    event.addAttachment("metadata", { source: "test" });
    event.addAttachment("raw", new Uint8Array([9, 8, 7]), "application/custom");

    expect(event.attachments).to.have.length(2);
    expect(event.attachments[0].mediaType).to.equal("application/json");
    expect(event.attachments[0].data.toString()).to.equal(JSON.stringify({ source: "test" }));
    expect(event.attachments[1].mediaType).to.equal("application/custom");
    expect(Array.from(event.attachments[1].data)).to.deep.equal([9, 8, 7]);

    const jsonEvent = new Event({ key: "value" });
    expect(jsonEvent.parsedData).to.deep.equal({ key: "value" });

    const invalidJsonEvent = new Event("not-json", "application/json");
    expect(invalidJsonEvent.parsedData).to.equal("not-json");
  });

  it("throws descriptive errors when toBinary prerequisites are missing", () => {
    const missingSigner = new Event("payload");
    missingSigner.previous = previousHash;
    expect(() => missingSigner.toBinary()).to.throw("signer address not set");

    const missingPrevious = new Event("payload");
    missingPrevious.signerAddress = `0x${"22".repeat(20)}`;
    expect(() => missingPrevious.toBinary()).to.throw("event is not part of an event chain");

    const missingData = new Event("payload");
    missingData.signerAddress = `0x${"22".repeat(20)}`;
    missingData.previous = previousHash;
    (missingData as any).data = undefined;
    expect(() => missingData.toBinary()).to.throw("data unknown");
  });
});

describe("Event signing", () => {
  it("signs events with ethers and verifies signature and hash", async () => {
    const wallet = new Wallet(PRIVATE_KEY);
    const ethersVerify = createEthersVerifyFn();
    const event = new Event({ index: 0 });
    event.networkId = NETWORK_ID;
    event.previous = previousHash;
    event.timestamp = BASE_TIMESTAMP;

    await event.signWith(wallet);
    expect(event.signature).to.not.be.undefined;
    expect(event.signerAddress?.toLowerCase()).to.equal(wallet.address.toLowerCase());

    const { domain, types, value } = (event as any).getSignData();
    const recovered = ethersVerifyTypedData(
      domain,
      types as any,
      normalizeTypedValue(value),
      event.signature?.toString() as string,
    );
    expect(recovered.toLowerCase()).to.equal(wallet.address.toLowerCase());

    expect(await event.verifySignature(ethersVerify)).to.be.true;

    const originalSignature = event.signature;
    event.signature = Binary.fromHex(`0x${"00".repeat(65)}`);
    expect(await event.verifySignature(ethersVerify)).to.be.false;
    event.signature = originalSignature;

    expect(event.verifyHash()).to.be.true;
    Object.assign(event, { _hash: Binary.fromHex(`0x${"01".repeat(32)}`) });
    expect(event.verifyHash()).to.be.false;
  });

  it("uses a ViemSigner for parity with ethers", async () => {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const ethersVerify = createEthersVerifyFn();
    const viemVerify = createViemVerifyFn();
    const viemClient = {
      account,
      async signTypedData(args: any) {
        const message = {
          ...args.message,
          previous:
            args.message.previous instanceof Binary
              ? args.message.previous.hex
              : args.message.previous,
          dataHash:
            args.message.dataHash instanceof Binary
              ? args.message.dataHash.hex
              : args.message.dataHash,
        };
        return account.signTypedData({ ...args, message } as any);
      },
      async writeContract() {
        return "0x0" as `0x${string}`;
      },
    };

    const signer = new ViemSigner<typeof account>(viemClient);
    const event = new Event({ index: 1 });
    event.networkId = NETWORK_ID;
    event.previous = previousHash;
    event.timestamp = BASE_TIMESTAMP + 1;

    await event.signWith(signer);

    expect(event.signerAddress?.toLowerCase()).to.equal(account.address.toLowerCase());

    const { domain, types, value } = (event as any).getSignData();
    const message = normalizeTypedValue(value);

    const recovered = ethersVerifyTypedData(
      domain,
      types as any,
      message,
      event.signature?.toString() as string,
    );
    expect(recovered.toLowerCase()).to.equal(account.address.toLowerCase());

    const viemVerified = await viemVerifyTypedData({
      address: account.address,
      domain,
      types: types as any,
      primaryType: Object.keys(types)[0],
      message,
      signature: event.signature?.toString() as `0x${string}`,
    });
    expect(viemVerified).to.be.true;

    expect(await event.verifySignature(ethersVerify)).to.be.true;
    expect(await event.verifySignature(viemVerify)).to.be.true;
  });
});

describe("EventChain", () => {
  it("builds deterministic state and latest hash", async () => {
    const { chain, events } = await createChainFixture(3);

    expect(chain.events).to.have.length(3);
    expect(chain.latestHash.hex).to.equal(events[2].hash.hex);

    let expectedState = Binary.fromHex(chain.id).reverse().hash();
    for (const event of chain.events) {
      expectedState = Binary.concat(expectedState, event.hash).hash();
    }

    expect(chain.state.hex).to.equal(expectedState.hex);
  });

  it("creates partial chains and exposes anchor maps", async () => {
    const { chain, events, wallet } = await createChainFixture(3);

    const partial = chain.startingAfter(events[0]);
    expect(partial).to.not.equal(chain);
    expect(partial.isPartial()).to.be.true;
    expect(partial.events[0].hash.hex).to.equal(events[1].hash.hex);

    const anchors = chain.anchorMap;
    expect(anchors).to.have.length(events.length);

    let state = Binary.fromHex(chain.id).reverse().hash();
    anchors.forEach((anchor, index) => {
      expect(anchor.key.hex).to.equal(state.hex);
      expect(anchor.value.hex).to.equal(chain.events[index].hash.hex);
      expect(anchor.signer.toLowerCase()).to.equal(wallet.address.toLowerCase());
      state = Binary.concat(state, chain.events[index].hash).hash();
    });
  });

  it("identifies the creator and round-trips through JSON", async () => {
    const { chain, wallet } = await createChainFixture(2);

    expect(chain.isCreatedBy(wallet.address, chain.networkId)).to.be.true;
    expect(chain.isCreatedBy(wallet.address, chain.networkId + 1)).to.be.false;

    const json = chain.toJSON();
    const hydrated = EventChain.from(json);

    expect(hydrated.id).to.equal(chain.id);
    expect(hydrated.events.map((event) => event.hash.hex)).to.deep.equal(
      chain.events.map((event) => event.hash.hex),
    );
  });

  it("merges partial chains and appends new events", async () => {
    const { chain, events, wallet } = await createChainFixture(2);

    const partial = chain.startingAfter(events[events.length - 1]);
    expect(partial.isPartial()).to.be.true;

    const newEvent = new Event({ index: 99 });
    newEvent.networkId = chain.networkId;
    newEvent.previous = partial.latestHash;
    newEvent.timestamp = BASE_TIMESTAMP + 2;
    await newEvent.signWith(wallet);
    partial.add(newEvent);

    chain.add(partial);

    expect(chain.events).to.have.length(3);
    expect(chain.events[2].hash.hex).to.equal(newEvent.hash.hex);
  });

  it("throws a MergeConflict when chains diverge", async () => {
    const { chain, wallet } = await createChainFixture(2);

    const diverging = EventChain.from(chain.toJSON());
    const conflictEvent = new Event({ index: 42 });
    conflictEvent.networkId = diverging.networkId;
    conflictEvent.previous = diverging.events[0].hash;
    conflictEvent.timestamp = BASE_TIMESTAMP + 1;
    await conflictEvent.signWith(wallet);

    diverging.events[1] = conflictEvent;
    expect(diverging.events[1].hash.hex).to.not.equal(chain.events[1].hash.hex);

    expect(() => chain.add(diverging)).to.throw(MergeConflict);
  });

  it("validates with ethers and viem verifiers and surfaces signature errors", async () => {
    const { chain } = await createChainFixture(2);

    const ethersVerify = createEthersVerifyFn();
    const viemVerify = createViemVerifyFn();

    const ethersValidated = EventChain.from(chain.toJSON()).withVerification(ethersVerify);
    await ethersValidated.validate();

    const viemValidated = EventChain.from(chain.toJSON()).withVerification(viemVerify);
    await viemValidated.validate();

    const tampered = EventChain.from(chain.toJSON()).withVerification(ethersVerify);
    tampered.events[0].signature = Binary.fromHex(`0x${"00".repeat(65)}`);

    try {
      await tampered.validate();
      expect.fail("Expected validation to fail for tampered signature");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include("Invalid signature of event");
    }

    const viemTampered = EventChain.from(chain.toJSON()).withVerification(viemVerify);
    viemTampered.events[0].signature = Binary.fromHex(`0x${"00".repeat(65)}`);

    try {
      await viemTampered.validate();
      expect.fail("Expected viem verification to fail for tampered signature");
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include("Invalid signature of event");
    }
  });
});
