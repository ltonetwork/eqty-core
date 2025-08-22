import Binary from "../Binary";
export class EthersSigner {
    constructor(signer) {
        this.signer = signer;
    }
    async getAddress() {
        return await this.signer.getAddress();
    }
    async sign(data) {
        const message = new Binary(data).hex;
        const signature = await this.signer.signMessage(message);
        return Binary.fromHex(signature.slice(2)); // Remove '0x' prefix
    }
    async signMessage(message) {
        const messageStr = typeof message === "string" ? message : new Binary(message).toString();
        return await this.signer.signMessage(messageStr);
    }
}
//# sourceMappingURL=EthersSigner.js.map