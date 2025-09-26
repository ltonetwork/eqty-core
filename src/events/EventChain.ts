import { keccak256, randomBytes, sha256 } from "ethers";
import Event from "./Event";
import Binary from "../Binary";
import { IBinary, IEventChainJSON, IEventJSON } from "../types"
import { compareBytes } from "../utils/bytes"
import MergeConflict from "./MergeConflict"
import { BASE_MAINNET } from "../constants"

export const EVENT_CHAIN_V3 = 0x42;
const DERIVED_ID_V2 = 0x52;

export default class EventChain {
  readonly id: string;
  readonly networkId: number;

  events: Array<Event> = [];
  private partial?: { hash: IBinary; state: IBinary };

  constructor(id: string) {
    this.id = id;
    this.networkId = Binary.fromHex(this.id).dataView.getInt32(1);
  }

  static create(address: string, network = BASE_MAINNET.CHAIN_ID, nonce?: string | Uint8Array): EventChain {
    const nonceBytes = typeof nonce !== 'undefined' ? EventChain.createNonce(nonce) : EventChain.getRandomNonce();

    const id = EventChain.buildId(EVENT_CHAIN_V3, network, Binary.fromHex(address), nonceBytes);
    return new EventChain(id);
  }

  get version(): number {
    return Binary.fromHex(this.id)[0];
  }

  createDerivedId(nonce?: string): string {
    const nonceBytes = nonce ? EventChain.createNonce(nonce) : EventChain.getRandomNonce();
    return EventChain.buildId(DERIVED_ID_V2, this.networkId, Binary.fromHex(this.id), nonceBytes);
  }

  isDerivedId(id: string): boolean {
    return EventChain.validateId(DERIVED_ID_V2, this.networkId, id, Binary.fromHex(this.id));
  }

  add(eventOrChain: Event | EventChain): EventChain {
    if (this.events.length > 0 && !this.latestEvent.isSigned())
      throw new Error('Unable to add event: last event on chain is not signed');

    if (eventOrChain instanceof EventChain) {
      this.addChain(eventOrChain);
    } else {
      this.addEvent(eventOrChain);
    }

    return this;
  }

  private addEvent(event: Event): void {
    if (!event.previous) event.previous = this.latestHash;
    event.networkId = this.networkId;
    (event as any).version = this.version;

    this.assertEvent(event);
    this.events.push(event);
  }

  private addChain(chain: EventChain): void {
    if (chain.id !== this.id) throw Error('Chain id mismatch');

    let offset = 0;
    if (chain.partial) {
      offset = this.events.findIndex((event) => event.hash.hex === chain.partial!.hash.hex) + 1;
      if (offset === 0) {
        throw new Error(`Events don't fit onto this chain: Event ${chain.partial.hash.hex} not found`);
      }
    }

    for (const [index, event] of chain.events.entries()) {
      if (!this.events[offset + index]) {
        this.assertEvent(event);
        this.events.push(event);
      } else if (this.events[offset + index].hash.hex !== event.hash.hex) {
        throw new MergeConflict(this, this.events[offset + index], chain.events[index]);
      }
    }
  }

  has(event: IBinary | Event): boolean {
    const hash = event instanceof Event ? event.hash : event;
    return !!this.events.find((event) => event.hash.hex === hash.hex);
  }

  get latestHash(): IBinary {
    return this.events.length == 0 ? this.partial?.hash || this.initialHash : this.events.slice(-1)[0].hash;
  }

  private get initialHash(): IBinary {
    return Binary.fromHex(this.id).hash();
  }

  private get latestEvent(): Event {
    return this.events[this.events.length - 1];
  }

  get state(): IBinary {
    if (this.events.length > 0 && !this.events[this.events.length - 1].isSigned()) {
      throw new Error('Unable to get state: last event on chain is not signed');
    }

    return this.stateAt(this.events.length);
  }

  private get initialState(): IBinary {
    return Binary.fromHex(this.id).reverse().hash();
  }

  protected stateAt(length: number): IBinary {
    if (length > this.events.length) throw new Error('Unable to get state: out of bounds');

    const initial = this.partial?.state ?? this.initialState;
    return this.events.slice(0, length).reduce((state, event) => Binary.concat(state, event.hash).hash(), initial);
  }

  protected assertEvent(event: Event): void {
    if (!event.previous || event.previous.hex != this.latestHash.hex)
      throw new Error(`Event doesn't fit onto the chain after ${this.latestHash.hex}`);

    if (!event.verifyHash()) throw new Error(`Invalid hash of event ${event.hash.hex}`);

    if (event.isSigned() && !event.verifySignature())
      throw new Error(`Invalid signature of event ${event.hash.hex}`);
  }

  validate(): void {
    if (this.events.length === 0) throw new Error('No events on event chain');

    this.validateEvents();
    if (this.events[0]?.previous?.hex === this.initialHash.hex) this.validateGenesis();
  }

