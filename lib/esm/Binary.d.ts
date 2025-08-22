import { IBinary } from "./types/binary";
export default class Binary extends Uint8Array implements IBinary {
    constructor(value?: string | ArrayLike<number> | number);
    get base58(): string;
    get base64(): string;
    get hex(): string;
    get dataView(): DataView;
    /** Create a keccak256 hash (Ethereum standard) */
    hash(): Binary;
    /** Create HMAC SHA256 hash */
    hmac(key: string | Uint8Array): Binary;
    toString(): string;
    slice(start?: number, end?: number): Binary;
    reverse(): this;
    toReversed(): Binary;
    static from(arrayLike: ArrayLike<number> | Iterable<number> | string): Binary;
    static from<T>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => number, thisArg?: any): Binary;
    static fromBase58(value: string): Binary;
    static fromBase64(value: string): Binary;
    static fromHex(value: string): Binary;
    static fromMultibase(value: string): Binary;
    static fromInt16(value: number): Binary;
    static fromInt32(value: number): Binary;
    static concat(...items: Array<ArrayLike<number>>): Binary;
}
//# sourceMappingURL=Binary.d.ts.map