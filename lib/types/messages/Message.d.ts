import { ISigner } from "../signer";
import Binary from "../Binary";
import { IMessageMeta, IMessageJSON, IMessageData, IMessageSignable } from "../types/messages";
export default class Message implements IMessageSignable {
    /** Version of the message */
    version: number;
    /** Extra info and details about the message */
    meta: IMessageMeta;
    /** Meta type of the data */
    mediaType: string;
    /** Data of the message */
    data: Binary;
    /** Time when the message was signed */
    timestamp?: number;
    /** Ethereum address of the sender */
    sender?: string;
    /** Signature of the message */
    signature?: Binary;
    /** Address of the recipient */
    recipient?: string;
    /** Hash (see dynamic property) */
    private _hash?;
    /** Encrypted data */
    private _encryptedData?;
    constructor(data: IMessageData | string | Uint8Array, mediaType?: string, meta?: Partial<IMessageMeta> | string);
    get type(): string;
    get hash(): Binary;
    get encryptedData(): Binary;
    to(recipient: string): Message;
    encryptFor(recipientAddress: string): Message;
    decryptWith(_signer: ISigner): Message;
    isEncrypted(): boolean;
    signWith(sender: ISigner): Promise<this>;
    isSigned(): boolean;
    verifySignature(): boolean;
    verifyHash(): boolean;
    private toBinaryV1;
    private toBinaryV2;
    toBinary(withSignature?: boolean): Uint8Array;
    toJSON(): IMessageJSON;
    static from(data: IMessageJSON | Uint8Array): Message;
    private static fromJSON;
    private static fromBinary;
}
//# sourceMappingURL=Message.d.ts.map