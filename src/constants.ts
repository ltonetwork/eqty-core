/**
 * Contract addresses and configuration for Base blockchain
 */

// Common constants
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

// Base Sepolia Testnet
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_ANCHOR_CONTRACT = "0x7607af0cea78815c71bbea90110b2c218879354b"
export const BASE_SEPOLIA_EQTY_TOKEN = ZERO_ADDRESS; // Not deployed yet

// Base Mainnet
export const BASE_CHAIN_ID = 8453;
export const BASE_ANCHOR_CONTRACT = ZERO_ADDRESS; // Not deployed yet
export const BASE_EQTY_TOKEN = ZERO_ADDRESS;

// Default configuration used by Relay and other modules
export const DEFAULT_CONFIG = {
  DEFAULT_MESSAGE_LIMIT: 50,
  DEFAULT_MESSAGE_OFFSET: 0,
};
