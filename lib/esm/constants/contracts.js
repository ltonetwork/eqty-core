/**
 * Contract addresses and configuration for Base blockchain
 */
// Common constants
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
// Event and Message versions
export const EVENT_CHAIN_V1 = 0;
export const EVENT_CHAIN_V2 = 1;
export const MESSAGE_V1 = 0;
export const MESSAGE_V2 = 1;
// Binary and encoding constants
export const HEX_PREFIX = "0x";
export const HEX_PREFIX_LENGTH = 2;
export const BYTES_PER_HEX_CHAR = 2;
export const HASH_LENGTH = 32; // bytes
export const ADDRESS_LENGTH = 20; // bytes
// Base Sepolia Testnet
export const BASE_SEPOLIA = {
    CHAIN_ID: 84532,
    RPC_URL: "https://sepolia.base.org",
    EXPLORER_URL: "https://sepolia.basescan.org",
    // Contract addresses
    ANCHOR_CONTRACT: "0x7607af0cea78815c71bbea90110b2c218879354b",
    EQTY_TOKEN: ZERO_ADDRESS, // Not deployed on testnet yet
    // Current configuration (as deployed)
    ANCHOR_FEE: 0n, // No fee on testnet
    MAX_ANCHORS_PER_TX: 100,
};
// Base Mainnet
export const BASE_MAINNET = {
    CHAIN_ID: 8453,
    RPC_URL: "https://mainnet.base.org",
    EXPLORER_URL: "https://basescan.org",
    // Contract addresses (to be deployed)
    ANCHOR_CONTRACT: ZERO_ADDRESS, // Not deployed yet
    EQTY_TOKEN: ZERO_ADDRESS, // Not deployed yet
    // Configuration (to be set)
    ANCHOR_FEE: 0n, // To be configured
    MAX_ANCHORS_PER_TX: 100,
};
// Default configuration
export const DEFAULT_CONFIG = {
    ANCHOR_FEE: 0n,
    MAX_ANCHORS_PER_TX: 100,
    GAS_LIMIT: 500000n, // Estimated gas limit for anchoring
    DEFAULT_MESSAGE_LIMIT: 50,
    DEFAULT_MESSAGE_OFFSET: 0,
};
// Network configuration
export const NETWORKS = {
    "base-sepolia": BASE_SEPOLIA,
    "base-mainnet": BASE_MAINNET,
};
//# sourceMappingURL=contracts.js.map