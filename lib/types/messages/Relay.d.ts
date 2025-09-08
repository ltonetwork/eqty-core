import Message from "./Message";
import { IRelayResponse } from "../types/messages";
export default class Relay {
    readonly url: string;
    constructor(url: string);
    private fetch;
    post(endpoint: string, postData: unknown, headers?: Record<string, string>): Promise<IRelayResponse>;
    get(endpoint: string, headers?: Record<string, string>): Promise<IRelayResponse>;
    send(message: Message): Promise<Message>;
    getMessages(recipient: string, limit?: 50, offset?: 0): Promise<Message[]>;
    getMessage(id: string): Promise<Message>;
}
//# sourceMappingURL=Relay.d.ts.map