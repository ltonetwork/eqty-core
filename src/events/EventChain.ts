import { sha256 } from "@noble/hashes/sha2";
import { keccak_256 } from "@noble/hashes/sha3";
import { randomBytes } from "@noble/hashes/utils";
import Event from "./Event";
import Binary from "../Binary";
import MergeConflict from "./MergeConflict"
import { compareBytes, isBinary } from "../utils/bytes"
import { IBinary, IEventChainJSON, IEventJSON, VerifyFn } from "../types"
import { BASE_CHAIN_ID } from "../constants"

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

  static create(address: string, network = BASE_CHAIN_ID, nonce?: string | Uint8Array): EventChain {
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

    this.assertEventFits(event);
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
        this.assertEventFits(event);
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

  protected assertEventFits(event: Event): void {
    if (!event.previous || event.previous.hex != this.latestHash.hex)
      throw new Error(`Event doesn't fit onto the chain after ${this.latestHash.hex}`);
  }

  async validate(verifyFn: VerifyFn = async () => true): Promise<void> {
    if (this.events.length === 0) throw new Error('No events on event chain');

    await this.validateEvents(verifyFn);
    if (this.events[0]?.previous?.hex === this.initialHash.hex) this.validateGenesis();
  }

  private async validateEvents(verifyFn: VerifyFn): Promise<void> {
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
      if (!(await event.verifySignature(verifyFn)))
        throw new Error(`Invalid signature of event ${event.hash.hex}`);
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

  toBinary(): Uint8Array {
    const versionByte = Uint8Array.from([this.version]);
    const chainIdBytes = Binary.fromHex(this.id);
    const partialFlag = Uint8Array.from([this.partial ? 1 : 0]);
    const partialBytes = this.partial ? Binary.concat(this.partial.hash, this.partial.state) : new Binary(0);

    const count = this.events.length;
    const countBytes = Binary.fromInt16(count);

    const eventChunks: Array<Uint8Array> = [];
    for (const ev of this.events) {
      const evBytes = ev.toBinary();
      const lenBytes = Binary.fromInt32(evBytes.length);
      eventChunks.push(lenBytes, evBytes);
    }

    return Binary.concat(versionByte, chainIdBytes, partialFlag, partialBytes, countBytes, ...eventChunks);
  }

  toJSON(): IEventChainJSON {
    const events: Array<IEventJSON | { hash: string; state: string }> = this.events.map((event) => event.toJSON());

    if (this.partial) events.unshift({ hash: this.partial.hash.hex, state: this.partial.state.hex });

    return { id: this.id, events };
  }

  static from(data: IEventChainJSON | Uint8Array): EventChain {
    return isBinary(data) ? EventChain.fromBinary(data) : EventChain.fromJson(data);
  }

  private static fromJson(data: IEventChainJSON): EventChain {
    const chain = new EventChain(data.id);

    if (data.events.length === 0) return chain;

    if ('state' in data.events[0]) {
      const partial = data.events.shift() as { hash: string; state: string };
      chain.partial = {
        hash: Binary.fromHex(partial.hash),
        state: Binary.fromHex(partial.state),
      };
    }

    for (const eventData of (data.events ?? []) as IEventJSON[]) {
      chain.events.push(Event.from(eventData));
    }

    return chain;
  }

  private static fromBinary(data: Uint8Array): EventChain {
    const bin = new Binary(data);
    // Minimum: version(1) + id(49) + partialFlag(1) + count(2)
    if (bin.length < 1 + 49 + 1 + 2) {
      throw new Error('Invalid event chain binary: too short');
    }

    let offset = 0;

    const version = bin[offset++];
    if (version !== EVENT_CHAIN_V3) {
      throw new Error(`Event chain version ${version} not supported`);
    }

    const idBytes = bin.slice(offset, offset + 49);
    offset += 49;
    const chainId = idBytes.hex;

    const partialFlag = bin[offset++];

    let partial: { hash: IBinary; state: IBinary } | undefined;
    if (partialFlag === 1) {
      if (offset + 64 > bin.length) throw new Error('Invalid event chain binary: partial header out of bounds');
      const hash = bin.slice(offset, offset + 32);
      offset += 32;
      const state = bin.slice(offset, offset + 32);
      offset += 32;
      partial = { hash, state };
    }

    if (offset + 2 > bin.length) throw new Error('Invalid event chain binary: missing event count');
    const count = bin.dataView.getUint16(offset, false);
    offset += 2;

    const events: Event[] = [];
    for (let i = 0; i < count; i++) {
      if (offset + 4 > bin.length) throw new Error('Invalid event chain binary: missing event length');
      const len = bin.dataView.getUint32(offset, false);
      offset += 4;
      if (offset + len > bin.length) throw new Error('Invalid event chain binary: event out of bounds');
      const evBytes = bin.slice(offset, offset + len);
      offset += len;
      const ev = Event.from(evBytes);
      events.push(ev);
    }

    const chain = new EventChain(chainId);

    if (partial) chain.partial = partial;
    chain.events = events;

    return chain;
  }

  protected static createNonce(input: string | Uint8Array): Uint8Array {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return sha256(bytes).slice(0, 20);
  }

  protected static getRandomNonce(): Uint8Array {
    return randomBytes(20);
  }

  private static buildId(prefix: number, network: number, group: Uint8Array, randomBytes: Uint8Array): string {
    if (randomBytes.length !== 20) throw new Error('Random bytes should have a length of 20');

    const prefixBytes = Uint8Array.from([prefix]);
    const networkBytes = Binary.fromInt32(network);

    const publicKeyHashPart = new Binary(keccak_256(group)).slice(0, 20);
    const rawId = Binary.concat(prefixBytes, networkBytes, randomBytes, publicKeyHashPart);
    const addressHash = new Binary(keccak_256(rawId)).slice(0, 4);

    return '0x' + Binary.concat(rawId, addressHash).hex;
  }

  private static validateId(prefix: number, network: number, id: string, group?: Uint8Array): boolean {
    const idBytes = Binary.fromHex(id);

    if (idBytes.length !== 81 || idBytes[0] !== prefix || idBytes.dataView.getInt32(1) !== network) {
      return false;
    }

    const rawId = idBytes.slice(0, 42);
    const check = idBytes.slice(42);
    const addressHash = new Binary(keccak_256(rawId)).slice(0, 4);

    let res = compareBytes(check, addressHash);

    if (res && group) {
      const keyBytes = rawId.slice(22);
      const publicKeyHashPart = keccak_256(group).slice(0, 20);

      res = compareBytes(keyBytes, publicKeyHashPart);
    }

    return res;
  }
}
