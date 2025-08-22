import { IBinary } from "./binary";
import { ISigner } from "./signer";

export interface IEventJSON {
  version: number;
  mediaType: string;
  data: string;
  timestamp?: number;
  previous?: string;
  signerAddress?: string;
  signature?: string;
  hash?: string;
  attachments?: Array<{ name: string; mediaType: string; data: string }>;
}

export interface IEventChainJSON {
  id: string;
  events: IEventJSON[];
  stateHash?: string;
}

export interface IEventData {
  [key: string]: string | number | boolean | object | Array<any>;
}

export interface IEventAttachment {
  name: string;
  mediaType: string;
  data: IBinary;
}

export interface IEventConstructor {
  data: IEventData | string | Uint8Array;
  mediaType?: string;
  previous?: string | Uint8Array;
}

export interface IEventSignable {
  signWith(signer: ISigner): Promise<this>;
  verifySignature(): boolean;
  verifyHash(): boolean;
  isSigned(): boolean;
}
