import { keccak256 } from "ethers";
import Event from "./Event";
import Binary from "../Binary";
import { IEventJSON } from "../types/events";

export interface IEventChainJSON {
  id: string;
  events: IEventJSON[];
  stateHash?: string;
}

export default class EventChain {
  readonly id: string;
  readonly events: Event[] = [];
  private _stateHash?: Binary;

  constructor(id: string) {
    this.id = id;
  }

  get stateHash(): Binary {
    if (!this._stateHash) {
      this._stateHash = this.computeStateHash();
    }
    return this._stateHash;
  }

  private computeStateHash(): Binary {
    if (this.events.length === 0) {
      return new Binary(keccak256(this.id));
    }

    let currentHash = new Binary(keccak256(this.id));

    for (const event of this.events) {
      const eventHash = event.hash;
      const combined = Binary.concat(currentHash, eventHash);
      currentHash = new Binary(keccak256(combined));
    }

    return currentHash;
  }

  addEvent(event: Event): this {
    if (this.events.length > 0) {
      event.previous = this.events[this.events.length - 1].hash;
    }

    this.events.push(event);
    this._stateHash = undefined; // Reset state hash to recompute

    return this;
  }

  getAnchorMap(): Array<{ key: Binary; value: Binary }> {
    // For Base anchoring, we anchor the state hash as key and the latest event hash as value
    // This provides a clean way to verify the current state of the event chain
    return [
      {
        key: this.stateHash,
        value:
          this.events.length > 0
            ? this.events[this.events.length - 1].hash
            : this.stateHash,
      },
    ];
  }

  /**
   * Get all anchor points for incremental anchoring
   * This is useful for anchoring multiple state transitions at once
   */
  getIncrementalAnchorMap(): Array<{ key: Binary; value: Binary }> {
    if (this.events.length === 0) {
      return [{ key: this.stateHash, value: this.stateHash }];
    }

    const anchors: Array<{ key: Binary; value: Binary }> = [];
    let currentState = new Binary(keccak256(this.id));

    for (const event of this.events) {
      const eventHash = event.hash;
      const combined = Binary.concat(currentState, eventHash);
      const newState = new Binary(keccak256(combined));

      anchors.push({
        key: currentState,
        value: eventHash,
      });

      currentState = newState;
    }

    return anchors;
  }

  verify(): boolean {
    if (this.events.length === 0) return true;

    // Verify each event's signature
    for (const event of this.events) {
      if (!event.verifySignature()) {
        return false;
      }
    }

    // Verify event chain integrity
    for (let i = 1; i < this.events.length; i++) {
      const currentEvent = this.events[i];
      const previousEvent = this.events[i - 1];

      if (
        !currentEvent.previous ||
        currentEvent.previous.toString() !== previousEvent.hash.toString()
      ) {
        return false;
      }
    }

    return true;
  }

  toJSON(): IEventChainJSON {
    return {
      id: this.id,
      events: this.events.map((event) => event.toJSON()),
      stateHash: this.stateHash.base58,
    };
  }

  static from(data: IEventChainJSON): EventChain {
    const chain = new EventChain(data.id);

    for (const eventData of data.events) {
      const event = Event.from(eventData);
      chain.addEvent(event);
    }

    return chain;
  }
}
