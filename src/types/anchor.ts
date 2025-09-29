export interface AnchorContract<T> {
  anchor: (anchors: { key: string; value: string }[]) => Promise<T>;
  maxAnchors: () => Promise<number>;
}
