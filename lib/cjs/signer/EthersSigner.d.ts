import { Signer } from "ethers";
import { ISigner } from "./ISigner";
export declare class EthersSigner implements ISigner {
    private signer;
    constructor(signer: Signer);
    getAddress(): Promise<string>;
    sign(data: Uint8Array): Promise<Uint8Array>;
    signMessage(message: string | Uint8Array): Promise<string>;
}
//# sourceMappingURL=EthersSigner.d.ts.map