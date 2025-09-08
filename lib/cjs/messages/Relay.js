"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = __importDefault(require("./Message"));
const constants_1 = require("../constants");
class Relay {
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
        return Message_1.default.from(response.message);
    }
    async getMessages(recipient, limit = constants_1.DEFAULT_CONFIG.DEFAULT_MESSAGE_LIMIT, offset = constants_1.DEFAULT_CONFIG.DEFAULT_MESSAGE_OFFSET) {
        const response = await this.get(`/messages/${recipient}?limit=${limit}&offset=${offset}`);
        return (response.messages || []).map((msg) => Message_1.default.from(msg));
    }
    async getMessage(id) {
        const response = await this.get(`/messages/${id}`);
        return Message_1.default.from(response.message);
    }
}
exports.default = Relay;
//# sourceMappingURL=Relay.js.map