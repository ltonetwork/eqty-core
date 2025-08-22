export interface IBinary {
  base58: string;
  base64: string;
  hex: string;
  dataView: DataView;
  hash(): Binary;
  hmac(key: string | Uint8Array): Binary;
  toString(): string;
  slice(start?: number, end?: number): Binary;
  reverse(): this;
  toReversed(): Binary;
}

export interface IBinaryConstructor {
  fromHex(value: string): Binary;
  fromBase58(value: string): Binary;
  fromBase64(value: string): Binary;
  fromMultibase(value: string): Binary;
  fromInt16(value: number): Binary;
  fromInt32(value: number): Binary;
  concat(...items: Array<ArrayLike<number>>): Binary;
}
