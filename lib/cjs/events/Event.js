"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Binary_1 = __importDefault(require("../Binary"));
const constants_1 = require("../constants");
class Event {
    constructor(data, mediaType, previous) {
        this.version = constants_1.EVENT_CHAIN_V2;
        /** Hash of attachments related to the event */
        this.attachments = [];
        this._setData(data, mediaType);
        if (previous)
            this.previous =
                typeof previous == "string"
                    ? Binary_1.default.fromBase58(previous)
                    : new Binary_1.default(previous);
    }
    addAttachment(name, data, mediaType) {
        const attachment = this._setData(data, mediaType, { name });
        this.attachments.push(attachment);
    }
    _setData(data, mediaType, target = this) {
        if (data instanceof Uint8Array) {
            target.mediaType = mediaType ?? "application/octet-stream";
            target.data = data instanceof Binary_1.default ? data : new Binary_1.default(data);
        }
        else if (typeof data === "string") {
            target.mediaType = mediaType ?? "text/plain";
            target.data = new Binary_1.default(data);
        }
        else {
            if (mediaType && mediaType !== "application/json")
                throw new Error(`Unable to encode data as ${mediaType}`);
            target.mediaType = mediaType ?? "application/json";
            target.data = new Binary_1.default(JSON.stringify(data));
        }
        return target;
    }
    get hash() {
        return this._hash ?? new Binary_1.default(this.toBinary()).hash();
    }
    toBinary() {
        if (typeof this.data == "undefined")
            throw new Error("Event cannot be converted to binary: data unknown");
        if (!this.signerAddress)
            throw new Error("Event cannot be converted to binary: signer address not set");
        if (!this.previous)
            throw new Error("Event cannot be converted to binary: event is not part of an event chain");
        switch (this.version) {
            case constants_1.EVENT_CHAIN_V1:
                return this.toBinaryV1();
            case constants_1.EVENT_CHAIN_V2:
                return this.toBinaryV2();
            default:
                throw new Error(`Event cannot be converted to binary: version ${this.version} not supported`);
        }
    }
    toBinaryV1() {
        return Binary_1.default.concat(this.previous, Binary_1.default.from(this.signerAddress), Binary_1.default.fromInt32(this.timestamp || 0), Binary_1.default.from(this.mediaType), this.data);
    }
    toBinaryV2() {
        return Binary_1.default.concat(this.previous, Binary_1.default.from(this.signerAddress), Binary_1.default.fromInt32(this.timestamp || 0), Binary_1.default.from(this.mediaType), this.data);
    }
    verifySignature() {
        if (!this.signature || !this.signerAddress)
            return false;
        try {
            // Recover signer from signature using ethers.js
            const binaryData = this.toBinary();
            const messageHash = (0, ethers_1.keccak256)(binaryData);
            const signatureHex = constants_1.HEX_PREFIX + this.signature.hex;
            const recoveredAddress = (0, ethers_1.recoverAddress)(messageHash, signatureHex);
            return (recoveredAddress.toLowerCase() === this.signerAddress.toLowerCase());
        }
        catch (error) {
            console.error("Signature verification failed:", error);
            return false;
        }
    }
    verifyHash() {
        try {
            const computedHash = new Binary_1.default(this.toBinary()).hash();
            return this.hash.toString() === computedHash.toString();
        }
        catch (error) {
            console.error("Hash verification failed:", error);
            return false;
        }
    }
    async signWith(signer) {
        try {
            if (!this.timestamp)
                this.timestamp = Date.now();
            if (!this.signerAddress)
                this.signerAddress = await signer.getAddress();
            const signature = await signer.sign(this.toBinary());
            this.signature = new Binary_1.default(signature);
            return this;
        }
        catch (error) {
            throw new Error(`Failed to sign event: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    addTo(chain) {
        chain.addEvent(this);
        return this;
    }
    isSigned() {
        return !!this.signature;
    }
    get parsedData() {
        if (this.mediaType === "application/json") {
            try {
                return JSON.parse(this.data.toString());
            }
            catch {
                return this.data.toString();
            }
        }
        return this.data.toString();
    }
    toJSON() {
        return {
            version: this.version,
            mediaType: this.mediaType,
            data: this.data.base58,
            timestamp: this.timestamp,
            previous: this.previous?.base58,
            signerAddress: this.signerAddress,
            signature: this.signature?.base58,
            hash: this.hash.base58,
            attachments: this.attachments.map((att) => ({
                name: att.name,
                mediaType: att.mediaType,
                data: att.data.base58,
            })),
        };
    }
    static from(data, version = 2) {
        try {
            const event = new Event(Binary_1.default.fromBase58(data.data), data.mediaType, data.previous);
            event.version = data.version ?? version;
            event.timestamp = data.timestamp;
            event.signerAddress = data.signerAddress;
            event.signature = data.signature
                ? Binary_1.default.fromBase58(data.signature)
                : undefined;
            event._hash = data.hash ? Binary_1.default.fromBase58(data.hash) : undefined;
            if (data.attachments) {
                data.attachments.forEach((att) => {
                    event.addAttachment(att.name, Binary_1.default.fromBase58(att.data), att.mediaType);
                });
            }
            return event;
        }
        catch (error) {
            throw new Error(`Failed to create event from JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
exports.default = Event;
//# sourceMappingURL=Event.js.map