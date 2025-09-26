import { IBinary } from "./binary";

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

export interface IEventChainJSON extends Record<string, any> {
  id: string;
  events: Array<IEventJSON | { hash: string; state: string }>;
}

export interface IEventData {
  [key: string]: string | number | boolean | object | Array<any>;
}

export interface IEventAttachment {
  name: string;
  mediaType: string;
  data: IBinary;
}
