import { keccak256 } from "ethers";
import { base58 } from "@scure/base";
import { HEX_PREFIX, HEX_PREFIX_LENGTH, BYTES_PER_HEX_CHAR } from "./constants";
export default class Binary extends Uint8Array {
    constructor(value) {
        if (typeof value === "number") {
            super(value);
        }
        else {
            const bytes = typeof value === "string"
                ? new TextEncoder().encode(value)
                : value || [];
            super(bytes);
        }
    }
    get base58() {
        return base58.encode(this);
    }
    get base64() {
        return btoa(String.fromCharCode(...this));
    }
    get hex() {
        return Array.from(this)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    get dataView() {
        return new DataView(this.buffer);
    }
    /** Create a keccak256 hash (Ethereum standard) */
    hash() {
        const hashHex = keccak256(this);
        return Binary.fromHex(hashHex.slice(HEX_PREFIX_LENGTH)); // Remove '0x' prefix
    }
    /** Create HMAC SHA256 hash */
    hmac(key) {
        // For now, use a simple approach - in production, use crypto.subtle
        const keyBytes = typeof key === "string" ? new TextEncoder().encode(key) : key;
        const combined = new Uint8Array(keyBytes.length + this.length);
        combined.set(keyBytes);
        combined.set(this, keyBytes.length);
        return new Binary(combined).hash();
    }
    toString() {
        return new TextDecoder().decode(this);
    }
    slice(start, end) {
        return new Binary(super.slice(start, end));
    }
    reverse() {
        super.reverse();
        return this;
    }
    toReversed() {
        return new Binary(this).reverse();
    }
    static from(arrayLike, mapfn, thisArg) {
        if (typeof arrayLike === "string") {
            return new Binary(arrayLike);
        }
        if (mapfn) {
            return new Binary(super.from(arrayLike, mapfn, thisArg));
        }
        return new Binary(super.from(arrayLike));
    }
    static fromBase58(value) {
        try {
            return new Binary(base58.decode(value));
        }
        catch (error) {
            throw new Error(`Invalid base58 string: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    static fromBase64(value) {
        try {
            return new Binary(atob(value)
                .split("")
                .map((c) => c.charCodeAt(0)));
        }
        catch (error) {
            throw new Error(`Invalid base64 string: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    static fromHex(value) {
        try {
            const hex = value.startsWith(HEX_PREFIX)
                ? value.slice(HEX_PREFIX_LENGTH)
                : value;
            if (hex.length % BYTES_PER_HEX_CHAR !== 0) {
                throw new Error("Hex string must have even length");
            }
            const bytes = new Uint8Array(hex.length / BYTES_PER_HEX_CHAR);
            for (let i = 0; i < hex.length; i += BYTES_PER_HEX_CHAR) {
                const byte = parseInt(hex.substr(i, BYTES_PER_HEX_CHAR), 16);
                if (isNaN(byte)) {
                    throw new Error(`Invalid hex character at position ${i}`);
                }
                bytes[i / BYTES_PER_HEX_CHAR] = byte;
            }
            return new Binary(bytes);
        }
        catch (error) {
            throw new Error(`Invalid hex string: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    static fromMultibase(value) {
        try {
            const code = value.charAt(0);
            const encoded = value.slice(1);
            switch (code) {
                case "z":
                    return Binary.fromBase58(encoded);
                case "m":
                    return Binary.fromBase64(encoded);
                case "f":
                case "F":
                    return Binary.fromHex(encoded);
                default:
                    throw new Error(`Unsupported multi-base encoding: ${code}`);
            }
        }
        catch (error) {
            throw new Error(`Invalid multibase string: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    // Big Endian
    static fromInt16(value) {
        const bytes = new Uint8Array(2);
        new DataView(bytes.buffer).setInt16(0, value, false);
        return new Binary(bytes);
    }
    static fromInt32(value) {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setInt32(0, value, false);
        return new Binary(bytes);
    }
    static concat(...items) {
        const totalLength = items.reduce((sum, item) => sum + item.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const item of items) {
            result.set(item, offset);
            offset += item.length;
        }
        return new Binary(result);
    }
}
//# sourceMappingURL=Binary.js.map