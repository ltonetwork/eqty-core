import { Contract, Signer } from "ethers";
import Binary from "../Binary";
import { AnchorResult } from "../types/anchor";
export default class AnchorClient {
    private contract;
    private signer;
    constructor(contractAddress: string, signer: Signer);
    anchor(key: Binary, value: Binary): Promise<AnchorResult>;
    anchorMultiple(anchors: Array<{
        key: Binary;
        value: Binary;
    }>): Promise<AnchorResult[]>;
    anchorEventChain(chainId: string, stateHash: Binary): Promise<AnchorResult>;
    anchorMessage(messageHash: Binary): Promise<AnchorResult>;
    anchorMany(anchors: Array<{
        key: Binary;
        value: Binary;
    }>): Promise<AnchorResult[]>;
    getContract(): Contract;
    getContractAddress(): string;
    getSignerAddress(): Promise<string>;
}
//# sourceMappingURL=AnchorClient.d.ts.map