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

## Quick Start with Ethers

### Basic Event Chain Usage

```typescript
import { Event, EventChain, AnchorClient } from "eqty-core";
import { BrowserProvider, verifyTypedData, Contract } from "ethers";

// Connect to wallet
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const address = await signer.getAddress();
const { chainId: networkId } = await provider.getNetwork();

// Create an event chain
const chain = EventChain.create(address, networkId)
  .withVerification((address, ...args) => verifyTypedData(...args).toLowerCase() === address.toLowerCase());

// Create event and add to chain
const event = new Event({ message: "Hello EQTY!" }, "application/json")
  .addTo(chain);

// Sign event
await event.signWith(signer);

// Create anchor client
const contract = new Contract(BASE_ANCHOR_CONTRACT, AnchorClient.ABI, signer);
const anchorClient = new AnchorClient(contract);

// Anchor chain map
await anchorClient.anchor(chain.anchorMap);
```

### Messaging

```typescript
import { Message, Relay } from "eqty-core";
import { BrowserProvider, Contract } from "ethers";

// Connect to wallet
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Create a message
const message = new Message("Hello from EQTY!", "text/plain", {
  type: "greeting",
  title: "Welcome Message",
});

// Sign the message
await message.signWith(signer);

// Create anchor client
const contract = new Contract(
  AnchorClient.contractAddress(networkId),
  AnchorClient.ABI,
  signer,
);
const anchorClient = new AnchorClient(contract);

// Anchor message hash to blockchain
await anchorClient.anchor(message.hash);

// Send via relay (relay verifies anchor independently)
const relay = new Relay("https://relay.eqty.com");
await relay.send(message);
```

## Quick Start with Viem

### Basic Event Chain Usage

```typescript
import { Event, EventChain, AnchorClient, ViemSigner, ViemContract } from "eqty-core";
import { createWalletClient, createPublicClient, custom, recoverTypedDataAddress } from "viem";
import { base, baseSepolia } from "viem/chains";

// Request accounts and set up viem wallet client with an account
const [address] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];

const publicClient = createPublicClient({
  chain: walletClient.chain!,
  transport: custom(window.ethereum),
});

const walletClient = createWalletClient({
  account: address as `0x${string}`,
  chain: baseSepolia, // or base
  transport: custom(window.ethereum),
});

// Create an EQTY signer for viem
const signer = new ViemSigner(walletClient);

// Create an event chain
const networkId = walletClient.chain!.id;
const chain = EventChain.create(address, networkId)
  .withVerification((address, domain, types, value, signature) =>
    verifyTypedData({ address, domain, types, message: value, signature })
  );

// Create event and add to chain
const event = new Event({ message: "Hello EQTY!" }, "application/json").addTo(chain);

// Sign event with viem signer
await event.signWith(signer);

// Set up ViemContract and AnchorClient
const contract = new ViemAnchorContract(
  publicClient,
  walletClient,
  AnchorClient.contractAddress(networkId),
);
const anchorClient = new AnchorClient(contract);

// Anchor chain map
await anchorClient.anchor(chain.anchorMap);
```

### Messaging

```typescript
import { Message, Relay, ViemSigner, ViemContract } from "eqty-core";
import { createWalletClient, createPublicClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

// Set up viem wallet client and signer as above
const [address] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];

const publicClient = createPublicClient({
  chain: walletClient.chain!,
  transport: custom(window.ethereum),
});

const walletClient = createWalletClient({
  account: address as `0x${string}`,
  chain: baseSepolia,
  transport: custom(window.ethereum),
});
const signer = new ViemSigner(client);

const networkId = walletClient.chain!.id;

// Create a message
const message = new Message("Hello from EQTY!", "text/plain", {
  type: "greeting",
  title: "Welcome Message",
});

// Sign the message
await message.signWith(signer);

// Set up ViemContract and AnchorClient
const contract = new ViemAnchorContract(
  publicClient,
  walletClient,
  AnchorClient.contractAddress(networkId)
);
const anchorClient = new AnchorClient(contract);

// Anchor message hash to blockchain
await anchorClient.anchor(message.hash);

// Send via relay (relay verifies anchor independently)
const relay = new Relay("https://relay.eqty.com");
await relay.send(message);
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

## Migration from LTO

This library replaces the following LTO components:

| LTO Component       | EQTY Replacement | Notes                                                        |
|---------------------|------------------|--------------------------------------------------------------|
| `events/Event`      | `Event`          | Uses Ethereum signing instead of LTO keypairs                |
| `events/EventChain` | `EventChain`     | Anchors to Base instead of LTO blockchain                    |
| `messages/Message`  | `Message`        | Wallet-native authentication                                 |
| `messages/Relay`    | `Relay`          | Simplified for Base compatibility                            |
| `Binary`            | `Binary`         | Ported with minimal changes                                  |
| `LTO.anchor`        | `AnchorClient`   | Replaced with helper class to anchor using an smart contract |

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
