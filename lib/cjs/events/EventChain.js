"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Event_1 = __importDefault(require("./Event"));
const Binary_1 = __importDefault(require("../Binary"));
class EventChain {
    constructor(id) {
        this.events = [];
        this.id = id;
    }
    get stateHash() {
        if (!this._stateHash) {
            this._stateHash = this.computeStateHash();
        }
        return this._stateHash;
    }
    computeStateHash() {
        if (this.events.length === 0) {
            return new Binary_1.default((0, ethers_1.keccak256)(this.id));
        }
        let currentHash = new Binary_1.default((0, ethers_1.keccak256)(this.id));
        for (const event of this.events) {
            const eventHash = event.hash;
            const combined = Binary_1.default.concat(currentHash, eventHash);
            currentHash = new Binary_1.default((0, ethers_1.keccak256)(combined));
        }
        return currentHash;
    }
    addEvent(event) {
        if (this.events.length > 0) {
            event.previous = this.events[this.events.length - 1].hash;
        }
        this.events.push(event);
        this._stateHash = undefined; // Reset state hash to recompute
        return this;
    }
    getAnchorMap() {
        // Always returns ONE { stateHash → lastEventHash } pair
        // This anchors the final state of the chain
        return [
            {
                key: this.stateHash,
                value: this.events.length > 0
                    ? this.events[this.events.length - 1].hash
                    : this.stateHash,
            },
        ];
    }
    verify() {
        if (this.events.length === 0)
            return true;
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
            if (!currentEvent.previous ||
                currentEvent.previous.toString() !== previousEvent.hash.toString()) {
                return false;
            }
        }
        return true;
    }
    toJSON() {
        return {
            id: this.id,
            events: this.events.map((event) => event.toJSON()),
            stateHash: this.stateHash.base58,
        };
    }
    static from(data) {
        const chain = new EventChain(data.id);
        for (const eventData of data.events) {
            const event = Event_1.default.from(eventData);
            chain.addEvent(event);
        }
        return chain;
    }
}
exports.default = EventChain;
//# sourceMappingURL=EventChain.js.map