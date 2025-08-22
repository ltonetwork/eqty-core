import { ISigner } from "../signer";
import Binary from "../Binary";
import { IEventJSON, IEventData, IEventAttachment, IEventSignable } from "../types/events";
import EventChain from "./EventChain";
export declare const EVENT_CHAIN_V1 = 0;
export declare const EVENT_CHAIN_V2 = 1;
export default class Event implements IEventSignable {
    private version;
    /** Meta type of the data */
    mediaType: string;
    /** Data of the event */
    data: Binary;
    /** Time when the event was signed */
    timestamp?: number;
    /** Hash to the previous event */
    previous?: Binary;
    /** Ethereum address of the signer */
    signerAddress?: string;
    /** Signature of the event */
    signature?: Binary;
    /** Hash (see dynamic property) */
    private _hash?;
    /** Hash of attachments related to the event */
    readonly attachments: IEventAttachment[];
    constructor(data: IEventData | string | Uint8Array, mediaType?: string, previous?: string | Uint8Array);
    addAttachment(name: string, data: IEventData | string | Uint8Array, mediaType?: string): void;
    private _setData;
    get hash(): Binary;
    toBinary(): Uint8Array;
    private toBinaryV1;
    private toBinaryV2;
    verifySignature(): boolean;
    verifyHash(): boolean;
    signWith(signer: ISigner): Promise<this>;
    addTo(chain: EventChain): this;
    isSigned(): boolean;
    get parsedData(): any;
    toJSON(): IEventJSON;
    static from(data: IEventJSON, version?: number): Event;
}
//# sourceMappingURL=Event.d.ts.map