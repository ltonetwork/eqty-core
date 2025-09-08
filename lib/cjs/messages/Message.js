"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Binary_1 = __importDefault(require("../Binary"));
const utils_1 = require("@noble/hashes/utils");
const constants_1 = require("../constants");
class Message {
    constructor(data, mediaType, meta = {}) {
        /** Extra info and details about the message */
        this.meta = { type: "basic", title: "", description: "" };
        if (typeof meta === "string")
            meta = { type: meta }; // Backwards compatibility
        this.version =
            meta.title || meta.description || meta.thumbnail
                ? constants_1.MESSAGE_V2
                : constants_1.MESSAGE_V1;
        this.meta = { ...this.meta, ...meta };
        if (typeof data === "string") {
            this.mediaType = mediaType ?? "text/plain";
            this.data = new Binary_1.default(data);
        }
        else if (data instanceof Uint8Array) {
            this.mediaType = mediaType ?? "application/octet-stream";
            this.data = data instanceof Binary_1.default ? data : new Binary_1.default(data);
        }
        else {
            if (mediaType && mediaType !== "application/json")
                throw new Error(`Unable to encode data as ${mediaType}`);
            this.mediaType = mediaType ?? "application/json";
            this.data = new Binary_1.default(JSON.stringify(data));
        }
    }
    get type() {
        return this.meta.type; // Backwards compatibility
    }
    get hash() {
        return this._hash ?? new Binary_1.default(this.toBinary(false)).hash();
    }
    get encryptedData() {
        if (!this._encryptedData)
            throw new Error("Message is not encrypted");
        return this._encryptedData;
    }
    to(recipient) {
        if (this.signature)
            throw new Error("Message is already signed");
        this.recipient = recipient;
        return this;
    }
    encryptFor(recipientAddress) {
        if (this.signature)
            throw new Error("Message is already signed");
        this.recipient = recipientAddress;
        // For now, implement a simplified encryption approach
        // In a full implementation, you would use proper ECIES encryption
        // This is a placeholder that demonstrates the pattern
        const messageData = this.data;
        const recipientHash = new Binary_1.default(recipientAddress).hash();
        const encrypted = (0, utils_1.concatBytes)(messageData, recipientHash);
        this._encryptedData = new Binary_1.default(encrypted);
        return this;
    }
    decryptWith(_signer) {
        if (!this._encryptedData)
            throw new Error("Message is not encrypted");
        // Simplified decryption - in production use proper ECIES
        const encryptedData = this._encryptedData;
        const dataLength = encryptedData.length - constants_1.HASH_LENGTH; // Remove recipient hash
        this.data = new Binary_1.default(encryptedData.slice(0, dataLength));
        this._encryptedData = undefined;
        return this;
    }
    isEncrypted() {
        return !!this._encryptedData;
    }
    async signWith(sender) {
        try {
            if (this.signature)
                throw new Error("Message is already signed");
            this.sender = await sender.getAddress();
            this.timestamp = Date.now();
            const signature = await sender.sign(this.toBinary(false));
            this.signature = new Binary_1.default(signature);
            return this;
        }
        catch (error) {
            throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    isSigned() {
        return !!this.signature;
    }
    verifySignature() {
        if (!this.signature || !this.sender)
            return false;
        try {
            // Recover signer from signature using ethers.js
            const messageHash = (0, ethers_1.keccak256)(this.toBinary(false));
            const signatureHex = constants_1.HEX_PREFIX + this.signature.hex;
            const recoveredAddress = (0, ethers_1.recoverAddress)(messageHash, signatureHex);
            return recoveredAddress.toLowerCase() === this.sender.toLowerCase();
        }
        catch (error) {
            console.error("Message signature verification failed:", error);
            return false;
        }
    }
    verifyHash() {
        try {
            const computedHash = new Binary_1.default(this.toBinary(false)).hash();
            return this.hash.toString() === computedHash.toString();
        }
        catch (error) {
            console.error("Message hash verification failed:", error);
            return false;
        }
    }
    toBinaryV1(withSignature = true) {
        const parts = [
            Binary_1.default.fromInt32(this.version),
            Binary_1.default.from(this.mediaType),
            this.data,
        ];
        if (this.timestamp) {
            parts.push(Binary_1.default.fromInt32(this.timestamp));
        }
        if (this.sender) {
            parts.push(Binary_1.default.from(this.sender));
        }
        if (this.recipient) {
            parts.push(Binary_1.default.from(this.recipient));
        }
        if (withSignature && this.signature) {
            parts.push(this.signature);
        }
        return Binary_1.default.concat(...parts);
    }
    toBinaryV2(withSignature = true) {
        const parts = [
            Binary_1.default.fromInt32(this.version),
            Binary_1.default.from(JSON.stringify(this.meta)),
            Binary_1.default.from(this.mediaType),
            this.data,
        ];
        if (this.timestamp) {
            parts.push(Binary_1.default.fromInt32(this.timestamp));
        }
        if (this.sender) {
            parts.push(Binary_1.default.from(this.sender));
        }
        if (this.recipient) {
            parts.push(Binary_1.default.from(this.recipient));
        }
        if (withSignature && this.signature) {
            parts.push(this.signature);
        }
        return Binary_1.default.concat(...parts);
    }
    toBinary(withSignature = true) {
        switch (this.version) {
            case constants_1.MESSAGE_V1:
                return this.toBinaryV1(withSignature);
            case constants_1.MESSAGE_V2:
                return this.toBinaryV2(withSignature);
            default:
                throw new Error(`Message version ${this.version} not supported`);
        }
    }
    toJSON() {
        return {
            version: this.version,
            meta: this.meta,
            mediaType: this.mediaType,
            data: this.data.base58,
            timestamp: this.timestamp,
            sender: this.sender,
            signature: this.signature?.base58,
            recipient: this.recipient,
            hash: this.hash.base58,
            encryptedData: this._encryptedData?.base58,
        };
    }
    static from(data) {
        if (data instanceof Uint8Array) {
            return Message.fromBinary(data);
        }
        return Message.fromJSON(data);
    }
    static fromJSON(json) {
        try {
            const message = new Message(Binary_1.default.fromBase58(json.data), json.mediaType, json.meta);
            message.version = json.version;
            message.timestamp = json.timestamp;
            message.sender = json.sender;
            message.signature = json.signature
                ? Binary_1.default.fromBase58(json.signature)
                : undefined;
            message.recipient = json.recipient;
            message._hash = json.hash ? Binary_1.default.fromBase58(json.hash) : undefined;
            message._encryptedData = json.encryptedData
                ? Binary_1.default.fromBase58(json.encryptedData)
                : undefined;
            return message;
        }
        catch (error) {
            throw new Error(`Failed to create message from JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    static fromBinary(data) {
        try {
            const message = new Message("", "text/plain");
            let offset = 0;
            // Parse version
            message.version = data[offset++];
            // Parse meta type
            const typeLength = data[offset++];
            const typeBytes = data.slice(offset, offset + typeLength);
            message.meta.type = new TextDecoder().decode(typeBytes);
            offset += typeLength;
            if (message.version === constants_1.MESSAGE_V2) {
                // Parse title
                const titleLength = data[offset++];
                const titleBytes = data.slice(offset, offset + titleLength);
                message.meta.title = new TextDecoder().decode(titleBytes);
                offset += titleLength;
                // Parse description (2 bytes for length)
                const descLength = (data[offset] << 8) | data[offset + 1];
                offset += 2;
                const descBytes = data.slice(offset, offset + descLength);
                message.meta.description = new TextDecoder().decode(descBytes);
                offset += descLength;
            }
            // Parse media type
            const mediaTypeLength = (data[offset] << 8) | data[offset + 1];
            offset += 2;
            const mediaTypeBytes = data.slice(offset, offset + mediaTypeLength);
            message.mediaType = new TextDecoder().decode(mediaTypeBytes);
            offset += mediaTypeLength;
            // Parse data
            const dataLength = (data[offset] << 24) |
                (data[offset + 1] << 16) |
                (data[offset + 2] << 8) |
                data[offset + 3];
            offset += 4;
            message.data = new Binary_1.default(data.slice(offset, offset + dataLength));
            offset += dataLength;
            // Parse timestamp
            const timestampBytes = data.slice(offset, offset + 8);
            message.timestamp = Number(new DataView(timestampBytes.buffer, timestampBytes.byteOffset, 8).getBigUint64(0, false));
            offset += 8;
            // Parse sender address
            const senderLength = data[offset++];
            const senderBytes = data.slice(offset, offset + senderLength);
            message.sender = new TextDecoder().decode(senderBytes);
            offset += senderLength;
            // Parse recipient address
            const recipientLength = data[offset++];
            const recipientBytes = data.slice(offset, offset + recipientLength);
            message.recipient = new TextDecoder().decode(recipientBytes);
            offset += recipientLength;
            // Parse signature if present
            if (offset < data.length) {
                const signatureLength = data[offset++];
                const signatureBytes = data.slice(offset, offset + signatureLength);
                message.signature = new Binary_1.default(signatureBytes);
            }
            return message;
        }
        catch (error) {
            throw new Error(`Failed to create message from binary: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
exports.default = Message;
//# sourceMappingURL=Message.js.map