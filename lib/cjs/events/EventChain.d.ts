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
    readonly events: Event[];
    private _stateHash?;
    constructor(id: string);
    get stateHash(): Binary;
    private computeStateHash;
    addEvent(event: Event): this;
    getAnchorMap(): Array<{
        key: Binary;
        value: Binary;
    }>;
    /**
     * Get all anchor points for incremental anchoring
     * This is useful for anchoring multiple state transitions at once
     */
    getIncrementalAnchorMap(): Array<{
        key: Binary;
        value: Binary;
    }>;
    verify(): boolean;
    toJSON(): IEventChainJSON;
    static from(data: IEventChainJSON): EventChain;
}
//# sourceMappingURL=EventChain.d.ts.map