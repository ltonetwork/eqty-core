"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthersSigner = void 0;
const Binary_1 = __importDefault(require("../Binary"));
class EthersSigner {
    constructor(signer) {
        this.signer = signer;
    }
    async getAddress() {
        return await this.signer.getAddress();
    }
    async sign(data) {
        const message = new Binary_1.default(data).hex;
        const signature = await this.signer.signMessage(message);
        return Binary_1.default.fromHex(signature.slice(2)); // Remove '0x' prefix
    }
    async signMessage(message) {
        const messageStr = typeof message === "string" ? message : new Binary_1.default(message).toString();
        return await this.signer.signMessage(messageStr);
    }
}
exports.EthersSigner = EthersSigner;
//# sourceMappingURL=EthersSigner.js.map