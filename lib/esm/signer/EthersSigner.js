import Binary from "../Binary";
import { HEX_PREFIX_LENGTH } from "../constants";
export class EthersSigner {
    constructor(signer) {
        this.signer = signer;
    }
    async getAddress() {
        return await this.signer.getAddress();
    }
    async sign(data) {
        // Sign the raw data directly using signMessage
        // This will add the Ethereum message prefix and hash it properly
        const signature = await this.signer.signMessage(data);
        return Binary.fromHex(signature.slice(HEX_PREFIX_LENGTH)); // Remove '0x' prefix
    }
    async signMessage(message) {
        const messageStr = typeof message === "string" ? message : new Binary(message).toString();
        return await this.signer.signMessage(messageStr);
    }
}
//# sourceMappingURL=EthersSigner.js.map