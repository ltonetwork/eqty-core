"use strict";
/**
 * Contract addresses and configuration for Base blockchain
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NETWORKS = exports.DEFAULT_CONFIG = exports.BASE_MAINNET = exports.BASE_SEPOLIA = exports.ADDRESS_LENGTH = exports.HASH_LENGTH = exports.BYTES_PER_HEX_CHAR = exports.HEX_PREFIX_LENGTH = exports.HEX_PREFIX = exports.MESSAGE_V2 = exports.MESSAGE_V1 = exports.EVENT_CHAIN_V2 = exports.EVENT_CHAIN_V1 = exports.ZERO_HASH = exports.ZERO_ADDRESS = void 0;
// Common constants
exports.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
exports.ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
// Event and Message versions
exports.EVENT_CHAIN_V1 = 0;
exports.EVENT_CHAIN_V2 = 1;
exports.MESSAGE_V1 = 0;
exports.MESSAGE_V2 = 1;
// Binary and encoding constants
exports.HEX_PREFIX = "0x";
exports.HEX_PREFIX_LENGTH = 2;
exports.BYTES_PER_HEX_CHAR = 2;
exports.HASH_LENGTH = 32; // bytes
exports.ADDRESS_LENGTH = 20; // bytes
// Base Sepolia Testnet
exports.BASE_SEPOLIA = {
    CHAIN_ID: 84532,
    RPC_URL: "https://sepolia.base.org",
    EXPLORER_URL: "https://sepolia.basescan.org",
    // Contract addresses
    ANCHOR_CONTRACT: "0x7607af0cea78815c71bbea90110b2c218879354b",
    EQTY_TOKEN: exports.ZERO_ADDRESS, // Not deployed on testnet yet
    // Current configuration (as deployed)
    ANCHOR_FEE: 0n, // No fee on testnet
    MAX_ANCHORS_PER_TX: 100,
};
// Base Mainnet
exports.BASE_MAINNET = {
    CHAIN_ID: 8453,
    RPC_URL: "https://mainnet.base.org",
    EXPLORER_URL: "https://basescan.org",
    // Contract addresses (to be deployed)
    ANCHOR_CONTRACT: exports.ZERO_ADDRESS, // Not deployed yet
    EQTY_TOKEN: exports.ZERO_ADDRESS, // Not deployed yet
    // Configuration (to be set)
    ANCHOR_FEE: 0n, // To be configured
    MAX_ANCHORS_PER_TX: 100,
};
// Default configuration
exports.DEFAULT_CONFIG = {
    ANCHOR_FEE: 0n,
    MAX_ANCHORS_PER_TX: 100,
    GAS_LIMIT: 500000n, // Estimated gas limit for anchoring
    DEFAULT_MESSAGE_LIMIT: 50,
    DEFAULT_MESSAGE_OFFSET: 0,
};
// Network configuration
exports.NETWORKS = {
    "base-sepolia": exports.BASE_SEPOLIA,
    "base-mainnet": exports.BASE_MAINNET,
};
//# sourceMappingURL=contracts.js.map