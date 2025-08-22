import Message from "./Message";
export default class Relay {
    constructor(url) {
        this.url = url.replace(/\/$/, "");
    }
    // Can be overridden by mock for testing
    fetch(url, options) {
        return fetch(url, options);
    }
    async post(endpoint, postData, headers = {}) {
        endpoint = endpoint.replace(/^\//, "");
        headers["content-type"] = "application/json";
        const body = typeof postData === "string" ? postData : JSON.stringify(postData);
        const response = await this.fetch(`${this.url}/${endpoint}`, {
            method: "POST",
            headers,
            body,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Relay error: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        return (await response.json());
    }
    async get(endpoint, headers = {}) {
        endpoint = endpoint.replace(/^\//, "");
        const response = await this.fetch(`${this.url}/${endpoint}`, {
            method: "GET",
            headers,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Relay error: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        return (await response.json());
    }
    async send(message) {
        if (!message.isSigned()) {
            throw new Error("Message must be signed before sending");
        }
        // Relay service will verify anchor independently by checking:
        // 1. Message hash is anchored on-chain
        // 2. Sender address matches the signature
        const relayMessage = {
            message: message.toJSON(),
        };
        const response = await this.post("/messages", relayMessage);
        return Message.from(response.message);
    }
    async getMessages(recipient, limit = 50, offset = 0) {
        const response = await this.get(`/messages/${recipient}?limit=${limit}&offset=${offset}`);
        return (response.messages || []).map((msg) => Message.from(msg));
    }
    async getMessage(id) {
        const response = await this.get(`/messages/${id}`);
        return Message.from(response.message);
    }
}
//# sourceMappingURL=Relay.js.map