import { IBinary } from "./binary";

export interface IAnchorContract {
  anchor(key: string, value: string): Promise<any>;
}

export interface AnchorResult {
  success: boolean;
  transactionHash?: string;
  receipt?: any;
  error?: string;
  gasUsed?: bigint;
  blockNumber?: number;
}

export interface IAnchorPair {
  key: IBinary;
  value: IBinary;
}

export interface IAnchorBatch {
  anchors: IAnchorPair[];
}

export interface IAnchorEvent {
  key: string;
  value: string;
  sender: string;
  timestamp: number;
}
