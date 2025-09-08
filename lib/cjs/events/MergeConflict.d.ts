import EventChain from "./EventChain";
import Event from "./Event";
export default class MergeConflict extends Error {
    chain: EventChain;
    left: Event;
    right: Event;
    constructor(chain: EventChain, left: Event, right: Event);
}
//# sourceMappingURL=MergeConflict.d.ts.map