# EQTY Core

EQTY Core Events Library - Base-compatible event chain and messaging for EQTY

## Overview

This library provides a clean, Base-compatible implementation of event chains and messaging for the EQTY platform. It replaces the LTO Network private layer components with Ethereum wallet-native signing and Base blockchain anchoring.

## Features

- **Event Chains**: Cryptographically linked events with Ethereum wallet signing
- **Messaging**: Encrypted messaging with wallet-based authentication
- **Base Anchoring**: Stateless smart contract anchoring on Base
- **Wallet Integration**: Native support for MetaMask, WalletConnect, and other Ethereum wallets
- **TypeScript**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install eqty-core
```

## Quick Start

### Basic Event Chain Usage

```typescript
import { Event, EventChain, EthersSigner } from "eqty-core";
import { ethers } from "ethers";

// Connect to wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const eqtySigner = new EthersSigner(signer);

// Create an event chain
const chain = new EventChain("my-chain-id");

// Create and sign an event
const event = new Event({ message: "Hello EQTY!" }, "application/json");
await event.signWith(eqtySigner);

// Add to chain
chain.addEvent(event);

// Get anchor map for blockchain submission
const anchors = chain.getAnchorMap();
console.log("Anchor to submit:", anchors); // Single { stateHash → lastEventHash } pair
```

### Messaging

```typescript
import { Message, Relay } from "eqty-core";

// Create a message
const message = new Message("Hello from EQTY!", "text/plain", {
  type: "greeting",
  title: "Welcome Message",
});

// Sign the message
await message.signWith(eqtySigner);

// Anchor message hash to blockchain (value is always 0x0)
await anchorClient.anchorMessage(message.hash);

// Send via relay (relay verifies anchor independently)
const relay = new Relay("https://relay.eqty.com");
await relay.send(message);
```

### Base Anchoring

```typescript
import { AnchorClient } from "eqty-core";

// Create anchor client
const anchorClient = new AnchorClient(
  "0x...", // Contract address on Base
  signer
);

// Anchor event chain
const stateHash = chain.stateHash;
await anchorClient.anchorEventChain("my-chain-id", stateHash);

// Anchor message
await anchorClient.anchorMessage(message.hash);
```

## API Reference

### Core Classes

#### `Event`

Represents a single event in an event chain.

```typescript
class Event {
  constructor(data: any, mediaType?: string, previous?: string | Uint8Array);

  async signWith(signer: ISigner): Promise<this>;
  verifySignature(): boolean;
  toJSON(): IEventJSON;
  static from(data: IEventJSON): Event;
}
```

#### `EventChain`

Manages a chain of cryptographically linked events.

```typescript
class EventChain {
  constructor(id: string);

  addEvent(event: Event): this;
  getAnchorMap(): Array<{ key: Binary; value: Binary }>;
  verify(): boolean;
  get stateHash(): Binary;
}
```

#### `Message`

Represents an encrypted message with metadata.

```typescript
class Message {
  constructor(data: any, mediaType?: string, meta?: IMessageMeta);

  async signWith(signer: ISigner): Promise<Message>;
  to(recipient: string): Message;
  encryptFor(recipientAddress: string): Message;
  verifySignature(): boolean;
}
```

#### `Relay`

Handles message routing and delivery.

```typescript
class Relay {
  constructor(url: string);

  async send(message: Message): Promise<Message>;
  async getMessages(
    recipient: string,
    limit?: number,
    offset?: number
  ): Promise<Message[]>;
}
```

#### `AnchorClient`

Interfaces with the Base smart contract for anchoring with full fee management.

```typescript
class AnchorClient {
  constructor(contractAddress: string, signer: Signer);

  // Core anchoring methods
  async anchor(key: Binary, value: Binary): Promise<AnchorResult>;
  async anchorMany(
    anchors: Array<{ key: Binary; value: Binary }>
  ): Promise<AnchorResult>;
  async anchorEventChain(
    chainId: string,
    stateHash: Binary
  ): Promise<AnchorResult>;
  async anchorMessage(messageHash: Binary): Promise<AnchorResult>;

  // Fee management
  async getAnchorFee(): Promise<bigint>;
  async getEqtyTokenAddress(): Promise<string>;
  async requiresFee(): Promise<boolean>;
  async getTotalFee(anchorCount: number): Promise<bigint>;
  async hasSufficientBalance(anchorCount: number): Promise<boolean>;
  async hasSufficientAllowance(anchorCount: number): Promise<boolean>;

  // Validation
  getMaxAnchorsPerTx(): number;
  validateAnchorCount(anchorCount: number): void;
}
```

### Signer Interface

#### `ISigner`

Abstract interface for wallet signing.

```typescript
interface ISigner {
  getAddress(): Promise<string>;
  sign(data: Uint8Array): Promise<Uint8Array>;
  signMessage(message: string | Uint8Array): Promise<string>;
}
```

#### `EthersSigner`

Ethers.js implementation of the signer interface.

```typescript
class EthersSigner implements ISigner {
  constructor(signer: Signer);
}
```

### Binary Utilities

#### `Binary`

Extended Uint8Array with blockchain-specific functionality.

```typescript
class Binary extends Uint8Array {
  get base58(): string;
  get base64(): string;
  get hex(): string;
  hash(): Binary;
  static fromHex(value: string): Binary;
  static fromBase58(value: string): Binary;
  static concat(...items: Array<ArrayLike<number>>): Binary;
}
```

## Smart Contract Integration

The library is perfectly aligned with the ownables-base Anchor contract:

```solidity
contract Anchor is IAnchor, Ownable2Step {
    struct Anchor {
        bytes32 key;
        bytes32 value;
    }

    event Anchored(bytes32 indexed key, bytes32 value, address indexed sender, uint64 timestamp);

    function anchor(Anchor[] calldata anchors) external {
        // Handles EQTY token fees and emits events for each anchor
    }

    function anchorFee() external view returns (uint256);
    function eqtyToken() external view returns (address);
}
```

### Key Features:

- **Perfect ABI Alignment**: Uses exact contract interface
- **Fee Handling**: Automatic EQTY token fee management
- **Batch Anchoring**: Supports up to 100 anchors per transaction
- **Gas Optimized**: Leverages stateless event-only design
- **Base Native**: Deployed on Base Sepolia and mainnet

## Migration from LTO

This library replaces the following LTO components:

| LTO Component          | EQTY Replacement | Notes                                         |
| ---------------------- | ---------------- | --------------------------------------------- |
| `events/Event.ts`      | `Event`          | Uses Ethereum signing instead of LTO keypairs |
| `events/EventChain.ts` | `EventChain`     | Anchors to Base instead of LTO blockchain     |
| `messages/Message.ts`  | `Message`        | Wallet-native authentication                  |
| `messages/Relay.ts`    | `Relay`          | Simplified for Base compatibility             |
| `Binary.ts`            | `Binary`         | Ported with minimal changes                   |
| `accounts/`            | `signer/`        | Replaced with Ethereum wallet abstraction     |

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint-fix
```

## License

MIT
