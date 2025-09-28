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
}

export interface IMessageData {
  [key: string]: string | number | boolean | object | Array<any>;
}

export interface IRelayMessage {
  message: IMessageJSON;
}

export interface IRelayResponse {
  message: IMessageJSON;
  messages?: IMessageJSON[];
}
