import { ISigner } from "./signer";

export interface IMessageMeta {
  type: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export interface IMessageJSON {
  version: number;
  meta: IMessageMeta;
  mediaType: string;
  data: string;
  timestamp?: number;
  sender?: string;
  signature?: string;
  recipient?: string;
  hash?: string;
  encryptedData?: string;
}

export interface IMessageData {
  [key: string]: string | number | boolean | object | Array<any>;
}

export interface IMessageConstructor {
  data: IMessageData | string | Uint8Array;
  mediaType?: string;
  meta?: Partial<IMessageMeta> | string;
}

export interface IMessageSignable {
  signWith(signer: ISigner): Promise<this>;
  verifySignature(): boolean;
  verifyHash(): boolean;
  isSigned(): boolean;
  isEncrypted(): boolean;
}

export interface IRelayMessage {
  message: IMessageJSON;
}

export interface IRelayResponse {
  message: IMessageJSON;
  messages?: IMessageJSON[];
}
