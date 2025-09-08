import Message from "./Message";
import { IMessageJSON, IRelayMessage, IRelayResponse } from "../types/messages";
import { DEFAULT_CONFIG } from "../constants";

export default class Relay {
  readonly url: string;

  constructor(url: string) {
    this.url = url.replace(/\/$/, "");
  }

  // Can be overridden by mock for testing
  private fetch(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  async post(
    endpoint: string,
    postData: unknown,
    headers: Record<string, string> = {}
  ): Promise<IRelayResponse> {
    endpoint = endpoint.replace(/^\//, "");
    headers["content-type"] = "application/json";
    const body =
      typeof postData === "string" ? postData : JSON.stringify(postData);

    const response = await this.fetch(`${this.url}/${endpoint}`, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Relay error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    return (await response.json()) as IRelayResponse;
  }

  async get(
    endpoint: string,
    headers: Record<string, string> = {}
  ): Promise<IRelayResponse> {
    endpoint = endpoint.replace(/^\//, "");

    const response = await this.fetch(`${this.url}/${endpoint}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Relay error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    return (await response.json()) as IRelayResponse;
  }

  async send(message: Message): Promise<Message> {
    if (!message.isSigned()) {
      throw new Error("Message must be signed before sending");
    }

    // Relay service will verify anchor independently by checking:
    // 1. Message hash is anchored on-chain
    // 2. Sender address matches the signature
    const relayMessage: IRelayMessage = {
      message: message.toJSON(),
    };

    const response = await this.post("/messages", relayMessage);
    return Message.from(response.message);
  }

  async getMessages(
    recipient: string,
    limit = DEFAULT_CONFIG.DEFAULT_MESSAGE_LIMIT,
    offset = DEFAULT_CONFIG.DEFAULT_MESSAGE_OFFSET
  ): Promise<Message[]> {
    const response = await this.get(
      `/messages/${recipient}?limit=${limit}&offset=${offset}`
    );
    return (response.messages || []).map((msg: IMessageJSON) =>
      Message.from(msg)
    );
  }

  async getMessage(id: string): Promise<Message> {
    const response = await this.get(`/messages/${id}`);
    return Message.from(response.message);
  }
}
