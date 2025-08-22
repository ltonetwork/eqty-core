import { expect } from "chai";
import { ethers } from "ethers";
import Event from "../src/events/Event";
import { EthersSigner } from "../src/signer";
import Binary from "../src/Binary";

describe("Event", () => {
  let provider: ethers.BrowserProvider;
  let signer: ethers.Signer;
  let eqtySigner: EthersSigner;

  before(async () => {
    // Create a mock provider and signer for testing
    provider = new ethers.JsonRpcProvider("http://localhost:8545") as any;
    const wallet = ethers.Wallet.createRandom();
    signer = wallet.connect(provider);
    eqtySigner = new EthersSigner(signer);
  });

  describe("Event Creation", () => {
    it("should create an event with JSON data", () => {
      const data = { action: "test", timestamp: Date.now() };
      const event = new Event(data, "application/json");

      expect(event.mediaType).to.equal("application/json");
      expect(event.parsedData).to.deep.equal(data);
    });

    it("should create an event with string data", () => {
      const data = "Hello World";
      const event = new Event(data, "text/plain");

      expect(event.mediaType).to.equal("text/plain");
      expect(event.data.toString()).to.equal(data);
    });

    it("should create an event with binary data", () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const event = new Event(data, "application/octet-stream");

      expect(event.mediaType).to.equal("application/octet-stream");
      expect(event.data).to.deep.equal(data);
    });
  });

  describe("Event Signing", () => {
    it("should sign an event successfully", async () => {
      const data = { action: "test", timestamp: Date.now() };
      const event = new Event(data, "application/json");

      // Set previous hash to make it part of a chain
      event.previous = new Binary(new Uint8Array(32));
      event.signerAddress = await eqtySigner.getAddress();

      await event.signWith(eqtySigner);

      expect(event.isSigned()).to.be.true;
      expect(event.signature).to.not.be.undefined;
      expect(event.timestamp).to.not.be.undefined;
    });

    it("should verify signature correctly", async () => {
      const data = { action: "test", timestamp: Date.now() };
      const event = new Event(data, "application/json");

      // Set previous hash to make it part of a chain
      event.previous = new Binary(new Uint8Array(32));
      event.signerAddress = await eqtySigner.getAddress();

      await event.signWith(eqtySigner);

      expect(event.verifySignature()).to.be.true;
    });

    it("should fail verification with wrong signer", async () => {
      const data = { action: "test", timestamp: Date.now() };
      const event = new Event(data, "application/json");

      // Set previous hash to make it part of a chain
      event.previous = new Binary(new Uint8Array(32));
      event.signerAddress = await eqtySigner.getAddress();

      await event.signWith(eqtySigner);

      // Change the signer address to simulate wrong signer
      event.signerAddress = "0x1234567890123456789012345678901234567890";

      expect(event.verifySignature()).to.be.false;
    });
  });

  describe("Event Serialization", () => {
    it("should serialize and deserialize correctly", async () => {
      const data = { action: "test", timestamp: Date.now() };
      const event = new Event(data, "application/json");

      // Set previous hash to make it part of a chain
      event.previous = new Binary(new Uint8Array(32));
      event.signerAddress = await eqtySigner.getAddress();

      await event.signWith(eqtySigner);

      const json = event.toJSON();
      const deserializedEvent = Event.from(json);

      expect(deserializedEvent.mediaType).to.equal(event.mediaType);
      expect(deserializedEvent.parsedData).to.deep.equal(event.parsedData);
      expect(deserializedEvent.signature?.hex).to.equal(event.signature?.hex);
      expect(deserializedEvent.verifySignature()).to.be.true;
    });
  });

  describe("Error Handling", () => {
    it("should throw error when signing without previous hash", async () => {
      const data = { action: "test", timestamp: Date.now() };
      const event = new Event(data, "application/json");

      try {
        await event.signWith(eqtySigner);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include(
          "event is not part of an event chain"
        );
      }
    });

    it("should throw error when creating binary without signer address", () => {
      const data = { action: "test", timestamp: Date.now() };
      const event = new Event(data, "application/json");
      event.previous = new Binary(new Uint8Array(32));

      try {
        event.toBinary();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include("signer address not set");
      }
    });
  });
});
