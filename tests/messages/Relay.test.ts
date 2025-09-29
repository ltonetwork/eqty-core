import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import Relay from "../../src/messages/Relay";
import Message from "../../src/messages/Message";
import Binary from "../../src/Binary";

const sampleJson = () => {
  const message = new Message("relay");
  message.to("0xRecipient");
  message.sender = "0xSender";
  message.timestamp = 1000;
  message.signature = Binary.fromInt32(1);
  return message.toJSON();
};

describe("Relay", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes relay URL", () => {
    const relay = new Relay("https://relay.example.com/");
    expect(relay.url).toBe("https://relay.example.com");
  });

  it("posts data and returns JSON response", async () => {
    const relay = new Relay("https://relay.example.com");
    const payload = { hello: "world" };
    const responseBody = { message: sampleJson() };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseBody),
    });

    const result = await relay.post("/messages", payload, { Authorization: "token" });

    expect(fetch).toHaveBeenCalledWith("https://relay.example.com/messages", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "token" },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(responseBody);
  });

  it("sends string payloads without re-stringifying", async () => {
    const relay = new Relay("https://relay.example.com");
    const payload = JSON.stringify({ raw: true });

    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: sampleJson() }),
    });

    await relay.post("messages", payload);

    expect(fetch).toHaveBeenCalledWith("https://relay.example.com/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });
  });

  it("throws detailed errors on failed POST", async () => {
    const relay = new Relay("https://relay.example.com");

    (fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: "invalid" }),
    });

    await expect(relay.post("messages", {})).rejects.toThrow(
      'Relay error: 400 - {"error":"invalid"}'
    );
  });

  it("throws with fallback error payload when response JSON fails", async () => {
    const relay = new Relay("https://relay.example.com");

    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("boom")),
    });

    await expect(relay.get("messages"))
      .rejects.toThrow('Relay error: 500 - {}');
  });

  it("performs GET requests and returns JSON", async () => {
    const relay = new Relay("https://relay.example.com");
    const responseBody = { message: sampleJson() };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseBody),
    });

    const result = await relay.get("/messages/123", { Accept: "application/json" });

    expect(fetch).toHaveBeenCalledWith("https://relay.example.com/messages/123", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    expect(result).toEqual(responseBody);
  });

  it("requires messages to be signed before sending", async () => {
    const relay = new Relay("https://relay.example.com");
    const message = new Message("unsigned");

    await expect(relay.send(message)).rejects.toThrow(
      "Message must be signed before sending"
    );
  });

  it("sends signed messages and parses response", async () => {
    const relay = new Relay("https://relay.example.com");
    const message = new Message("signed");
    message.to("0xRecipient");
    message.sender = "0xSender";
    message.timestamp = Date.now();
    message.signature = Binary.fromInt32(1);

    const responseJson = sampleJson();

    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: responseJson }),
    });

    const result = await relay.send(message);

    expect(fetch).toHaveBeenCalledWith("https://relay.example.com/messages", expect.any(Object));
    expect(result).toBeInstanceOf(Message);
    expect(result.meta.type).toBe(responseJson.meta.type);
  });

  it("retrieves message lists", async () => {
    const relay = new Relay("https://relay.example.com");
    const messages = [sampleJson(), sampleJson()];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ messages }),
    });

    const result = await relay.getMessages("0xRecipient", 5, 1);

    expect(fetch).toHaveBeenCalledWith(
      "https://relay.example.com/messages/0xRecipient?limit=5&offset=1",
      {
        method: "GET",
        headers: {},
      }
    );
    expect(result).toHaveLength(messages.length);
    expect(result[0]).toBeInstanceOf(Message);
  });

  it("retrieves a single message", async () => {
    const relay = new Relay("https://relay.example.com");
    const messageJson = sampleJson();

    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: messageJson }),
    });

    const result = await relay.getMessage("123");

    expect(fetch).toHaveBeenCalledWith("https://relay.example.com/messages/123", {
      method: "GET",
      headers: {},
    });
    expect(result).toBeInstanceOf(Message);
  });
});
