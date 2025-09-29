export interface IBinary extends Uint8Array {
  base58: string;
  base64: string;
  hexRaw: string;
  hex: string;
  dataView: DataView;
  hash(): IBinary;
  toString(): string;
  slice(start?: number, end?: number): IBinary;
  reverse(): this;
  toReversed(): IBinary;
}

export interface IBinaryConstructor {
  fromHex(value: string): IBinary;
  fromBase58(value: string): IBinary;
  fromBase64(value: string): IBinary;
  fromMultibase(value: string): IBinary;
  fromInt16(value: number): IBinary;
  fromInt32(value: number): IBinary;
  concat(...items: Array<ArrayLike<number>>): IBinary;
}
