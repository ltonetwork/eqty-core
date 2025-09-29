export interface AnchorContract<T = any> {
  anchor(anchors: { key: string; value: string }[]): Promise<T>;
  maxAnchors(): Promise<bigint>;
}
