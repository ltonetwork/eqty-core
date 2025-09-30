export interface IBinary extends Uint8Array<ArrayBuffer> {
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
