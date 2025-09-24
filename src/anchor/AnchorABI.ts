/**
 * ABI for the Base anchor contract
 */
export const ANCHOR_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "key", type: "bytes32" },
          { name: "value", type: "bytes32" },
        ],
        name: "anchors",
        type: "tuple[]",
      },
    ],
    name: "anchor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "key", type: "bytes32" },
      { indexed: false, name: "value", type: "bytes32" },
      { indexed: true, name: "sender", type: "address" },
      { indexed: false, name: "timestamp", type: "uint64" },
    ],
    name: "Anchored",
    type: "event",
  },
] as const;
