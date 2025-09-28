export function compareBytes(array1: Uint8Array | Array<any>, array2: Uint8Array | Array<any>): boolean {
  return array1.length === array2.length && array1.every((c, i) => c === array2[i]);
}

export function isBinary(input: any): input is Uint8Array {
  return input instanceof Uint8Array;
}
