/**
 * Contract addresses and configuration for Base blockchain
 */
export declare const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
export declare const EVENT_CHAIN_V1 = 0;
export declare const EVENT_CHAIN_V2 = 1;
export declare const MESSAGE_V1 = 0;
export declare const MESSAGE_V2 = 1;
export declare const HEX_PREFIX = "0x";
export declare const HEX_PREFIX_LENGTH = 2;
export declare const BYTES_PER_HEX_CHAR = 2;
export declare const HASH_LENGTH = 32;
export declare const ADDRESS_LENGTH = 20;
export declare const BASE_SEPOLIA: {
    readonly CHAIN_ID: 84532;
    readonly RPC_URL: "https://sepolia.base.org";
    readonly EXPLORER_URL: "https://sepolia.basescan.org";
    readonly ANCHOR_CONTRACT: "0x7607af0cea78815c71bbea90110b2c218879354b";
    readonly EQTY_TOKEN: "0x0000000000000000000000000000000000000000";
    readonly ANCHOR_FEE: 0n;
    readonly MAX_ANCHORS_PER_TX: 100;
};
export declare const BASE_MAINNET: {
    readonly CHAIN_ID: 8453;
    readonly RPC_URL: "https://mainnet.base.org";
    readonly EXPLORER_URL: "https://basescan.org";
    readonly ANCHOR_CONTRACT: "0x0000000000000000000000000000000000000000";
    readonly EQTY_TOKEN: "0x0000000000000000000000000000000000000000";
    readonly ANCHOR_FEE: 0n;
    readonly MAX_ANCHORS_PER_TX: 100;
};
export declare const DEFAULT_CONFIG: {
    readonly ANCHOR_FEE: 0n;
    readonly MAX_ANCHORS_PER_TX: 100;
    readonly GAS_LIMIT: 500000n;
    readonly DEFAULT_MESSAGE_LIMIT: 50;
    readonly DEFAULT_MESSAGE_OFFSET: 0;
};
export declare const NETWORKS: {
    readonly "base-sepolia": {
        readonly CHAIN_ID: 84532;
        readonly RPC_URL: "https://sepolia.base.org";
        readonly EXPLORER_URL: "https://sepolia.basescan.org";
        readonly ANCHOR_CONTRACT: "0x7607af0cea78815c71bbea90110b2c218879354b";
        readonly EQTY_TOKEN: "0x0000000000000000000000000000000000000000";
        readonly ANCHOR_FEE: 0n;
        readonly MAX_ANCHORS_PER_TX: 100;
    };
    readonly "base-mainnet": {
        readonly CHAIN_ID: 8453;
        readonly RPC_URL: "https://mainnet.base.org";
        readonly EXPLORER_URL: "https://basescan.org";
        readonly ANCHOR_CONTRACT: "0x0000000000000000000000000000000000000000";
        readonly EQTY_TOKEN: "0x0000000000000000000000000000000000000000";
        readonly ANCHOR_FEE: 0n;
        readonly MAX_ANCHORS_PER_TX: 100;
    };
};
export type NetworkName = keyof typeof NETWORKS;
//# sourceMappingURL=contracts.d.ts.map