  private validateEvents(): void {
    let previous = this.partial?.hash ?? this.initialHash;

    for (const event of this.events) {
      if (!event.isSigned()) {
        let desc: string;
        try {
          desc = `Event ${event.hash.hex}`;
        } catch {
          desc = event === this.latestEvent ? 'Last event' : `Event after ${previous.hex}`;
        }
        throw new Error(`${desc} is not signed`);
      }

      if (!event.verifyHash()) throw new Error(`Invalid hash of event ${event.hash.hex}`);
      if (!event.verifySignature()) throw new Error(`Invalid signature of event ${event.hash.hex}`);
      if (previous.hex !== event.previous?.hex)
        throw new Error(`Event ${event.hash.hex} doesn't fit onto the chain`);

      previous = event.hash;
    }
  }

  private validateGenesis(): void {
    const address = this.events[0].signerAddress;
    const isValid = !!address
      && EventChain.validateId(EVENT_CHAIN_V3, this.networkId, this.id, Binary.fromHex(address));

    if (!isValid) throw new Error('Genesis event is not signed by chain creator');
  }

  isSigned(): boolean {
    return this.events.every((e) => e.isSigned());
  }

  startingWith(start: IBinary | Event): EventChain {
    return this.createPartial(start, 0);
  }

  startingAfter(start: IBinary | Event): EventChain {
    return this.createPartial(start, 1);
  }

  private createPartial(start: IBinary | Event, offset: number): EventChain {
    const startHash = start instanceof Event ? start.hash : start;

    if (this.initialHash.hex === startHash.hex) return this;

    const foundIndex = this.events.findIndex((e) => e.hash.hex === startHash.hex);
    if (foundIndex < 0) throw new Error(`Event ${startHash.hex} is not part of this event chain`);

    const index = foundIndex + offset;
    if (index === 0) return this;

    const chain = new EventChain(this.id);
    chain.partial = {
      hash: this.events[index - 1].hash,
      state: this.stateAt(index),
    };
    chain.events = this.events.slice(index);

    return chain;
  }

  isPartial(): boolean {
    return !!this.partial;
  }

  isCreatedBy(address: string, networkId: number): boolean {
    return EventChain.validateId(EVENT_CHAIN_V3, networkId, this.id, Binary.fromHex(address));
  }

  get anchorMap(): Array<{ key: IBinary; value: IBinary; signer: string }> {
    const map: Array<{ key: IBinary; value: IBinary; signer: string }> = [];
    let state = Binary.from(this.partial?.state ?? this.initialState);

    for (const event of this.events) {
      if (!event.signerAddress) {
        throw new Error(`Event ${event.hash.hex} is not signed`);
      }

      map.push({ key: state satisfies Binary, value: event.hash, signer: event.signerAddress! });
      state = Binary.concat(state, event.hash).hash();
    }

    return map;
  }

  toJSON(): IEventChainJSON {
    const events: Array<IEventJSON | { hash: string; state: string }> = this.events.map((event) => event.toJSON());

    if (this.partial) events.unshift({ hash: this.partial.hash.hex, state: this.partial.state.hex });

    return { id: this.id, events };
  }

  static from(data: IEventChainJSON): EventChain {
    const chain = new EventChain(data.id);
    const chainVersion = chain.version;

    if (data.events.length === 0) return chain;

    if ('state' in data.events[0]) {
      const partial = data.events.shift() as { hash: string; state: string };
      chain.partial = {
        hash: Binary.fromHex(partial.hash),
        state: Binary.fromHex(partial.state),
      };
    }

    for (const eventData of (data.events ?? []) as IEventJSON[]) {
      chain.events.push(Event.from(eventData, chainVersion));
    }

    return chain;
  }

  protected static createNonce(input: string | Uint8Array): Uint8Array {
    return Uint8Array.from(sha256(input).slice(0, 20));
  }

  protected static getRandomNonce(): Uint8Array {
    return randomBytes(20);
  }

  private static buildId(prefix: number, network: number, group: Uint8Array, randomBytes: Uint8Array): string {
    if (randomBytes.length !== 20) throw new Error('Random bytes should have a length of 20');

    const prefixBytes = Uint8Array.from([prefix]);
    const networkBytes = Binary.fromInt32(network);

    const publicKeyHashPart = Binary.fromHex(keccak256(group)).slice(0, 20);
    const rawId = Binary.concat(prefixBytes, networkBytes, randomBytes, publicKeyHashPart);
    const addressHash = Binary.from(keccak256(rawId)).slice(0, 4);

    return '0x' + Binary.concat(rawId, addressHash).hex;
  }

  private static validateId(prefix: number, network: number, id: string, group?: Uint8Array): boolean {
    const idBytes = Binary.fromHex(id);

    if (idBytes.length !== 81 || idBytes[0] !== prefix || idBytes.dataView.getInt32(1) !== network) {
      return false;
    }

    const rawId = idBytes.slice(0, 42);
    const check = idBytes.slice(42);
    const addressHash = Binary.from(keccak256(rawId)).slice(0, 4);

    let res = compareBytes(check, addressHash);

    if (res && group) {
      const keyBytes = rawId.slice(22);
      const publicKeyHashPart = Uint8Array.from(keccak256(group).slice(0, 20));

      res = compareBytes(keyBytes, publicKeyHashPart);
    }

    return res;
  }
}
