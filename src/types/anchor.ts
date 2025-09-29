export interface AnchorContract {
  anchor<T = any>(anchors: { key: string; value: string }[]): Promise<T>;
  maxAnchors(): Promise<bigint>;
}
